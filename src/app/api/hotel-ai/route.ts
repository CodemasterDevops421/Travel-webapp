import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { assertSameOrigin } from '@/server/csrf';
import { askHotelQuestionWithLiteApi, getHotelDetails } from '@/server/liteapi';
import { getClientIp } from '@/server/request';
import {
  answerHotelQuestion,
  buildHotelAiContextDigest,
  extractHotelAiContext
} from '@/server/hotel-ai-context';

const bodySchema = z.object({
  hotelId: z.string().trim().min(1),
  question: z.string().trim().min(3).max(300),
  allowWebSearch: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const clientIp = getClientIp(request);
    await assertRateLimit(`hotel-ai:${clientIp}`);

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const liteApiAnswer = await askHotelQuestionWithLiteApi(
      parsed.data.hotelId,
      parsed.data.question,
      parsed.data.allowWebSearch ?? false
    );

    const hotel = await getHotelDetails(parsed.data.hotelId);
    const context = extractHotelAiContext(hotel);
    const response = liteApiAnswer
      ? {
          answer: liteApiAnswer,
          grounded: true as const,
          source: 'liteapi-hotel-ask' as const,
          safety: 'booking-safe' as const
        }
      : answerHotelQuestion(parsed.data.question, context);
    const contextDigest = buildHotelAiContextDigest(context);

    return NextResponse.json(
      {
        ...response,
        contextDigest
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Unable to process your question right now.' }, { status: 500 });
  }
}
