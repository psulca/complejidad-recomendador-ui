import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://complejidad-recomendador.onrender.com';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Obtener parámetro de carrera de la query string
    const { searchParams } = new URL(request.url);
    const carrera = searchParams.get('carrera');

    // Construir URL con parámetro de carrera si existe
    let url = `${BACKEND_URL}/api/cursos`;
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
        { error: 'Error al obtener cursos' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en API cursos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

