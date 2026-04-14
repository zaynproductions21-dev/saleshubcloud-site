const PUBLISHOS = 'https://publishos-eosin.vercel.app';
const ORIGIN = 'https://www.saleshubcloud.com';
const BREVO = 'https://api.brevo.com/v3/smtp/email';

async function sendEmail(apiKey, from, fromName, to, subject, html) {
  return fetch(BREVO, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ sender: { name: fromName, email: from }, to: [{ email: to }], subject, htmlContent: html })
  });
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

  const { name, email, organisation, company, phone, type, message, requirements } = req.body;
  const cName = name || '';
  const cEmail = email || '';
  if (!cEmail) return res.status(400).json({ error: 'Email required' });

  const ref = 'SHC-' + Date.now().toString(36).toUpperCase().slice(-6);
  const cCompany = company || organisation || '';
  const cMsg = message || requirements || '';
  console.log('New enquiry:', ref, { name: cName, email: cEmail, type });

  // Seamless.ai enrichment
  let enriched = {};
  if (process.env.SEAMLESS_API_KEY) {
    try {
      const r = await fetch('https://api.seamless.ai/v1/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.SEAMLESS_API_KEY },
        body: JSON.stringify({ email: cEmail, company_name: cCompany || undefined })
      });
      if (r.ok) {
        const d = await r.json();
        if (d.data?.[0]) {
          const c = d.data[0];
          enriched = { job_title: c.job_title || '', company: c.company_name || '', linkedin: c.linkedin_url || '', company_size: c.company_employee_count || '', industry: c.industry || '' };
        }
      }
    } catch(e) { console.log('Seamless failed:', e.message); }
  }

  // 1. PublishOS pipeline
  try {
    await fetch(PUBLISHOS + '/api/pipeline/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({ name: cName, email: cEmail, company: enriched.company || cCompany, phone: phone || '', jobTitle: enriched.job_title || '', product: 'saleshubcloud', source: type || 'contact-form', notes: cMsg })
    });
  } catch(e) { console.log('PublishOS failed:', e.message); }

  const brevoKey = process.env.BREVO_API_KEY;

  if (brevoKey) {
    const autoReplyHtml = `<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;'><table cellpadding='0' cellspacing='0' border='0' width='100%' style='padding:32px 16px;'><tr><td align='center'><table cellpadding='0' cellspacing='0' border='0' width='100%' style='max-width:560px;'><tr><td style='background:#7C6FF7;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;'><div style='font-size:22px;font-weight:900;color:white;'>SalesHub Cloud</div><div style='font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;'>The CRM that closes more cases.</div></td></tr><tr><td style='background:white;padding:32px;'><p style='font-size:16px;color:#1a1a2e;font-weight:700;margin:0 0 12px;'>Thanks for getting in touch!</p><p style='font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;'>We have received your message and a member of our team will be in touch within <strong>4 business hours</strong>.</p><table width='100%' style='background:#F3EFF9;border-left:4px solid #7C6FF7;border-radius:0 8px 8px 0;margin-bottom:24px;'><tr><td style='padding:16px 20px;'><p style='font-size:12px;font-weight:700;color:#7C6FF7;text-transform:uppercase;margin:0 0 10px;'>What happens next</p><p style='font-size:13px;color:#444;margin:0 0 6px;'>&#x2714; You will receive a confirmation email (this one!)</p><p style='font-size:13px;color:#444;margin:0 0 6px;'>&#x2714; Our team reviews your enquiry</p><p style='font-size:13px;color:#444;margin:0;'>&#x2714; We will be in touch to arrange a call or demo</p></td></tr></table><p style='font-size:14px;color:#555;margin:0 0 24px;'>Reach us at <a href='mailto:hello@saleshubcloud.com' style='color:#7C6FF7;font-weight:600;'>hello@saleshubcloud.com</a>.</p><table><tr><td style='background:#7C6FF7;border-radius:8px;'><a href='https://www.saleshubcloud.com' style='display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:white;text-decoration:none;'>Visit SalesHub Cloud &rarr;</a></td></tr></table></td></tr><tr><td style='background:#f9f9f9;border-top:1px solid #eee;border-radius:0 0 12px 12px;padding:20px 32px;'><p style='font-size:12px;color:#999;margin:0;'>Best regards,<br><strong style='color:#555;'>The SalesHub Cloud Team</strong></p><p style='font-size:11px;color:#bbb;margin:8px 0 0;'>Zayn Productions Ltd &middot; Co. No. 16892199 &middot; 1 Alvin Street, Gloucester, GL1 3EJ</p></td></tr></table></td></tr></table></body></html>`;

    // 2. Branded auto-reply to submitter
    try {
      await sendEmail(brevoKey, 'hello@saleshubcloud.com', 'SalesHub Cloud', cEmail, `We have received your message — SalesHub Cloud`, autoReplyHtml);
    } catch(e) { console.log('Auto-reply failed:', e.message); }

    // 3. Team notification
    if (process.env.NOTIFY_EMAIL) {
      try {
        const eRows = Object.keys(enriched).length > 0 ? `<tr><td colspan=2 style="font-weight:700;color:#7C6FF7;padding:8px 0;">Seamless.ai</td></tr><tr><td>Job Title:</td><td>${enriched.job_title||'-'}</td></tr><tr><td>Company Size:</td><td>${enriched.company_size||'-'}</td></tr><tr><td>Industry:</td><td>${enriched.industry||'-'}</td></tr>` : '';
        const notifyHtml = `<div style="font-family:Arial;max-width:600px;"><div style="background:#7C6FF7;padding:1rem 1.5rem;border-radius:8px 8px 0 0;"><h2 style="color:white;margin:0;">New enquiry [${ref}] — saleshubcloud.com</h2></div><div style="background:#F3EFF9;padding:1rem 1.5rem;border-radius:0 0 8px 8px;"><table style="font-size:14px;width:100%;"><tr><td width=140><b>Ref:</b></td><td>${ref}</td></tr><tr><td><b>Name:</b></td><td>${cName}</td></tr><tr><td><b>Email:</b></td><td>${cEmail}</td></tr><tr><td><b>Company:</b></td><td>${cCompany||'-'}</td></tr><tr><td><b>Phone:</b></td><td>${phone||'-'}</td></tr><tr><td><b>Type:</b></td><td>${type||'General'}</td></tr><tr><td><b>Message:</b></td><td>${cMsg||'-'}</td></tr>${eRows}</table></div></div>`;
        await sendEmail(brevoKey, 'hello@saleshubcloud.com', 'SalesHub Cloud', process.env.NOTIFY_EMAIL, `[${ref}] New ${type||'enquiry'} from ${cName} — SalesHub Cloud`, notifyHtml);
      } catch(e) { console.log('Notify failed:', e.message); }
    }
  }

  return res.status(200).json({ ok: true, ref });
}
