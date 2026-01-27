import { NextResponse } from 'next/server';
import { getFields } from '@/lib/services/elasticsearch';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get('index');

  if (!index) {
    return NextResponse.json({ error: 'Index parameter is required' }, { status: 400 });
  }

  try {
    const fields = await getFields(index);
    return NextResponse.json(fields);
  } catch (error: unknown) {
    console.error('Error fetching mapping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
