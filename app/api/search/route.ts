import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { index, query, from, to, offset = 0, size = 50 } = body;

    if (!index) {
      return NextResponse.json({ error: 'Index is required' }, { status: 400 });
    }

    const must: any[] = [];

    // Time range filter
    if (from || to) {
      must.push({
        range: {
          '@timestamp': {
            gte: from,
            lte: to,
          },
        },
      });
    }

    // Text search query
    if (query) {
      must.push({
        query_string: {
          query: query,
          default_field: '*',
        },
      });
    }

    const searchResponse = await esClient.search({
      index,
      from: offset,
      size,
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : { match_all: {} },
          },
        },
        sort: [
          { '@timestamp': { order: 'desc' } }
        ],
      },
    });

    return NextResponse.json(searchResponse);
  } catch (error: any) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform search' },
      { status: 500 }
    );
  }
}
