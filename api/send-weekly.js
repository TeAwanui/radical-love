// ── WEEKLY DIGEST EMAIL ──────────────────────────────────────────────────────
// Sends a weekly civic digest to all Radical Love subscribers.
// Triggered by Vercel cron (Sunday 6am NZST) or manual GET with secret.
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const secret = req.query.secret || req.headers['x-cron-secret'];
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no secret needed) or manual with secret
  if (cronSecret && secret !== cronSecret && !req.headers['x-vercel-cron']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  try {
    // Get audience
    let audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      const r = await fetch('https://api.resend.com/audiences', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const data = await r.json();
      const audiences = data.data || data.audiences || [];
      if (!audiences.length) return res.status(500).json({ error: 'No audience found' });
      audienceId = audiences[0].id;
    }

    // Get contacts
    const contactsRes = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const contactsData = await contactsRes.json();
    const contacts = (contactsData.data || []).filter(c => !c.unsubscribed);

    if (!contacts.length) return res.json({ sent: 0, message: 'No active subscribers' });

    // Build email content
    const now = new Date();
    const weekNum = getISOWeek(now);
    const fromAddr = process.env.RESEND_FROM || 'Radical Love <digest@radicallove.nz>';

    let sent = 0;
    for (const contact of contacts) {
      const name = contact.first_name || 'e hoa';

      const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ECEAE4;font-family:Roboto,Arial,sans-serif;">
<div style="max-width:480px;margin:0 auto;background:#111;padding:24px 20px;">
  <div style="font-size:16px;font-weight:500;color:#fff;letter-spacing:2.5px;text-transform:uppercase;">RADICAL LOVE</div>
  <div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:2px;">Weekly Civic Digest — Week ${weekNum}</div>
</div>
<div style="max-width:480px;margin:0 auto;background:#ECEAE4;padding:20px;">
  <p style="font-size:14px;color:#111;line-height:1.7;">Kia ora ${name},</p>
  <p style="font-size:13px;color:#444;line-height:1.75;">Here's your weekly civic digest. Stay informed. Stay connected. Stay radical.</p>
  <p style="font-size:13px;color:#444;line-height:1.75;">Open the app for the full daily feed, conversation toolkit, and shareable cards.</p>
  <div style="margin:16px 0;padding:16px;background:#111;color:#fff;">
    <div style="font-size:9px;font-weight:600;letter-spacing:2.5px;color:rgba(255,255,255,.45);text-transform:uppercase;margin-bottom:8px;">Aroha nui</div>
    <div style="font-size:13px;font-weight:400;line-height:1.75;">The Radical Love team</div>
  </div>
</div>
</body></html>`;

      try {
        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: contact.email,
            subject: `Week ${weekNum} — Your Civic Digest`,
            html,
          }),
        });
        if (sendRes.ok) sent++;
      } catch (err) {
        console.error(`Failed to send to ${contact.email}:`, err.message);
      }
    }

    res.json({ sent, total: contacts.length });
  } catch (err) {
    console.error('send-weekly error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
