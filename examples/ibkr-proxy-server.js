// Last Updated: 2026-02-07
// Example IBKR proxy endpoint for Stock Stickies (placeholder implementation)
// DO NOT use in production without proper auth/session hardening.

import express from 'express';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8787;
const STOCK_STICKIES_PROXY_KEY = process.env.STOCK_STICKIES_PROXY_KEY || '';
const IBKR_BASE_URL = process.env.IBKR_BASE_URL || 'https://api.ibkr.com/v1/api';

function requireProxyKey(req, res, next) {
  if (!STOCK_STICKIES_PROXY_KEY) return next();
  const provided = req.header('x-api-key');
  if (!provided || provided !== STOCK_STICKIES_PROXY_KEY) {
    return res.status(401).json({ error: 'Unauthorized proxy key' });
  }
  return next();
}

// NOTE:
// In production, session token should be managed server-side (gateway login flow + /tickle refresh).
// This placeholder allows token pass-through for initial testing.
app.post('/api/ibkr/portfolio/positions', requireProxyKey, async (req, res) => {
  try {
    const { accountId, pageId = 0, ibkrSessionToken } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }

    if (!ibkrSessionToken) {
      return res.status(400).json({
        error: 'ibkrSessionToken is required for this placeholder server. Move this token management to backend before production.'
      });
    }

    const url = `${IBKR_BASE_URL}/portfolio/${encodeURIComponent(accountId)}/positions/${encodeURIComponent(pageId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `api=${ibkrSessionToken}`
      }
    });

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    return res.status(response.status).json(payload);
  } catch (err) {
    console.error('IBKR proxy error:', err);
    return res.status(500).json({ error: 'Proxy request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`IBKR proxy example listening on :${PORT}`);
});
