import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';

export async function GET() {
  try {
    const indices = await esClient.cat.indices({ format: 'json' });
    // Filter out system indices
    const filteredIndices = indices.filter(index => !index.index?.startsWith('.'));
    return NextResponse.json(filteredIndices);
  } catch (error) {
    console.error('Error fetching indices:', error);
    return NextResponse.json({ error: 'Failed to fetch indices' }, { status: 500 });
  }
}
