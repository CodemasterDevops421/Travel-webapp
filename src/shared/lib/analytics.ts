type AnalyticsPrimitive = string | number | boolean | null;

export type FunnelEventName =
  | 'search_input_started'
  | 'autocomplete_suggestion_selected'
  | 'search_submitted'
  | 'preview_card_opened';

export type FunnelEvent = {
  name: FunnelEventName;
  step: 'discovery' | 'search' | 'consideration';
  properties?: Record<string, AnalyticsPrimitive>;
};

const CLIENT_EVENT_NAME = 'travelforge:funnel-event';
const DATA_LAYER_EVENT_NAME = 'travelforge_funnel';
const FUNNEL_API_ENDPOINT = '/api/analytics/funnel';

export function trackFunnelEvent(event: FunnelEvent): void {
  if (typeof window === 'undefined') return;

  const payload = {
    ...event,
    ts: Date.now()
  };

  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
  };
  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  analyticsWindow.dataLayer.push({
    event: DATA_LAYER_EVENT_NAME,
    ...payload
  });

  window.dispatchEvent(
    new CustomEvent(CLIENT_EVENT_NAME, {
      detail: payload
    })
  );

  const json = JSON.stringify(payload);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      const sent = navigator.sendBeacon(FUNNEL_API_ENDPOINT, blob);
      if (sent) {
        return;
      }
    }
  } catch {
    // noop
  }

  void fetch(FUNNEL_API_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: json,
    keepalive: true
  }).catch(() => undefined);
}
