const PUBLISHOS = 'https://publishos-eosin.vercel.app';
const ORIGIN = 'https://www.saleshubcloud.com';
const BREVO = 'https://api.brevo.com/v3/smtp/email';

const ENQ_MID = { 'lt20': 15, '20-50': 35, '50-100': 75, '100+': 150 };
const ENQ_LABEL = { 'lt20': 'Under 20', '20-50': '20–50', '50-100': '50–100', '100+': '100+' };
const RESP_LEAK = { 'lt1hr': 0.03, 'sameday': 0.08, 'nextday': 0.18, '2plus': 0.32 };
const RESP_LABEL = { 'lt1hr': 'Under 1 hour', 'sameday': 'Same day', 'nextday': 'Next day', '2plus': '2+ days' };
const STORAGE_MULT = { 'spreadsheet': 1.3, 'outlook': 1.25, 'generic-crm': 1.05, 'legal-crm': 0.55 };
const STORAGE_LABEL = { 'spreadsheet': 'Spreadsheet', 'outlook': 'Outlook / inbox', 'generic-crm': 'Generic CRM', 'legal-crm': 'Dedicated legal CRM' };
const CONV_GAP = { 'untracked': 0.35, 'lt20': 0.25, '20-40': 0.15, '40plus': 0.05 };
const CONV_LABEL = { 'untracked': 'Don’t track', 'lt20': 'Under 20%', '20-40': '20–40%', '40plus': '40%+' };

const DEFAULT_MATTER = 1500; // £, UK avg matter value across mixed practice

function compute(enquiries, responseTime, storage, conversion, matter) {
  const e = ENQ_MID[enquiries];
  const r = RESP_LEAK[responseTime];
  const s = STORAGE_MULT[storage];
  const c = CONV_GAP[conversion];
  if (e == null || r == null || s == null || c == null) return null;
  const m = matter || DEFAULT_MATTER;
  const monthly = Math.round(e * m * r * s * c);
  return { monthly, annual: monthly * 12, enquiries: e, matterValue: m };
}

// ---- anti-spam helpers ----
const isVowel = (c) => 'aeiouAEIOU'.indexOf(c) !== -1;

// Flags single-token gibberish like "RpjibBXUnzZynrYp" / "GYCAltwaCYIOPjmbRq".
// Conservative on purpose: only judges spaceless tokens of 10+ letters and needs
// two of three signals (low vowel ratio, camelCase noise, long consonant run).
function looksRandom(raw) {
  const s = (raw || '').trim();
  if (!s || /\s/.test(s)) return false;             // real names/firms have spaces or are short
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 10) return false;

  let vowels = 0, run = 0, maxRun = 0;
  for (const ch of letters) {
    if (isVowel(ch)) { vowels++; run = 0; }
    else { run++; if (run > maxRun) maxRun = run; }
  }
  const vowelRatio = vowels / letters.length;

  let internalCaps = 0;                              // capitals mid-word (camelCase noise)
  for (let i = 1; i < s.length; i++) {
    if (/[A-Z]/.test(s[i]) && /[a-z]/.test(s[i - 1])) internalCaps++;
  }

  // 3+ mid-word capitals is a near-certain random-string signature on its own
  // (real names top out at one, e.g. "McDonald"); otherwise need two weaker signals.
  if (internalCaps >= 3) return true;
  const signals = (vowelRatio < 0.25 ? 1 : 0) + (internalCaps >= 2 ? 1 : 0) + (maxRun >= 5 ? 1 : 0);
  return signals >= 2;
}

// Best-effort in-memory rate limit, scoped to a warm Fluid Compute instance.
const RL_MAX = 5, RL_WINDOW = 10 * 60 * 1000;
const rlHits = new Map();
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const hits = (rlHits.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  hits.push(now);
  rlHits.set(ip, hits);
  if (rlHits.size > 5000) rlHits.clear();            // crude memory cap
  return hits.length > RL_MAX;
}

async function sendEmail(apiKey, from, fromName, to, subject, html) {
  return fetch(BREVO, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: fromName, email: from }, to: [{ email: to }], subject, htmlContent: html })
  });
}

function buildAuditEmail(opts) {
  const { firstName, firm, ref, monthly, annual, enquiries, responseTime, storage, conversion, matterValue } = opts;
  const fmtMonthly = '£' + monthly.toLocaleString('en-GB');
  const fmtAnnual = '£' + annual.toLocaleString('en-GB');
  const fmtMatter = '£' + matterValue.toLocaleString('en-GB');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#F7F5FB;font-family:Georgia,'Times New Roman',serif;color:#1A1428;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
<tr><td style="background:#fff;border:1px solid #E4DEF0;border-radius:14px 14px 0 0;padding:32px 36px;border-bottom:none;">
<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7C6FF7;font-family:Arial,sans-serif;font-weight:700;margin-bottom:14px;">SalesHub Cloud · Lead Leak Audit</div>
<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#1A1428;margin:0 0 6px;letter-spacing:-0.5px;">Your firm's lost billables</h1>
<div style="font-size:13px;color:#6B6082;font-family:Arial,sans-serif;">Ref ${ref} · prepared for ${firm || 'your firm'}</div>
</td></tr>
<tr><td style="background:#fff;border-left:1px solid #E4DEF0;border-right:1px solid #E4DEF0;padding:0 36px;">
<p style="font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3A3148;margin:0 0 20px;">Dear ${firstName || 'Partner'},</p>
<p style="font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3A3148;margin:0 0 28px;">Based on the four answers you provided, this is an estimate of the fee income your current lead-handling process is leaving on the table.</p>
</td></tr>
<tr><td style="background:#fff;border-left:1px solid #E4DEF0;border-right:1px solid #E4DEF0;padding:0 36px 4px;">
<table width="100%" style="background:#F7F5FB;border-radius:10px;border:1px solid #E4DEF0;">
<tr><td style="padding:24px 28px;">
<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#7C6FF7;font-weight:700;margin-bottom:8px;">Estimated annual lost fees</div>
<div style="font-family:Georgia,serif;font-size:40px;font-weight:700;color:#1A1428;letter-spacing:-1.2px;line-height:1;">${fmtAnnual}</div>
<div style="font-family:Arial,sans-serif;font-size:13px;color:#6B6082;margin-top:8px;">~${fmtMonthly}/month · based on ${enquiries} enquiries/mo at ${fmtMatter} avg matter value</div>
</td></tr>
</table>
</td></tr>
<tr><td style="background:#fff;border-left:1px solid #E4DEF0;border-right:1px solid #E4DEF0;padding:20px 36px 0;">
<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6B6082;font-weight:700;margin:24px 0 14px;">Methodology</div>
<table width="100%" style="font-family:Arial,sans-serif;font-size:13px;color:#3A3148;border-collapse:collapse;">
<tr><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;">Monthly inbound enquiries</td><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;text-align:right;font-weight:600;">${ENQ_LABEL[opts.enquiriesRaw] || enquiries}</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;">Average first-response time</td><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;text-align:right;font-weight:600;">${RESP_LABEL[responseTime] || responseTime}</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;">Where leads currently live</td><td style="padding:8px 0;border-bottom:1px solid #EDE6F7;text-align:right;font-weight:600;">${STORAGE_LABEL[storage] || storage}</td></tr>
<tr><td style="padding:8px 0;">Quote→instruction conversion</td><td style="padding:8px 0;text-align:right;font-weight:600;">${CONV_LABEL[conversion] || conversion}</td></tr>
</table>
<div style="font-family:Arial,sans-serif;font-size:11.5px;color:#8A7DA6;margin-top:14px;line-height:1.6;font-style:italic;">Figures derived from response-time × storage × conversion-gap coefficients calibrated against UK Law Society "Practice Management" benchmarks and the Bellwether Report on small-firm efficiency. £1,500 default matter value reflects mixed-practice averages.</div>
</td></tr>
<tr><td style="background:#fff;border-left:1px solid #E4DEF0;border-right:1px solid #E4DEF0;padding:30px 36px 8px;">
<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6B6082;font-weight:700;margin-bottom:12px;">What recovers it</div>
<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#3A3148;margin:0 0 14px;">Firms that move from manual lead handling to a dedicated legal CRM typically recover 60–80% of the figure above within the first quarter. The specific mechanisms:</p>
<ul style="font-family:Arial,sans-serif;font-size:13.5px;line-height:1.9;color:#3A3148;margin:0 0 22px;padding-left:20px;">
<li>Inbox-to-pipeline capture (every enquiry logged automatically)</li>
<li>Response-time SLA alerts (no enquiry sits unanswered beyond 1 hour)</li>
<li>Quote-to-instruction conversion tracking by fee-earner</li>
<li>Automated drip sequences after consultations and quote-outs</li>
</ul>
<p style="font-family:Arial,sans-serif;font-size:13.5px;line-height:1.7;color:#6B6082;margin:0 0 8px;">We'll send a short follow-up tomorrow with how SalesHub Cloud handles each of these specifically.</p>
</td></tr>
<tr><td style="background:#F7F5FB;border:1px solid #E4DEF0;border-top:none;border-radius:0 0 14px 14px;padding:22px 36px;">
<p style="font-family:Arial,sans-serif;font-size:11.5px;color:#8A7DA6;margin:0;line-height:1.65;">SalesHub Cloud is built and operated by Zayn Productions Ltd, registered in England &amp; Wales. This audit is an estimate, not financial advice.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildDay1Followup(firstName, firm, monthly) {
  const fmtMonthly = '£' + monthly.toLocaleString('en-GB');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#F7F5FB;font-family:Georgia,'Times New Roman',serif;color:#1A1428;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
<tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
<tr><td style="background:#fff;border:1px solid #E4DEF0;border-radius:14px;padding:32px 36px;">
<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7C6FF7;font-weight:700;margin-bottom:14px;">SalesHub Cloud · Follow-up</div>
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#1A1428;margin:0 0 18px;letter-spacing:-0.4px;">Recovering ${fmtMonthly} a month</h1>
<p style="font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3A3148;margin:0 0 18px;">Dear ${firstName || 'Partner'},</p>
<p style="font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3A3148;margin:0 0 20px;">Yesterday we sent over your Lead Leak Audit for ${firm || 'your firm'}. The headline figure was around <strong>${fmtMonthly} a month</strong> in lost fees.</p>
<p style="font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;color:#3A3148;margin:0 0 20px;">The fastest way to see what changes is to run your live pipeline through SalesHub Cloud for two weeks. The trial is free, no card required, and our team imports your existing leads on day one so you're seeing real data within hours.</p>
<table><tr><td style="background:#7C6FF7;border-radius:8px;">
<a href="https://www.saleshubcloud.com/trial.html?source=lead-leak-audit" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff;text-decoration:none;">Start your 14-day free trial →</a>
</td></tr></table>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#6B6082;margin:20px 0 0;line-height:1.7;">If you'd rather see it on a screen-share first, just reply to this email and we'll set up a 20-minute walkthrough.</p>
</td></tr>
<tr><td style="padding:22px 4px 0;">
<p style="font-family:Arial,sans-serif;font-size:11.5px;color:#8A7DA6;margin:0;line-height:1.65;text-align:center;">SalesHub Cloud · Zayn Productions Ltd · Co. No. 16892199</p>
</td></tr>
</table></td></tr>
</table></body></html>`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);

  const { email, name, firm, role, feeEarners, enquiries, responseTime, storage, conversion, matterValue, website, elapsedMs } = req.body || {};

  // Honeypot + suspiciously-fast submit: silently accept so the bot doesn't learn, but do nothing.
  if (website || (typeof elapsedMs === 'number' && elapsedMs < 2500)) {
    return res.status(200).json({ ok: true, ref: 'SHC-AUDIT-' + Date.now().toString(36).toUpperCase().slice(-6) });
  }

  // Best-effort rate limit per IP.
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  }

  if (!email || !enquiries || !responseTime || !storage || !conversion) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid work email.' });
  }
  if (looksRandom(name) || looksRandom(firm)) {
    return res.status(400).json({ error: 'Please enter your real name and firm.' });
  }

  const result = compute(enquiries, responseTime, storage, conversion, Number(matterValue) || null);
  if (!result) return res.status(400).json({ error: 'Invalid inputs' });

  const ref = 'SHC-AUDIT-' + Date.now().toString(36).toUpperCase().slice(-6);
  const firstName = (name || '').split(' ')[0] || '';
  console.log('Lead Leak Audit captured:', ref, { email, firm, enquiries, responseTime, storage, conversion, monthly: result.monthly });

  // PublishOS pipeline
  try {
    await fetch(PUBLISHOS + '/api/pipeline/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({
        name: name || '',
        email,
        company: firm || '',
        phone: '',
        jobTitle: role || '',
        product: 'saleshubcloud',
        source: 'lead-leak-audit',
        notes: `Lead Leak Audit: £${result.annual.toLocaleString('en-GB')}/yr lost · ${ENQ_LABEL[enquiries]} enquiries/mo · ${RESP_LABEL[responseTime]} response · ${STORAGE_LABEL[storage]} · ${CONV_LABEL[conversion]} conversion · ${feeEarners || '?'} fee-earners`
      })
    });
  } catch (e) { console.log('PublishOS failed:', e.message); }

  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    const auditHtml = buildAuditEmail({
      firstName, firm, ref,
      monthly: result.monthly, annual: result.annual, enquiries: result.enquiries,
      responseTime, storage, conversion, matterValue: result.matterValue,
      enquiriesRaw: enquiries
    });
    try {
      await sendEmail(brevoKey, 'hello@saleshubcloud.com', 'SalesHub Cloud', email,
        `Your Lead Leak Audit — ${'£' + result.annual.toLocaleString('en-GB')} per year`,
        auditHtml);
    } catch (e) { console.log('Brevo audit email failed:', e.message); }

    if (process.env.NOTIFY_EMAIL) {
      try {
        await sendEmail(brevoKey, 'hello@saleshubcloud.com', 'SalesHub Cloud', process.env.NOTIFY_EMAIL,
          `[${ref}] Lead Leak Audit: £${result.annual.toLocaleString('en-GB')}/yr — ${email}`,
          `<div style="font-family:Arial;max-width:600px;"><h2 style="color:#7C6FF7;">Lead Leak Audit — ${ref}</h2><table style="font-size:14px;width:100%;"><tr><td><b>Email:</b></td><td>${email}</td></tr><tr><td><b>Name:</b></td><td>${name || '-'}</td></tr><tr><td><b>Firm:</b></td><td>${firm || '-'}</td></tr><tr><td><b>Role:</b></td><td>${role || '-'}</td></tr><tr><td><b>Fee-earners:</b></td><td>${feeEarners || '-'}</td></tr><tr><td><b>Annual lost fees:</b></td><td>£${result.annual.toLocaleString('en-GB')}</td></tr><tr><td><b>Inputs:</b></td><td>enquiries=${ENQ_LABEL[enquiries]} · response=${RESP_LABEL[responseTime]} · storage=${STORAGE_LABEL[storage]} · conversion=${CONV_LABEL[conversion]}</td></tr></table></div>`);
      } catch (e) { console.log('Notify failed:', e.message); }
    }
  }

  // Schedule day-1 follow-up via existing email-sequence if available
  try {
    await fetch(ORIGIN + '/api/email-sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        sequence: 'lead-leak-audit-followup',
        delayHours: 24,
        meta: { firstName, firm, monthly: result.monthly, ref }
      })
    }).catch(() => null);
  } catch (e) { /* best-effort */ }

  return res.status(200).json({ ok: true, ref });
}
