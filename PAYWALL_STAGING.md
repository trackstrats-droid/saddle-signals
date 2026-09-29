# Paywall staging preparation

Branch: paywall-staging. Do not merge or deploy to production.

The racing-data endpoint checks the encrypted staging identity against the dashboard /api/access endpoint before reading cached or upstream data. It requires a fresh subscriber decision and fails closed on connection failures. No paid API responses may use shared public caching in staging. Production behavior remains unchanged when APP_ENV is not staging.

Hosted setup still required: a separate Railway service in paywall-staging, APP_ENV=staging, a *.staging.trackstrats.com domain for the shared staging identity cookie, TOOLKIT_LOGIN_URL=https://login.staging.trackstrats.com, and fresh staging TOOLKIT_AUTH_SECRET reference where the existing session UI reads identity. Use central stored racing data; never copy live write-enabled database credentials. Protect/replace direct public data paths before production launch.

Pending before hosted readiness: branded membership/verification prompts, staging analytics suppression, isolated data configuration, startup isolation guard, domain/callback allowlists, hosted paid/unpaid and expired-session tests. Racecards is excluded from the paywall.

Staging startup is now paywall/staging-server.mjs. It refuses non-staging Railway environments and database/racing API credentials. It gates pages/assets/API before cached data, forwards only staging identity to central access/session, serves branded subscription prompts, and reads existing stored/public feeds (no collectors or database writes). Only APP_ENV=staging is required; no shared secret needed. Native frontend is loopback-only. Custom staging domain needed for shared cookie. Live public feeds remain free until separately authorised launch.
