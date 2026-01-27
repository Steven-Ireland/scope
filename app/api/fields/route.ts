import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get('index');

  if (!index) {
    return NextResponse.json({ error: 'Index parameter is required' }, { status: 400 });
  }

  try {
    const response = await esClient.indices.getMapping({ index });
    
    const allFields = new Set<string>();
    
    const getFields = (properties: any, prefix = '') => {
      if (!properties) return;
      for (const key in properties) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        allFields.add(fullPath);
        if (properties[key].properties) {
          getFields(properties[key].properties, fullPath);
        }
      }
    };

    // The response from getMapping is keyed by index name
    Object.values(response).forEach((indexData: any) => {
        if (indexData.mappings && indexData.mappings.properties) {
            getFields(indexData.mappings.properties);
        }
    });

    return NextResponse.json(Array.from(allFields).sort());
  } catch (error: any) {
    console.error('Error fetching mapping:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
