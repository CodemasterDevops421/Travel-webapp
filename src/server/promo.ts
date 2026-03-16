import 'server-only';

export type ActivePromoCode = {
  code: string;
  discount_percent: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
};

export async function getActivePromoCode(supabase: any, rawCode: string): Promise<ActivePromoCode | null> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  if (data.max_uses !== null && data.current_uses >= data.max_uses) {
    return null;
  }

  return data as ActivePromoCode;
}
