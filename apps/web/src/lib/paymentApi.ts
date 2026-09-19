import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export interface CreatePaymentResponse {
  paymentTransactionId: string;
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
  keyId: string;
  orderIds: string[];
}

export interface VerifyPaymentResponse {
  message: string;
  paymentTransactionId: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: string;
  orderIds: string[];
}

export async function createPayment(
  orderIds: string[],
  accessToken: string,
): Promise<CreatePaymentResponse> {
  const response = await api.post<CreatePaymentResponse>(
    '/payments',
    { orderIds },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
}

export async function verifyPayment(
  data: {
    paymentTransactionId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
  accessToken: string,
): Promise<VerifyPaymentResponse> {
  const response = await api.post<VerifyPaymentResponse>(
    '/payments/verify',
    data,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data;
}
