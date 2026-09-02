# Saddle Signals

Saddle Signals is part of the Track Strats racing toolkit. It highlights potentially significant jockey changes, including leading riders taking over and claimers brought in to reduce weight.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The application reads its shared racing snapshot from `RACING_DATA_API_URL`. Copy `.env.example` to `.env.local` to override the default endpoint locally.

## Production

```bash
npm run build
npm start
```

PostHog analytics are disabled by default and begin only after a visitor explicitly accepts optional analytics.
