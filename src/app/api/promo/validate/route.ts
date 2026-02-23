import { createServerSupabaseClient } from '@/server/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin } from '@/server/csrf';
import { assertRateLimit } from '@/server/ratelimit';
import { getClientIp, sanitizeRecord } from '@/server/request';

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
        await assertRateLimit(`promo-validate:${getClientIp(request)}`);
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

        const normalizedCode = code.trim().toUpperCase();

        const { data: promo, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('is_active', true)
            .single();

        if (error || !promo) {
            return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 404 });
        }

        // Check expiration
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return NextResponse.json({ error: 'This promo code has expired' }, { status: 410 });
        }

        // Check usage limits
        if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
            return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 410 });
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
