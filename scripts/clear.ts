import { Client } from '@elastic/elasticsearch-8';

const NODES = ['http://localhost:9200', 'http://localhost:9201'];

async function clearNode(node: string) {
  console.log(`
--- Clearing node: ${node} ---`);
  const client = new Client({ node });

  try {
    await client.info();

    // Get all indices
    const indicesResponse = await client.cat.indices({ format: 'json' });

    // Filter out system indices (starting with .)
    const indicesToDelete = indicesResponse
      .map((row: any) => row.index)
      .filter((index: string) => index && !index.startsWith('.'));

    if (indicesToDelete.length > 0) {
      console.log(`Deleting indices: ${indicesToDelete.join(', ')}`);
      await client.indices.delete({ index: indicesToDelete });
    } else {
      console.log('No user indices found to delete.');
    }

    // Also clear data streams if any exist (non-system)
    try {
      const dataStreamsResponse = await client.indices.getDataStream({ name: '*' });
      const dataStreamsToDelete = dataStreamsResponse.data_streams
        .map((ds: any) => ds.name)
        .filter((name: string) => !name.startsWith('.'));

      if (dataStreamsToDelete.length > 0) {
        console.log(`Deleting data streams: ${dataStreamsToDelete.join(', ')}`);
        for (const ds of dataStreamsToDelete) {
          await client.indices.deleteDataStream({ name: ds });
        }
      }
    } catch (dsError) {
      // getDataStream might 404 if no data streams exist or if not supported
      if (dsError.meta?.statusCode !== 404) {
        console.warn(`Note: Could not fetch data streams: ${dsError.message}`);
      }
    }

    console.log(`Successfully cleared ${node}!`);
  } catch (error) {
    console.error(`Could not clear node ${node}: ${error.message}`);
  }
}

async function clear() {
  for (const node of NODES) {
    await clearNode(node);
  }
}

clear().catch(console.error);
