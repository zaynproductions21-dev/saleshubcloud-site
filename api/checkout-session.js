const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return res.status(200).json({
      email: session.customer_details?.email || session.customer_email || '',
      name: session.customer_details?.name || '',
      plan: session.metadata?.plan || '',
    });
  } catch {
    return res.status(404).json({ error: 'Session not found' });
  }
};
