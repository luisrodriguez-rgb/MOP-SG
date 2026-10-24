import { POST } from '../../app/api/ai/extract/route';
import { NextRequest } from 'next/server';

async function testApiAiExtract() {
  console.log('--- Testing /api/ai/extract security guardrails ---');

  // Test 1: Texto mayor a 4000 caracteres
  const longText = 'A'.repeat(4001);
  const req1 = new NextRequest('http://localhost:3000/api/ai/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
    body: JSON.stringify({ rawText: longText }),
  });
  const res1 = await POST(req1);
  if (res1.status !== 400) {
    throw new Error(`Expected status 400 for text > 4000 chars, got ${res1.status}`);
  }
  const data1 = await res1.json();
  if (!data1.error?.includes('4.000 caracteres')) {
    throw new Error(`Expected error message about 4.000 chars, got: ${data1.error}`);
  }
  console.log('✓ Text length > 4000 rejected with 400');

  // Test 2: Origin fraudulento / no coincidente
  const req2 = new NextRequest('http://localhost:3000/api/ai/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'mop-sg.vercel.app',
      origin: 'https://evil-site.com',
    },
    body: JSON.stringify({ rawText: 'Hola equipo' }),
  });
  const res2 = await POST(req2);
  if (res2.status !== 403) {
    throw new Error(`Expected status 403 for mismatched origin, got ${res2.status}`);
  }
  console.log('✓ Cross-origin request from unauthorized origin rejected with 403');

  // Test 3: Origin coincidente
  const req3 = new NextRequest('http://localhost:3000/api/ai/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: 'mop-sg.vercel.app',
      origin: 'https://mop-sg.vercel.app',
    },
    body: JSON.stringify({ rawText: 'Leon edita el video del Playtest para el jueves' }),
  });
  const res3 = await POST(req3);
  if (res3.status !== 200) {
    throw new Error(`Expected status 200 for matching origin, got ${res3.status}`);
  }
  const data3 = await res3.json();
  if (!data3.success) {
    throw new Error(`Expected success: true, got ${JSON.stringify(data3)}`);
  }
  console.log('✓ Valid same-origin request accepted with 200');

  console.log('ALL API AI EXTRACT TESTS PASSED!\n');
}

testApiAiExtract();
