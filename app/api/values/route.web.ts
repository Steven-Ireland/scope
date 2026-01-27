import { NextResponse } from 'next/server';
import { getValues } from '@/lib/services/elasticsearch';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get('index');
  const field = searchParams.get('field');
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || '';

  if (!index || !field) {
    return NextResponse.json({ error: 'Index and field parameters are required' }, { status: 400 });
  }

  try {
    const values = await getValues(index, field, query, type);
    return NextResponse.json(values);
  } catch (error: unknown) {
    console.error('Error fetching values:', error);
    return NextResponse.json([]);
  }
}
