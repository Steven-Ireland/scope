import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';
import { SearchResponse, AggregationsTermsAggregate, AggregationsKeyedAggregate } from '@elastic/elasticsearch/lib/api/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get('index');
  const field = searchParams.get('field');
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || '';

  if (!index || !field) {
    return NextResponse.json({ error: 'Index and field parameters are required' }, { status: 400 });
  }

  const isNumeric = ['integer', 'long', 'float', 'double', 'short', 'byte', 'half_float', 'scaled_float'].includes(type);

  try {
    const body = {
      size: 0,
      aggs: {
        top_values: {
          terms: {
            field: field,
            size: isNumeric ? 100 : 20, // Fetch more for numeric to filter in JS
            // Include regex only for non-numeric fields as ES doesn't support it on numbers
            include: (!isNumeric && query) ? `${query.replace(/[.*+?^${}()|[\\]/g, '\$&')}.*` : undefined
          }
        }
      }
    };

    const response: SearchResponse<unknown, Record<string, AggregationsKeyedAggregate>> = await esClient.search({
      index,
      body
    });

    const topValues = response.aggregations?.top_values as AggregationsTermsAggregate;
    const buckets = topValues?.buckets || [];
    let values = buckets.map((b) => ('key_as_string' in b ? b.key_as_string : b.key));

    // Sort values: numerically for numbers, alphabetically for strings
    if (isNumeric) {
      if (query) {
        values = values.filter(v => String(v).startsWith(query));
      }
      values.sort((a, b) => Number(a) - Number(b));
    } else {
      values.sort((a, b) => String(a).localeCompare(String(b)));
    }

    return NextResponse.json(values.slice(0, 20));
  } catch (error: unknown) {
    console.error('Error fetching values:', error);
    return NextResponse.json([]);
  }
}