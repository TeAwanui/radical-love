// ── PUSH SUBSCRIBE ──────────────────────────────────────────────────────────
// Stores push subscriptions in a JSON file via Vercel Blob (or fallback to local).
// Client sends the PushSubscription object after user grants permission.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SUBS_FILE = join(process.cwd(), 'data', 'push-subs.json');

function loadSubs() {
  try {
    if (existsSync(SUBS_FILE)) {
      return JSON.parse(readFileSync(SUBS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveSubs(subs) {
  writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  const subs = loadSubs();

  // Don't duplicate
  const exists = subs.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    saveSubs(subs);
  }

  res.json({ ok: true, total: subs.length });
}
