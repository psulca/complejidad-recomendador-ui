import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://complejidad-recomendador.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { searchParams } = new URL(request.url);
    const carrera = searchParams.get('carrera');

    let url = `${BACKEND_URL}/api/usuario/${id}/historial`;
    if (carrera) {
      url += `?carrera=${encodeURIComponent(carrera)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`,
        }),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener historial' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en API historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'No autenticado. Por favor, inicia sesión.' },
        { status: 401 }
      );
    }

    console.log('Enviando POST a backend con JWT:', {
      url: `${BACKEND_URL}/api/usuario/${id}/historial`,
      hasToken: !!session.access_token,
      tokenLength: session.access_token.length,
      body: body
    });

    const response = await fetch(`${BACKEND_URL}/api/usuario/${id}/historial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorText = await response.text().catch(() => '');
      console.error('Error del backend:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorText,
        body: body
      });
      return NextResponse.json(
        { 
          error: errorData.detail || errorData.message || errorText || 'Error al agregar curso al historial',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en API historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

