import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://complejidad-recomendador.onrender.com';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; curso_codigo: string }> }
) {
  try {
    const { id, curso_codigo } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${BACKEND_URL}/api/usuario/${id}/historial/${curso_codigo}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`,
        }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Error al actualizar curso en el historial' },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; curso_codigo: string }> }
) {
  try {
    const { id, curso_codigo } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { searchParams } = new URL(request.url);
    const carrera = searchParams.get('carrera');

    let url = `${BACKEND_URL}/api/usuario/${id}/historial/${curso_codigo}`;
    if (carrera) {
      url += `?carrera=${encodeURIComponent(carrera)}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`,
        }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Error al eliminar curso del historial' },
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

