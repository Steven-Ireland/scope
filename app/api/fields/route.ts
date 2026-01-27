import { NextResponse } from 'next/server';
import esClient from '@/lib/elasticsearch';

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const index = searchParams.get('index');

  if (!index) {
    return NextResponse.json({ error: 'Index parameter is required' }, { status: 400 });
  }

  try {
    const response = await esClient.indices.getMapping({ index });
    
    const allFields: { name: string, type: string }[] = [];
    
    const getFields = (properties: Record<string, MappingProperty> | undefined, prefix = '') => {
      if (!properties) return;
      for (const key in properties) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const property = properties[key];
        const type = property.type || 'object';
        allFields.push({ name: fullPath, type });
        if (property.properties) {
          getFields(property.properties, fullPath);
        }
      }
    };

    // The response from getMapping is keyed by index name
    Object.values(response).forEach((indexData) => {
        if (indexData.mappings && indexData.mappings.properties) {
            getFields(indexData.mappings.properties as Record<string, MappingProperty>);
        }
    });

    return NextResponse.json(allFields.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error: unknown) {
    console.error('Error fetching mapping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}