import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertRateLimit } from '@/server/ratelimit';
import { getHotelDetails } from '@/server/liteapi';
import { getClientIp } from '@/server/request';

const bodySchema = z.object({
  hotelId: z.string().trim().min(1),
  question: z.string().trim().min(3).max(300)
});

function answerFromHotelData(
  question: string,
  hotel: Awaited<ReturnType<typeof getHotelDetails>>
): string {
  if (!hotel) {
    return 'I could not load this property details right now. Please try again in a moment.';
  }

  const q = question.toLowerCase();
  const facilities = hotel.facilities ?? [];
  const hasParking = facilities.some((item) => /parking|self parking|valet/i.test(item));
  const hasBreakfast = facilities.some((item) => /breakfast/i.test(item));

  if (q.includes('parking')) {
    return hasParking
      ? 'Parking appears to be available according to the listed facilities. Please check final room terms before booking.'
      : 'I do not see parking explicitly listed in the available facilities for this property.';
  }
  if (q.includes('breakfast')) {
    return hasBreakfast
      ? 'Breakfast-related options are listed. Availability depends on the room-rate plan you select.'
      : 'Breakfast is not clearly listed in property facilities. Check the board type on your selected room.';
  }
  if (q.includes('check in') || q.includes('check-in') || q.includes('checkout') || q.includes('check out')) {
    return 'Check-in/check-out timings are not explicitly available in this dataset. Confirm timings in final booking terms before payment.';
  }
  if (q.includes('location') || q.includes('near')) {
    return `${hotel.name} is located in ${hotel.city}${hotel.countryCode ? `, ${hotel.countryCode}` : ''}.`;
  }

  return hotel.description
    ? `Here is what I found: ${hotel.description.slice(0, 320)}${hotel.description.length > 320 ? '...' : ''}`
    : 'I found basic hotel data, but not enough detail to answer precisely. Please review facilities and room policies below.';
}

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
    const answer = answerFromHotelData(parsed.data.question, hotel);
    return NextResponse.json({ answer }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Unable to process your question right now.' }, { status: 500 });
  }
}
