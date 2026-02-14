import 'server-only';

import { z } from 'zod';
import { HttpError } from '@/server/errors';
import { logger } from '@/server/logger';
import { env } from '@/server/env';

const conciergeMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(500)
});

export type ConciergeMessage = z.infer<typeof conciergeMessageSchema>;

const conciergeFiltersSchema = z
  .object({
    minStars: z.number().min(0).max(5).optional().nullable(),
    minGuestRating: z.number().min(0).max(10).optional().nullable(),
    maxPrice: z.number().min(50).max(5000).optional().nullable(),
    vibeTags: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
    searchHint: z.string().trim().min(3).max(240).optional()
  })
  .optional();

const conciergeResponseSchema = z.object({
  reply: z.string().trim().min(1).max(900),
  filters: conciergeFiltersSchema
});

export type ConciergeResponse = z.infer<typeof conciergeResponseSchema>;

export type ConciergeTripContext = {
  destination?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  rooms?: number;
  currency?: string;
  language?: string;
};

function clampNumber(value: number | null | undefined, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  const cleaned = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeFilters(filters: ConciergeResponse['filters']) {
  if (!filters) return undefined;
  return {
    minStars: clampNumber(filters.minStars ?? undefined, 0, 5),
    minGuestRating: clampNumber(filters.minGuestRating ?? undefined, 0, 10),
    maxPrice: clampNumber(filters.maxPrice ?? undefined, 50, 5000),
    vibeTags: normalizeTags(filters.vibeTags),
    searchHint: filters.searchHint?.trim()
  } satisfies ConciergeResponse['filters'];
}

function buildSystemPrompt(context?: ConciergeTripContext): string {
  const tripDetails = [
    context?.destination ? `Destination: ${context.destination}` : null,
    context?.checkin && context?.checkout ? `Dates: ${context.checkin} to ${context.checkout}` : null,
    typeof context?.adults === 'number' && typeof context?.rooms === 'number'
      ? `Guests: ${context.adults} adults, ${context.rooms} rooms`
      : null,
    context?.currency ? `Currency: ${context.currency}` : null,
    context?.language ? `Language: ${context.language}` : null
  ]
    .filter(Boolean)
    .join(' | ');

  return [
    'You are a luxury travel concierge assisting with hotel search preferences.',
    'Respond ONLY with valid JSON.',
    'Use this JSON shape: {"reply": string, "filters": {"minStars"?: number, "minGuestRating"?: number, "maxPrice"?: number, "vibeTags"?: string[], "searchHint"?: string}}.',
    'Keep reply friendly, concise, and ask a follow-up question if preferences are missing.',
    'If you can infer filters, populate them. minStars 0-5, minGuestRating 0-10, maxPrice in destination currency.',
    'searchHint should be a short phrase of key preferences for search, no destination city name.',
    tripDetails ? `Trip context: ${tripDetails}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: Array<{ type: 'input_text'; text: string }>;
};

type OpenAIResponsePayload = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>; 
  }>;
  error?: { message?: string };
};

function buildMessages(messages: ConciergeMessage[]): OpenAIMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: [{ type: 'input_text', text: message.text }]
  }));
}

function extractOutputText(payload: OpenAIResponsePayload): string {
  const output = payload.output ?? [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join('').trim();
}

const FALLBACK_RESPONSE: ConciergeResponse = {
  reply:
    'I can help curate stays once preferences are saved. Tell me your vibe, budget range, and any must-have amenities.'
};

export async function runConciergeChat(params: {
  messages: ConciergeMessage[];
  trip?: ConciergeTripContext;
}): Promise<ConciergeResponse> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return FALLBACK_RESPONSE;
  }

  const parsedMessages = z.array(conciergeMessageSchema).min(1).max(20).safeParse(params.messages);
  if (!parsedMessages.success) {
    throw new HttpError(400, 'Invalid message payload.');
  }

  const model = env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const body = {
    model,
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: buildSystemPrompt(params.trip) }]
      },
      ...buildMessages(parsedMessages.data)
    ],
    text: {
      format: {
        type: 'json_object'
      }
    },
    max_output_tokens: 420,
    temperature: 0.5
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const bodyText = await response.text();
    logger.warn({ status: response.status, bodySample: bodyText.slice(0, 160) }, 'Concierge OpenAI request failed');
    throw new HttpError(502, 'Concierge is unavailable right now.');
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  const outputText = extractOutputText(payload);
  if (!outputText) {
    logger.warn({ payload }, 'Concierge OpenAI response missing output text');
    return FALLBACK_RESPONSE;
  }

  try {
    const parsedJson = JSON.parse(outputText) as unknown;
    const parsedResponse = conciergeResponseSchema.safeParse(parsedJson);
    if (!parsedResponse.success) {
      logger.warn({ issues: parsedResponse.error.issues }, 'Concierge response schema mismatch');
      return FALLBACK_RESPONSE;
    }

    return {
      reply: parsedResponse.data.reply,
      filters: normalizeFilters(parsedResponse.data.filters)
    };
  } catch (error) {
    logger.warn({ error }, 'Concierge response parsing failed');
    return FALLBACK_RESPONSE;
  }
}
