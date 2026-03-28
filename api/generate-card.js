// ── IMAGE CARD GENERATOR ─────────────────────────────────────────────────────
// Returns a 1080x1080 PNG card for social sharing.
// Uses @vercel/og (Satori) for server-side rendering on Vercel.
// Fallback: returns a redirect to the app (client generates via canvas).
// ─────────────────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

import { ImageResponse } from '@vercel/og';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'quote';
  const id = searchParams.get('id') || '0';

  let title = '';
  let body = '';
  let source = '';
  let accent = '#8B1A1A';

  // We inline minimal content data here for edge runtime
  // Full data lives in the client — this covers the common card types
  if (type === 'quote') {
    title = 'KŌRERO O TE RĀ';
    body = 'Download from the app to share this quote.';
    source = 'radicallove.nz';
  } else if (type === 'talking-point') {
    title = 'CONVERSATION TOOLKIT';
    body = id.replace(/-/g, ' ').toUpperCase();
    source = 'radicallove.nz · Data-driven responses';
  } else if (type === 'bill') {
    title = 'BILL ALERT';
    body = id.replace(/-/g, ' ').toUpperCase();
    source = 'radicallove.nz · Track what Parliament is doing';
    accent = '#C77737';
  } else if (type === 'tiriti') {
    title = 'TE TIRITI O WAITANGI';
    body = 'Know Your Rights';
    source = 'radicallove.nz';
    accent = '#1B4332';
  } else if (type === 'party') {
    title = 'PARTY SCORECARD';
    body = id.replace(/-/g, ' ').toUpperCase();
    source = 'radicallove.nz · Follow the votes, follow the money';
  }

  return new ImageResponse(
    (
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            width: '1080px',
            height: '1080px',
            backgroundColor: '#111',
            padding: '60px',
            fontFamily: 'sans-serif',
          },
          children: [
            {
              type: 'div',
              props: {
                style: { color: accent, fontSize: '24px', fontWeight: 600, letterSpacing: '4px', marginBottom: '16px' },
                children: 'RADICAL LOVE',
              },
            },
            {
              type: 'div',
              props: {
                style: { width: '100%', height: '1px', backgroundColor: '#333', marginBottom: '40px' },
              },
            },
            {
              type: 'div',
              props: {
                style: { color: accent, fontSize: '18px', fontWeight: 600, letterSpacing: '3px', marginBottom: '24px' },
                children: title,
              },
            },
            {
              type: 'div',
              props: {
                style: { color: '#fff', fontSize: '48px', fontWeight: 300, lineHeight: 1.3, flex: 1 },
                children: body,
              },
            },
            {
              type: 'div',
              props: {
                style: { color: 'rgba(255,255,255,0.5)', fontSize: '18px', fontWeight: 300 },
                children: source,
              },
            },
          ],
        },
      }
    ),
    { width: 1080, height: 1080 }
  );
}
