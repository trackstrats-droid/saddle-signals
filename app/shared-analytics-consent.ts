// Shared consent contract v1; only LEGACY_CONSENT_KEY differs between tools.
export const LEGACY_CONSENT_KEY = 'trackstrats_analytics_consent';
export const LEGACY_RETIRED_KEY = 'trackstrats_analytics_legacy_retired_v1';
// Rolling persistent lifetime; browsers can cap or clear cookies.
const PERSISTENT_AGE = 34560000;
let maintained = false;
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

function cookieValues(key: string) {
  try { return document.cookie.split(';').map(part => part.trim()).filter(part => part.startsWith(key + '=')).map(part => part.slice(key.length + 1)); }
  catch { return []; }
}
function persistCookie(key: string, value: string) {
  document.cookie = key + '=' + value + '; Domain=trackstrats.com; Path=/; SameSite=Lax; Secure; Max-Age=' + PERSISTENT_AGE;
}
function retireLegacy() {
  // This records migration, not refusal: it never suppresses a new-session prompt.
  // It prevents a superseded local acceptance returning when a denial cookie ends.
  try { window.localStorage.setItem(LEGACY_RETIRED_KEY, '1'); } catch { /* Storage may be blocked. */ }
  if (usesSharedCookie()) {
    try { persistCookie(LEGACY_RETIRED_KEY, '1'); } catch { /* Keep the local marker. */ }
  }
}
function legacyConsent(): ConsentChoice {
  try {
    if (window.localStorage.getItem(LEGACY_RETIRED_KEY) === '1') return null;
    if (usesSharedCookie() && cookieValues(LEGACY_RETIRED_KEY).length) {
      // Remember retirement locally too, so expired/cleared cookies cannot restore it.
      window.localStorage.setItem(LEGACY_RETIRED_KEY, '1');
      return null;
    }
    const session = window.sessionStorage.getItem(LEGACY_CONSENT_KEY);
    if (session === 'denied' || session === 'essential') return 'denied';
    // A legacy acceptance is honoured only here. Never copy it to a shared cookie.
    return window.localStorage.getItem(LEGACY_CONSENT_KEY) === 'accepted' ? 'accepted' : null;
  } catch { return null; }
}

function storedConsent(): ConsentChoice {
  try {
    if (usesSharedCookie()) {
      const values = cookieValues(CONSENT_KEY);
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
  if (stored !== null) {
    if (!maintained) {
      maintained = true;
      retireLegacy();
      if (stored === 'accepted' && usesSharedCookie()) {
        try { persistCookie(CONSENT_KEY, 'accepted'); } catch { /* Existing choice still applies. */ }
      }
    }
    return stored;
  }
  if (usesSharedCookie() && cookieValues(CONSENT_KEY).length) return null;
  return legacyConsent();
}
export function hasAnalyticsConsent() {
  return typeof window !== 'undefined' && readConsent() === 'accepted' && window.navigator.doNotTrack !== '1';
}
export function saveConsent(choice: Exclude<ConsentChoice, null>) {
  if (typeof window === 'undefined') return;
  retireLegacy();
  maintained = false;
  if (usesSharedCookie()) {
    try {
      // Clear a possible host-only shadow, then replace the shared cookie.
      document.cookie = CONSENT_KEY + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
      document.cookie = CONSENT_KEY + '=' + choice + '; Domain=trackstrats.com; Path=/; SameSite=Lax; Secure' + (choice === 'accepted' ? '; Max-Age=' + PERSISTENT_AGE : '');
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
