import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getHotelDetails } from '@/server/liteapi';
import { getClientIp } from '@/server/request';
import { answerHotelQuestion, extractHotelAiContext } from '@/server/hotel-ai-context';

const bodySchema = z.object({
  hotelId: z.string().trim().min(1),
  question: z.string().trim().min(3).max(300)
});

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit(`hotel-ai:${clientIp}`);

    const json = (await request.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const hotel = await getHotelDetails(parsed.data.hotelId);
    const context = extractHotelAiContext(hotel);
    const response = answerHotelQuestion(parsed.data.question, context);
    return NextResponse.json(response, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Unable to process your question right now.' }, { status: 500 });
  }
}
