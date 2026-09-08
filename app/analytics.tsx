"use client";

import { useEffect, useState } from "react";
import { readConsent, saveConsent, subscribeConsent, OPEN_CONSENT, CONSENT_COPY, type ConsentChoice } from "./shared-analytics-consent";
import { startAnalytics, trackAnalytics } from "./shared-analytics-client";

export function captureAnalytics(eventName: string, properties: Record<string, unknown> = {}) {
  trackAnalytics("saddle_signals", eventName, properties);
}

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    const update = () => {
      setChoice(readConsent()); setReady(true);
      void startAnalytics("saddle_signals", "saddle_signals_viewed");
    };
    const open = () => setReviewing(true);
    update();
    const unsubscribe = subscribeConsent(update);
    window.addEventListener(OPEN_CONSENT, open);
    return () => { unsubscribe(); window.removeEventListener(OPEN_CONSENT, open); };
  }, []);
  function choose(next: Exclude<ConsentChoice, null>) {
    saveConsent(next); setChoice(next); setReviewing(false);
  }
  return <>
    <button className="analytics-preferences" type="button" onClick={() => setReviewing(true)}>Analytics preferences</button>
    {ready && (!choice || reviewing) && <section className="analytics-consent" role="dialog" aria-label="Optional analytics consent" aria-live="polite">
      <p><strong>Optional analytics</strong>{CONSENT_COPY}</p>
      <div className="analytics-consent-actions">
        <button className="primary" type="button" onClick={() => choose("accepted")}>Accept analytics</button>
        <button className="link-choice" type="button" onClick={() => choose("denied")}>Essential only</button>
      </div>
    </section>}
  </>;
}
