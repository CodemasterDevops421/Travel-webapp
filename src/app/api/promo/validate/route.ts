import { createServerSupabaseClient } from '@/server/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { assertRateLimit, createRateLimitKey } from '@/server/ratelimit';
import { getClientIp, sanitizeRecord } from '@/server/request';
import { getActivePromoCode } from '@/server/promo';

const promoSchema = z.object({
    code: z.string().trim().min(1).max(50),
    quote: z.object({
        hotelId: z.string().trim().min(1),
        roomId: z.string().trim().min(1),
        baseAmount: z.number(),
        totalAmount: z.number(),
        currency: z.string().trim().length(3),
        signature: z.string().trim().min(16)
    }).optional(),
    quoteSignature: z.string().trim().min(16).optional()
});

export async function POST(request: Request) {
    try {
        assertSameOrigin(request);
        await assertRateLimit(createRateLimitKey('mutation', getClientIp(request), 'promo-validate'), 'mutation');
        const supabase = await createServerSupabaseClient();
        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = promoSchema.parse(sanitizeRecord(await request.json()));
        const { code, quote, quoteSignature } = body;

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
        }

        const promo = await getActivePromoCode(supabase, code);
        if (!promo) {
            return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 404 });
        }

        let newQuote = null;
        let newSignature = null;

        if (quote && quoteSignature) {
            // dynamic import to avoid issues in the edge / api route if not cleanly setup
            const { verifyPriceQuoteSignature, applyPromoDiscount } = await import('@/server/pricing');

            const isValid = verifyPriceQuoteSignature(quote);
            if (!isValid || quote.signature !== quoteSignature) {
                return NextResponse.json({ error: 'Invalid quote signature' }, { status: 400 });
            }

            const updated = applyPromoDiscount(quote, promo.discount_percent);
            newQuote = updated;
            newSignature = updated.signature;
        }

        return NextResponse.json({
            valid: true,
            code: promo.code,
            discountPercent: promo.discount_percent,
            newQuote,
            newSignature
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
