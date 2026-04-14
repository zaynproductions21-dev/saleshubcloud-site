import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, organisation, phone, type, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  const timestamp = new Date().toISOString();
  const ref = 'SHC-' + Date.now().toString(36).toUpperCase().slice(-6);
  console.log('New enquiry:', ref, { name, email, organisation, type });

  // ?? Seamless.ai enrichment (optional - enriches contact data) ??
  let enriched = {};
  if (process.env.SEAMLESS_API_KEY && email) {
    try {
      const seamlessRes = await fetch('https://api.seamless.ai/v1/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.SEAMLESS_API_KEY
        },
        body: JSON.stringify({
          email: email,
          company_name: organisation || undefined
        })
      });
      if (seamlessRes.ok) {
        const seamlessData = await seamlessRes.json();
        if (seamlessData.data && seamlessData.data.length > 0) {
          const contact = seamlessData.data[0];
          enriched = {
            job_title: contact.job_title || '',
            company: contact.company_name || organisation || '',
            linkedin: contact.linkedin_url || '',
            company_size: contact.company_employee_count || '',
            industry: contact.industry || '',
          };
          console.log('Seamless enrichment:', enriched);
        }
      }
    } catch (err) {
      console.log('Seamless enrichment failed (non-critical):', err.message);
    }
  }

  const payload = {
    ref,
    name,
    email,
    organisation: enriched.company || organisation || '',
    phone: phone || '',
    type: type || 'general',
    message,
    job_title: enriched.job_title || '',
    linkedin: enriched.linkedin || '',
    company_size: enriched.company_size || '',
    industry: enriched.industry || '',
    source: 'saleshubcloud.com',
    timestamp,
    enriched_by_seamless: Object.keys(enriched).length > 0
  };

  try {
    // 1. Send to CRM webhook
    if (process.env.WEBHOOK_URL) {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    // 2. Send email notification via Resend
    if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const enrichedRows = Object.keys(enriched).length > 0 ? `
        <tr><td colspan='2' style='padding:8px 0;font-weight:700;color:#7C6FF7;'>Seamless.ai Enrichment</td></tr>
        <tr><td><b>Job Title:</b></td><td>${enriched.job_title || '-'}</td></tr>
        <tr><td><b>Company:</b></td><td>${enriched.company || '-'}</td></tr>
        <tr><td><b>Company Size:</b></td><td>${enriched.company_size || '-'}</td></tr>
        <tr><td><b>Industry:</b></td><td>${enriched.industry || '-'}</td></tr>
        <tr><td><b>LinkedIn:</b></td><td>${enriched.linkedin ? '<a href=' + enriched.linkedin + '>View Profile</a>' : '-'}</td></tr>
      ` : '<tr><td colspan=2 style=color:#999>No Seamless enrichment (add SEAMLESS_API_KEY to activate)</td></tr>';

      await resend.emails.send({
        from: 'SalesHub Cloud <noreply@saleshubcloud.com>',
        to: process.env.NOTIFY_EMAIL,
        subject: `[${ref}] New ${type || 'enquiry'} from ${name}`,
        html: `
          <div style='font-family:Arial;max-width:600px;'>
            <div style='background:#7C6FF7;padding:1rem 1.5rem;border-radius:8px 8px 0 0;'>
              <h2 style='color:white;margin:0;font-size:1.1rem;'>New enquiry Ñ saleshubcloud.com</h2>
            </div>
            <div style='background:#F3EFF9;padding:1rem 1.5rem;border-radius:0 0 8px 8px;'>
              <table style='font-size:14px;width:100%;border-collapse:collapse;'>
                <tr><td style='padding:4px 0;width:140px;'><b>Ref:</b></td><td>${ref}</td></tr>
                <tr><td><b>Name:</b></td><td>${name}</td></tr>
                <tr><td><b>Email:</b></td><td><a href='mailto:${email}'>${email}</a></td></tr>
                <tr><td><b>Organisation:</b></td><td>${organisation || '-'}</td></tr>
                <tr><td><b>Phone:</b></td><td>${phone || '-'}</td></tr>
                <tr><td><b>Type:</b></td><td>${type || 'General'}</td></tr>
                <tr><td><b>Message:</b></td><td>${message}</td></tr>
                ${enrichedRows}
              </table>
            </div>
          </div>
        `
      });
    }

    return res.status(200).json({ ok: true, ref });
  } catch (err) {
    console.error('Enquiry handler error:', err);
    return res.status(500).json({ error: 'Failed to process enquiry' });
  }
}
