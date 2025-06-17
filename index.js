// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// const app = express();
// app.use(cors());
// app.use(express.json());

// app.post('/create-payment-intent', async (req, res) => {
//   try {
//     const { amount, currency } = req.body;

//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency,
//       payment_method_types: ['card'],
//     });

//     res.send({ client_secret: paymentIntent.client_secret });
//   } catch (err) {
//     res.status(500).send({ error: err.message });
//   }
// });

// app.listen(10000, () => console.log('Stripe server running on port 10000'));
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// تحسين إعدادات CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Route للتحقق من أن السيرفر يعمل
app.get('/', (req, res) => {
  console.log('Health check request received');
  res.json({ 
    message: 'Stripe Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint للتحقق من Stripe connection
app.get('/test-stripe', async (req, res) => {
  try {
    // Test Stripe connection
    const account = await stripe.accounts.retrieve();
    res.json({
      message: 'Stripe connection successful',
      account_id: account.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stripe connection test failed:', error);
    res.status(500).json({
      error: 'Stripe connection failed',
      message: error.message
    });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  try {
    console.log('🚀 Payment intent creation started');
    const { amount, currency } = req.body;

    // التحقق من البيانات المرسلة
    if (!amount || !currency) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Amount and currency are required',
        received: { amount, currency }
      });
    }

    // التحقق من صحة المبلغ
    const numericAmount = parseInt(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.log('❌ Invalid amount:', amount);
      return res.status(400).json({
        error: 'Invalid amount',
        received_amount: amount
      });
    }

    // التحقق من صحة العملة
    const validCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud'];
    if (!validCurrencies.includes(currency.toLowerCase())) {
      console.log('❌ Invalid currency:', currency);
      return res.status(400).json({
        error: 'Invalid currency',
        received_currency: currency,
        valid_currencies: validCurrencies
      });
    }

    console.log(`💰 Creating payment intent: amount=${numericAmount}, currency=${currency}`);

    // التحقق من وجود Stripe key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('❌ Stripe secret key not found');
      return res.status(500).json({
        error: 'Server configuration error'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: numericAmount,
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      // إضافة metadata مفيدة
      metadata: {
        app: 'RestoMenu',
        timestamp: new Date().toISOString(),
        amount_original: amount,
        currency_original: currency
      },
      // إضافة automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ Payment intent created successfully:', paymentIntent.id);

    // إرجاع client_secret بالاسم الصحيح
    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

  } catch (err) {
    console.error('❌ Stripe Error:', err);
    
    // تحسين معالجة الأخطاء
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (err.type === 'StripeCardError') {
      errorMessage = err.message;
      statusCode = 400;
    } else if (err.type === 'StripeInvalidRequestError') {
      errorMessage = err.message;
      statusCode = 400;
    } else if (err.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable';
      statusCode = 503;
    } else if (err.type === 'StripeConnectionError') {
      errorMessage = 'Network error, please try again';
      statusCode = 503;
    }
    
    res.status(statusCode).json({
      error: errorMessage,
      type: err.type || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// تشغيل السيرفر على البورت المطلوب من Vercel أو 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Stripe server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Stripe key configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
});