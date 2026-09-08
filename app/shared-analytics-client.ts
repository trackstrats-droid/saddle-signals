import { hasAnalyticsConsent } from './shared-analytics-consent';

type Client = {
  init: (key: string, options: Record<string, unknown>) => void;
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (id: string, properties?: Record<string, unknown>) => void;
  opt_in_capturing?: () => void;
  opt_out_capturing?: () => void;
};
const client = () => (window as unknown as { posthog?: Client }).posthog;
let loading: Promise<void> | undefined;
let initialised = false;
let viewSent = false;
export function stopAnalytics() { if (typeof window !== 'undefined') client()?.opt_out_capturing?.(); }
export async function startAnalytics(tool: string, viewEvent = tool + '_tool_viewed') {
  if (!hasAnalyticsConsent()) { stopAnalytics(); return; }
  if (!initialised) {
    loading ??= new Promise<void>((resolve) => {
      const initialise = () => {
        if (!hasAnalyticsConsent() || !client()?.init) { resolve(); return; }
        try {
          client()!.init('phc_v2PZP8GQF75fJjZKvNKdkzSWvMs6idWBUGfFmsgohGLb', {
            api_host: 'https://eu.i.posthog.com', defaults: '2026-05-30',
            person_profiles: 'identified_only', opt_out_capturing_by_default: true,
            opt_out_persistence_by_default: true, respect_dnt: true,
            // Preserve each existing tool's collection settings; only consent is shared.
            ...(tool === 'saddle_signals' ? { capture_pageview: false } : {}),
            before_send: (event: unknown) => hasAnalyticsConsent() ? event : null,
            loaded: () => { resolve(); },
          });
          initialised = true;
          resolve();
        } catch { resolve(); }
      };
      if (client()?.init) initialise();
      else {
        const script = document.createElement('script');
        script.src = 'https://eu-assets.i.posthog.com/static/array.js';
        script.async = true;
        script.onload = initialise;
        script.onerror = () => { script.remove(); resolve(); };
        document.head.appendChild(script);
      }
    }).catch(() => { /* Blocked analytics must not break a tool. */ }).finally(() => { loading = undefined; });
    await loading;
  }
  if (!hasAnalyticsConsent() || !initialised) { stopAnalytics(); return; }
  client()?.opt_in_capturing?.();
  if (!viewSent) {
    viewSent = true;
    trackAnalytics(tool, viewEvent, { path: window.location.pathname });
  }
}
export function trackAnalytics(tool: string, event: string, properties: Record<string, unknown> = {}) {
  if (!hasAnalyticsConsent()) return;
  client()?.capture?.(event, { ...properties, tool });
}
export function identifyAnalytics(tool: string, id: string, properties: Record<string, unknown> = {}) {
  if (!hasAnalyticsConsent()) return;
  client()?.identify?.(id, { ...properties, tool });
}
