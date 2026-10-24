import { NextRequest, NextResponse } from 'next/server';
import { GeminiProvider } from '@/lib/ai/geminiProvider';
import { SubjectContext } from '@/lib/ai/preprocessor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, enrolledSubjects = [], members = [], baseDate } = body;

    // 1. Protección contra consumo excesivo de tokens y scraping
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json(
        { error: 'El texto a procesar es requerido.' },
        { status: 400 }
      );
    }

    if (rawText.length > 4000) {
      return NextResponse.json(
        { error: 'El texto excede el límite máximo permitido de 4.000 caracteres.' },
        { status: 400 }
      );
    }

    // 2. Aceptar solo pedidos cuyo Origin coincida con el dominio de la app
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const appHost = forwardedHost || host;

    if (origin && appHost) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== appHost) {
          return NextResponse.json(
            { error: 'Origen no autorizado.' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Encabezado Origin no válido.' },
          { status: 400 }
        );
      }
    }

    const provider = new GeminiProvider();
    const result = await provider.extractInboxItems({
      rawText: rawText.trim(),
      enrolledSubjects: enrolledSubjects as SubjectContext[],
      members,
      baseDate: baseDate ? new Date(baseDate) : new Date(),
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      sourceEngine: result.sourceEngine,
    });
  } catch (err) {
    console.error('Error en /api/ai/extract:', err);
    return NextResponse.json(
      { error: 'Error interno al procesar el texto con el motor de extracción.' },
      { status: 500 }
    );
  }
}
