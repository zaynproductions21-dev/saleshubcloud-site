const Stripe = require('stripe');

const PRICE_TO_PLAN = {
  'price_1TMvyG8rk99sE9j0unH2AkNy': 'essentials',
  'price_1TMvyG8rk99sE9j0cPNiEwyW': 'professional',
  'price_1TMvyH8rk99sE9j0Q1iof8o5': 'scale',
};

async function activateSubscription(email, plan) {
  const res = await fetch('https://api.saleshubcloud.com/api/internal/activate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, plan }),
  });
  if (!res.ok) {
    console.error('activate-subscription failed:', res.status, await res.text());
  }
}

async function deactivateSubscription(email) {
  const res = await fetch('https://api.saleshubcloud.com/api/internal/activate-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, plan: 'cancelled' }),
  });
  if (!res.ok) {
    console.error('deactivate-subscription failed:', res.status);
  }
}

async function triggerEmailSequence(email, name, event) {
  try {
    await fetch('https://www.saleshubcloud.com/api/email-sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, event, product: 'saleshubcloud' }),
    });
  } catch (err) { console.error('email-sequence trigger failed:', err); }
}

module.exports.config = { api: { bodyParser: false } };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: err.message });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email;
      if (email && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = sub.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN[priceId] || 'essentials';
        await activateSubscription(email, plan);
        console.log(`Subscription activated: ${email} → ${plan}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.error(`Payment failed for ${invoice.customer_email}, invoice ${invoice.id}`);
      await triggerEmailSequence(invoice.customer_email, invoice.customer_email.split('@')[0], 'payment_failed');
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const customer = await stripe.customers.retrieve(sub.customer);
      if (customer.email) {
        await deactivateSubscription(customer.email);
        await triggerEmailSequence(customer.email, customer.name || customer.email.split('@')[0], 'cancelled');
        console.log(`Subscription cancelled: ${customer.email}`);
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
};
