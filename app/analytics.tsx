"use client";

import { useEffect, useState } from "react";

const POSTHOG_KEY = "phc_v2PZP8GQF75fJjZKvNKdkzSWvMs6idWBUGfFmsgohGLb";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const CONSENT_KEY = "trackstrats_analytics_consent";

type Consent = "accepted" | "essential" | null;
type PostHog = {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  opt_in_capturing: () => void;
  opt_out_capturing: (options?: Record<string, unknown>) => void;
};

declare global { interface Window { posthog?: PostHog; } }

export function captureAnalytics(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || window.localStorage.getItem(CONSENT_KEY) !== "accepted") return;
  window.posthog?.capture(event, { tool: "saddle_signals", ...properties });
}

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY) as Consent;
    setConsent(saved === "accepted" || saved === "essential" ? saved : null);

    const initialise = () => {
      if (!window.posthog || ready) return;
      window.posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        defaults: "2026-05-30",
        person_profiles: "identified_only",
        opt_out_capturing_by_default: true,
        opt_out_persistence_by_default: true,
        respect_dnt: true,
        capture_pageview: false,
      });
      if (saved === "accepted") {
        window.posthog.opt_in_capturing();
        window.posthog.capture("saddle_signals_viewed", { tool: "saddle_signals" });
      }
      setReady(true);
    };

    if (window.posthog) initialise();
    else {
      const script = document.createElement("script");
      script.src = "https://eu-assets.i.posthog.com/static/array.js";
      script.async = true;
      script.onload = initialise;
      script.dataset.posthog = "saddle-signals";
      document.head.appendChild(script);
    }
  }, []);

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    window.posthog?.opt_in_capturing();
    window.posthog?.capture("analytics_consent_accepted", { tool: "saddle_signals" });
    window.posthog?.capture("saddle_signals_viewed", { tool: "saddle_signals" });
    setConsent("accepted");
  };

  const essentialOnly = () => {
    window.localStorage.setItem(CONSENT_KEY, "essential");
    window.posthog?.opt_out_capturing({ clear_persistence: true });
    setConsent("essential");
  };

  if (consent !== null) return null;
  return <section className="analytics-consent" role="dialog" aria-label="Optional analytics consent" aria-live="polite">
    <p><strong>Optional analytics</strong>We use analytics to understand how people use this tool and improve it. No betting activity or payment details are tracked.</p>
    <div className="analytics-consent-actions">
      <button className="primary" type="button" onClick={accept} disabled={!ready}>Accept analytics</button>
      <button className="link-choice" type="button" onClick={essentialOnly}>Essential only</button>
    </div>
  </section>;
}
