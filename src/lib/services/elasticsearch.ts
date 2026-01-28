import esClient from '@/lib/elasticsearch';
import { estypes } from '@elastic/elasticsearch';

export interface SearchParams {
  index: string;
  query?: string;
  from?: string;
  to?: string;
  offset?: number;
  size?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function performSearch(params: SearchParams) {
  const { index, query, from, to, offset = 0, size = 50, sortField, sortOrder } = params;

  if (!index) {
    throw new Error('Index is required');
  }

  const must: estypes.QueryDslQueryContainer[] = [];

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

  if (query) {
    must.push({
      query_string: {
        query: query,
        default_field: '*',
      },
    });
  }

  const sort: Record<string, { order: 'asc' | 'desc' }>[] = [];
  if (sortField) {
    sort.push({ [sortField]: { order: sortOrder || 'desc' } });
  } else {
    sort.push({ '@timestamp': { order: 'desc' } });
  }

  return await esClient.search({
    index,
    from: offset,
    size,
    body: {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
        },
      },
      sort,
    },
  });
}

export async function getIndices() {
  const indices = await esClient.cat.indices({ format: 'json' });
  return indices.filter(index => !index.index?.startsWith('.'));
}

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
}

export async function getFields(index: string) {
  const response = await esClient.indices.getMapping({ index });
  const allFields: { name: string, type: string }[] = [];
  
  const getFieldsRecursive = (properties: Record<string, MappingProperty> | undefined, prefix = '') => {
    if (!properties) return;
    for (const key in properties) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const property = properties[key];
      const type = property.type || 'object';
      allFields.push({ name: fullPath, type });
      if (property.properties) {
        getFieldsRecursive(property.properties, fullPath);
      }
    }
  };

  Object.values(response).forEach((indexData) => {
    if (indexData.mappings && indexData.mappings.properties) {
      getFieldsRecursive(indexData.mappings.properties as Record<string, MappingProperty>);
    }
  });

  return allFields.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getValues(index: string, field: string, query: string = '', type: string = '') {
  const isNumeric = ['integer', 'long', 'float', 'double', 'short', 'byte', 'half_float', 'scaled_float'].includes(type);

  let include: string | undefined = undefined;
  if (!isNumeric && query) {
    const escaped = query.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    include = `${escaped}.*`;
  }

  const body = {
    size: 0,
    aggs: {
      top_values: {
        terms: {
          field: field,
          size: isNumeric ? 100 : 20,
          include
        }
      }
    }
  };

  const response = await esClient.search({
    index,
    body
  });

  const topValues = response.aggregations?.top_values as any;
  const buckets = (topValues?.buckets || []) as any[];
  let values = buckets.map((b) => (b.key_as_string || b.key));

  if (isNumeric) {
    if (query) {
      values = values.filter(v => String(v).startsWith(query));
    }
    values.sort((a, b) => Number(a) - Number(b));
  } else {
    values.sort((a, b) => String(a).localeCompare(String(b)));
  }

  return values.slice(0, 20);
}
