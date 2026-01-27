import { NextResponse } from 'next/server';
import { performSearch } from '@/lib/services/elasticsearch';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await performSearch(body);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error performing search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform search';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
