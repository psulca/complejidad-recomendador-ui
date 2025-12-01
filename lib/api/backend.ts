import axios from 'axios';
import { createClient } from '@/lib/supabase/client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://complejidad-recomendador.onrender.com';

export async function getAuthenticatedBackendClient() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const client = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`,
      }),
    },
  });

  return { client, session };
}

export async function backendRequest<T = any>(
  method: 'get' | 'post' | 'put' | 'delete',
  endpoint: string,
  data?: any
): Promise<T> {
  const { client } = await getAuthenticatedBackendClient();
  
  try {
    const response = await client.request<T>({
      method,
      url: endpoint,
      data,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail || error.message);
    }
    throw error;
  }
}

