import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, organisation, phone, type, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  console.log('New enquiry:', { name, email, organisation, type });

  try {
    // 1. Send to CRM webhook if configured
    if (process.env.WEBHOOK_URL) {
      await fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, organisation, phone, type, message, source: 'saleshubcloud.com', timestamp: new Date().toISOString() })
      });
    }

    // 2. Send email notification via Resend
    if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'SalesHub Cloud <noreply@saleshubcloud.com>',
        to: process.env.NOTIFY_EMAIL,
        subject: `New ${type || 'enquiry'} from ${name}`,
        html: `
          <h2>New enquiry from saleshubcloud.com</h2>
          <table style='font-family:Arial;font-size:14px;'>
            <tr><td><b>Name:</b></td><td>${name}</td></tr>
            <tr><td><b>Email:</b></td><td>${email}</td></tr>
            <tr><td><b>Organisation:</b></td><td>${organisation || '-'}</td></tr>
            <tr><td><b>Phone:</b></td><td>${phone || '-'}</td></tr>
            <tr><td><b>Type:</b></td><td>${type || 'General'}</td></tr>
            <tr><td><b>Message:</b></td><td>${message}</td></tr>
          </table>
        `
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry error:', err);
    return res.status(500).json({ error: 'Failed to process enquiry' });
  }
}
