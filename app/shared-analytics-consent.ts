// Shared consent contract v1. Keep identical in all Track Strats tools.
export type ConsentChoice = 'accepted' | 'denied' | null;
export const CONSENT_KEY = 'trackstrats_collection_analytics_v1';
export const CONSENT_CHANGED = 'trackstrats-analytics-consent-changed';
export const OPEN_CONSENT = 'trackstrats-open-analytics-consent';
export const CONSENT_COPY = 'We use optional analytics across Track Strats webtools to understand usage and improve them. Your choice applies to all our tools on trackstrats.com. Advertising is a separate choice. No betting activity or payment details are tracked.';
let memoryChoice: ConsentChoice = null;
let memoryBaseline: ConsentChoice = null;

export function usesSharedCookie() {
  if (typeof window === 'undefined') return false;
  const { hostname, protocol } = window.location;
  return protocol === 'https:' && (hostname === 'trackstrats.com' || hostname.endsWith('.trackstrats.com'));
}
function storedConsent(): ConsentChoice {
  try {
    if (usesSharedCookie()) {
      const values = document.cookie.split(';').map(part => part.trim()).filter(part => part.startsWith(CONSENT_KEY + '=')).map(part => part.slice(CONSENT_KEY.length + 1));
      // Conflicting/malformed cookies must never enable analytics.
      if (values.includes('denied')) return 'denied';
      return values.length === 1 && values[0] === 'accepted' ? 'accepted' : null;
    }
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === 'accepted') return 'accepted';
    if (saved !== null) window.localStorage.removeItem(CONSENT_KEY);
    return window.sessionStorage.getItem(CONSENT_KEY) === 'denied' ? 'denied' : null;
  } catch { return null; }
}
export function readConsent(): ConsentChoice {
  if (typeof window === 'undefined') return null;
  const stored = storedConsent();
  // Honour a choice even if writing cookies was blocked. A later shared change wins.
  if (memoryChoice !== null && stored === memoryBaseline) return memoryChoice;
  memoryChoice = null;
  return stored;
}
export function hasAnalyticsConsent() {
  return typeof window !== 'undefined' && readConsent() === 'accepted' && window.navigator.doNotTrack !== '1';
}
export function saveConsent(choice: Exclude<ConsentChoice, null>) {
  if (typeof window === 'undefined') return;
  if (usesSharedCookie()) {
    try {
      // Clear a possible host-only shadow, then replace the shared cookie.
      document.cookie = CONSENT_KEY + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
      document.cookie = CONSENT_KEY + '=' + choice + '; Domain=trackstrats.com; Path=/; SameSite=Lax; Secure' + (choice === 'accepted' ? '; Max-Age=31536000' : '');
    } catch { /* Fall back for this page only. */ }
  } else {
    try {
      if (choice === 'accepted') window.localStorage.setItem(CONSENT_KEY, choice);
      else window.localStorage.removeItem(CONSENT_KEY);
      if (choice === 'denied') window.sessionStorage.setItem(CONSENT_KEY, choice);
      else window.sessionStorage.removeItem(CONSENT_KEY);
    } catch { /* Fall back for this page only. */ }
  }
  memoryBaseline = storedConsent();
  memoryChoice = memoryBaseline === choice ? null : choice;
  window.dispatchEvent(new Event(CONSENT_CHANGED));
}
export function clearConsentMemory() { memoryChoice = null; }
export function subscribeConsent(callback: () => void) {
  let previous = readConsent();
  const check = () => {
    const next = readConsent();
    if (next !== previous) { previous = next; callback(); }
  };
  const localChange = () => { previous = readConsent(); callback(); };
  const storage = () => { clearConsentMemory(); check(); };
  // Cookie changes have no cross-origin storage event. Check on focus and cheaply
  // while visible; every event also checks consent synchronously before sending.
  const visibleCheck = () => { if (document.visibilityState !== 'hidden') check(); };
  window.addEventListener(CONSENT_CHANGED, localChange);
  window.addEventListener('storage', storage);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', visibleCheck);
  const timer = window.setInterval(visibleCheck, 2000);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener(CONSENT_CHANGED, localChange);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', check);
    document.removeEventListener('visibilitychange', visibleCheck);
  };
}
