import { Resend } from 'resend';

const PUBLISHOS_URL = 'https://publishos-eosin.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, organisation, phone, type, message } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const timestamp = new Date().toISOString();
  const ref = 'SHC-' + Date.now().toString(36).toUpperCase().slice(-6);
  console.log('New enquiry:', ref, { name, email, organisation, type });

  // ?? Seamless.ai enrichment ??
  let enriched = {};
  if (process.env.SEAMLESS_API_KEY && email) {
    try {
      const r = await fetch('https://api.seamless.ai/v1/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.SEAMLESS_API_KEY },
        body: JSON.stringify({ email, company_name: organisation || undefined })
      });
      if (r.ok) {
        const d = await r.json();
        if (d.data && d.data.length > 0) {
          const c = d.data[0];
          enriched = { job_title: c.job_title || '', company: c.company_name || '', linkedin: c.linkedin_url || '', company_size: c.company_employee_count || '', industry: c.industry || '' };
        }
      }
    } catch (e) { console.log('Seamless failed:', e.message); }
  }

  // ?? 1. Send to PublishOS pipeline ??
  try {
    await fetch(PUBLISHOS_URL + '/api/pipeline/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://saleshubcloud.com' },
      body: JSON.stringify({
        name,
        email,
        company: enriched.company || organisation || '',
        phone: phone || '',
        jobTitle: enriched.job_title || '',
        product: 'saleshubcloud',
        source: type === 'demo' ? 'demo-request' : type === 'support' ? 'support' : 'contact-form',
        notes: message || '',
      })
    });
    console.log('Lead sent to PublishOS pipeline');
  } catch (e) { console.log('PublishOS pipeline failed:', e.message); }

  // ?? 2. Send to trial signup if type is trial ??
  if (type === 'trial') {
    try {
      await fetch('https://app.saleshubcloud.com/api/public/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, organisationName: organisation || '' })
      });
      console.log('Trial signup sent to CRM');
    } catch (e) { console.log('Trial signup failed:', e.message); }
  }

  // ?? 3. Send email notification via Resend ??
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const enrichedHtml = Object.keys(enriched).length > 0
        ? '<tr><td colspan=2 style=padding:8px 0;font-weight:700;color:#7C6FF7;>Seamless.ai Enrichment</td></tr><tr><td><b>Job Title:</b></td><td>' + (enriched.job_title||'-') + '</td></tr><tr><td><b>Company Size:</b></td><td>' + (enriched.company_size||'-') + '</td></tr><tr><td><b>Industry:</b></td><td>' + (enriched.industry||'-') + '</td></tr><tr><td><b>LinkedIn:</b></td><td>' + (enriched.linkedin ? '<a href=' + enriched.linkedin + '>View</a>' : '-') + '</td></tr>'
        : '';
      await resend.emails.send({
        from: 'SalesHub Cloud <noreply@saleshubcloud.com>',
        to: process.env.NOTIFY_EMAIL,
        subject: '[' + ref + '] New ' + (type || 'enquiry') + ' from ' + name,
        html: '<div style=font-family:Arial;max-width:600px><div style=background:#7C6FF7;padding:1rem 1.5rem;border-radius:8px 8px 0 0><h2 style=color:white;margin:0;font-size:1.1rem>New enquiry Ñ saleshubcloud.com</h2></div><div style=background:#F3EFF9;padding:1rem 1.5rem;border-radius:0 0 8px 8px><table style=font-size:14px;width:100%><tr><td width=140><b>Ref:</b></td><td>' + ref + '</td></tr><tr><td><b>Name:</b></td><td>' + name + '</td></tr><tr><td><b>Email:</b></td><td><a href=mailto:' + email + '>' + email + '</a></td></tr><tr><td><b>Organisation:</b></td><td>' + (organisation||'-') + '</td></tr><tr><td><b>Phone:</b></td><td>' + (phone||'-') + '</td></tr><tr><td><b>Type:</b></td><td>' + (type||'General') + '</td></tr><tr><td><b>Message:</b></td><td>' + (message||'-') + '</td></tr>' + enrichedHtml + '</table></div></div>'
      });
    } catch (e) { console.log('Email failed:', e.message); }
  }

  return res.status(200).json({ ok: true, ref });
}
e:</b></td><td>${type || 'General'}</td></tr>
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
