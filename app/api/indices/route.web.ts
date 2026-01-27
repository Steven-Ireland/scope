import { NextResponse } from 'next/server';
import { getIndices } from '@/lib/services/elasticsearch';

export async function GET() {
  try {
    const indices = await getIndices();
    return NextResponse.json(indices);
  } catch (error) {
    console.error('Error fetching indices:', error);
    return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 });
  }
}