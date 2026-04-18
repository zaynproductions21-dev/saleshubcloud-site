const Stripe = require('stripe');

const ALLOWED_PRICES = new Set([
  'price_1TMvyG8rk99sE9j0unH2AkNy', // Essentials
  'price_1TMvyG8rk99sE9j0cPNiEwyW', // Professional
  'price_1TMvyH8rk99sE9j0Q1iof8o5', // Scale
]);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, quantity } = req.body;

    if (!priceId || !ALLOWED_PRICES.has(priceId)) {
      return res.status(400).json({ error: 'Invalid price' });
    }

    const qty = Math.max(1, Math.min(100, parseInt(quantity) || 1));
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: qty }],
      success_url: 'https://www.saleshubcloud.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.saleshubcloud.com/#pricing',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message || 'Checkout failed' });
  }
};
