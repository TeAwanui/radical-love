// ── EMAIL SIGNUP ─────────────────────────────────────────────────────────────
// Adds a subscriber to the Resend Audience (Radical Love — separate audience).
// Requires env vars: RESEND_API_KEY, optionally RESEND_AUDIENCE_ID
// ─────────────────────────────────────────────────────────────────────────────

async function getAudienceId(apiKey) {
  if (process.env.RESEND_AUDIENCE_ID) return process.env.RESEND_AUDIENCE_ID;

  const r = await fetch('https://api.resend.com/audiences', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!r.ok) throw new Error(`Could not fetch audiences: ${r.status}`);
  const data = await r.json();
  const audiences = data.data || data.audiences || [];
  if (!audiences.length) throw new Error('No Resend audience found');
  return audiences[0].id;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const audienceId = await getAudienceId(apiKey);

    const r = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email:        email.trim().toLowerCase(),
        first_name:   name ? name.trim() : '',
        unsubscribed: false,
      }),
    });

    if (r.status === 409) return res.json({ ok: true, existing: true });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Resend ${r.status}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('subscribe error:', err.message);
    res.status(500).json({ error: 'Could not subscribe. Please try again.' });
  }
}
