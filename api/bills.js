// ── BILLS + BEEHIVE RSS ──────────────────────────────────────────────────────
// Fetches government releases from Beehive RSS and merges with curated bill data.
// Called by: client on tab load + daily cron
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { join } from 'path';

function parseRSS(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    items.push({
      title: extractTag(b, 'title'),
      link: extractTag(b, 'link'),
      pubDate: extractTag(b, 'pubDate'),
      description: extractTag(b, 'description').replace(/<[^>]*>/g, '').slice(0, 200),
    });
  }
  return items;
}

function extractTag(xml, tag) {
  const m = xml.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([\\s\\S]*?)<\\/${tag}>`)
  );
  return m ? (m[1] || m[2] || '').trim() : '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let releases = [];

  try {
    const rssRes = await fetch('https://www.beehive.govt.nz/releases/feed', {
      headers: { 'User-Agent': 'RadicalLove/1.0 (civic education app)' },
      signal: AbortSignal.timeout(8000),
    });

    if (rssRes.ok) {
      const rssXml = await rssRes.text();
      releases = parseRSS(rssXml);
    }
  } catch (err) {
    console.error('Beehive RSS fetch failed:', err.message);
  }

  // Load curated bills
  let bills = [];
  try {
    const raw = readFileSync(join(process.cwd(), 'data', 'bills-cache.json'), 'utf-8');
    const data = JSON.parse(raw);
    bills = data.bills || [];
  } catch {
    // No cache file yet — that's fine for MVP
  }

  res.json({
    bills,
    releases,
    updated: new Date().toISOString(),
  });
}
