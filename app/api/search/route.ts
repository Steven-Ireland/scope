import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { index, query, from, to, offset = 0, size = 50 } = body;

    if (!index) {
      return NextResponse.json({ error: 'Index is required' }, { status: 400 });
    }

    const must: QueryDslQueryContainer[] = [];

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
            must: must.length > 0 ? must : [{ match_all: {} }],
          },
        },
        sort: [
          { '@timestamp': { order: 'desc' } }
        ],
      },
    });

    return NextResponse.json(searchResponse);
  } catch (error: unknown) {
    console.error('Error performing search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to perform search';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}