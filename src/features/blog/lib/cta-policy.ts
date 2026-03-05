import 'server-only';

export type CtaVariant = 'control' | 'variant_a' | 'variant_b';
export type CtaIntent = 'book_now' | 'explore_hotels' | 'discover_destination';

type CtaPolicyInput = {
  slug: string;
  category: string;
  position: number;
};

type CtaPolicyResult = {
  variant: CtaVariant;
  intent: CtaIntent;
  targetPath: string;
  matrixKey: string;
};

function hashKey(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

function getIntentByCategory(category: string): CtaIntent {
  const normalized = normalizeCategory(category);
  if (normalized.includes('booking')) return 'book_now';
  if (normalized.includes('itinerar')) return 'discover_destination';
  return 'explore_hotels';
}

function getTargetPath(intent: CtaIntent): string {
  switch (intent) {
    case 'book_now':
      return '/search?query=book-now';
    case 'discover_destination':
      return '/stays/tokyo';
    case 'explore_hotels':
    default:
      return '/hotels';
  }
}

function pickVariant(seed: string): CtaVariant {
  const index = hashKey(seed) % 3;
  if (index === 0) return 'control';
  if (index === 1) return 'variant_a';
  return 'variant_b';
}

export function resolveCtaPolicy(input: CtaPolicyInput): CtaPolicyResult {
  const intent = getIntentByCategory(input.category);
  const variant = pickVariant(`${input.slug}:${input.position}:${intent}`);
  return {
    variant,
    intent,
    targetPath: getTargetPath(intent),
    matrixKey: `${intent}:${variant}`
  };
}
