import { useState } from 'react';

import {
  createPayment,
  verifyPayment,
} from './lib/paymentApi';
import { loadRazorpayScript } from './lib/razorpay';

const ORDER_ID =
  '631f70fc-9d8a-4950-aa7b-8569c925e805';

const ACCESS_TOKEN =
localStorage.getItem('bhooko_access_token') ?? '';

function App() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    'Ready for Razorpay test payment.',
  );

  async function handlePayment() {
    try {
      setLoading(true);
      setMessage('Creating BHOOKO payment...');

      if (!ACCESS_TOKEN) {
        throw new Error(
          'VITE_CUSTOMER_ACCESS_TOKEN is not configured',
        );
      }

      const payment = await createPayment(
        [ORDER_ID],
        ACCESS_TOKEN,
      );

      setMessage('Opening Razorpay Checkout...');

      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amountInPaise,
        currency: payment.currency,
        name: 'BHOOKO',
        description: 'BHOOKO Test Order',
        order_id: payment.razorpayOrderId,

        handler: async (response) => {
          try {
            setMessage(
              'Payment received. Verifying with BHOOKO...',
            );

            const result = await verifyPayment(
              {
                paymentTransactionId:
                  payment.paymentTransactionId,
                razorpayOrderId:
                  response.razorpay_order_id,
                razorpayPaymentId:
                  response.razorpay_payment_id,
                razorpaySignature:
                  response.razorpay_signature,
              },
              ACCESS_TOKEN,
            );

            setMessage(
              `Payment ${result.status}: ${result.message}`,
            );
          } catch (error) {
            console.error(error);

            setMessage(
              'Payment verification failed. Check the API terminal.',
            );
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setMessage('Razorpay Checkout closed.');
          },
        },

        theme: {
          color: '#111827',
        },
      });

      razorpay.open();
      setLoading(false);
    } catch (error) {
      console.error(error);

      setLoading(false);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment initialization failed.',
      );
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f8fafc',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px',
          borderRadius: '20px',
          background: '#ffffff',
          boxShadow:
            '0 10px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '32px',
          }}
        >
          BHOOKO
        </h1>

        <p
          style={{
            marginTop: '8px',
            color: '#64748b',
          }}
        >
          Razorpay Test Checkout
        </p>

        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: '#f1f5f9',
          }}
        >
          <strong>Chicken Biryani</strong>

          <div
            style={{
              marginTop: '6px',
              fontSize: '20px',
            }}
          >
            ₹180
          </div>
        </div>

        <button
          type="button"
          onClick={handlePayment}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '14px 18px',
            border: 0,
            borderRadius: '10px',
            background: '#111827',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading
            ? 'Processing...'
            : 'Pay ₹180'}
        </button>

        <p
          style={{
            marginTop: '18px',
            marginBottom: 0,
            color: '#475569',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      </section>
    </main>
  );
}

export default App;
