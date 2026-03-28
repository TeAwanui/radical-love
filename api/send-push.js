// ── SEND DAILY PUSH ─────────────────────────────────────────────────────────
// Cron job: sends daily push notification to all subscribers.
// Runs at 7am NZT (19:00 UTC previous day) via vercel.json cron.
// ─────────────────────────────────────────────────────────────────────────────

import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUBS_FILE = join(process.cwd(), 'data', 'push-subs.json');

const DAILY_MESSAGES = [
  { title: 'Your daily question is ready', body: 'Kia ora \u2014 how does your card look today? One question, one minute.' },
  { title: 'Quick question for you', body: 'Your Pulse card is waiting. Tap to answer today\u2019s question.' },
  { title: 'Time to check your Pulse', body: 'One question a day keeps the politicians accountable.' },
  { title: 'New question dropped', body: 'Your political profile evolves daily. Ready?' },
  { title: 'Kia ora \u2014 Pulse time', body: 'Does your party still match your values? Let\u2019s find out.' },
  { title: 'Your card is evolving', body: 'Answer today\u2019s question and watch your alignment shift.' },
  { title: 'Radical Love \u2764\uFE0F', body: 'Your daily civic check-in is ready. Takes 30 seconds.' },
];

export default async function handler(req, res) {
  // Allow Vercel cron or manual trigger with secret
  const secret = req.query.secret || req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && !req.headers['x-vercel-cron']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  webpush.setVapidDetails('mailto:radicallovenz@proton.me', publicKey, privateKey);

  // Load subscriptions
  let subs = [];
  try {
    if (existsSync(SUBS_FILE)) {
      subs = JSON.parse(readFileSync(SUBS_FILE, 'utf-8'));
    }
  } catch {}

  if (!subs.length) {
    return res.json({ sent: 0, message: 'No subscribers' });
  }

  // Pick today's message
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const msg = DAILY_MESSAGES[dayOfYear % DAILY_MESSAGES.length];

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: '/' },
  });

  let sent = 0;
  let failed = 0;
  const validSubs = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      validSubs.push(sub);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired or invalid — remove it
        failed++;
      } else {
        validSubs.push(sub); // Keep for retry
        failed++;
      }
    }
  }

  // Clean up invalid subs
  if (validSubs.length !== subs.length) {
    writeFileSync(SUBS_FILE, JSON.stringify(validSubs, null, 2));
  }

  res.json({ sent, failed, total: validSubs.length });
}
