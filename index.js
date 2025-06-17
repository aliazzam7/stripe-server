const express = require('express');
const cors = require('cors');
const stripe = require('stripe')('sk_test_51RZxC3FRjFlRIBAvCnQQVE8BRa1JhDZ1nobvDPfEwHuCJVma3vKRZsGe3xRbopwQaP8B6E5PVcyHxiweaEmJDQkn000zeI3y60'); 

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });

    res.send({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(10000, () => console.log('Stripe server running on port 10000'));

