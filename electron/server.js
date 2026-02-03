const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Client: Client8 } = require('@elastic/elasticsearch-8');
const { Client: Client7 } = require('@elastic/elasticsearch-7');
const { Client: Client9 } = require('@elastic/elasticsearch-9');
const { Agent } = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Cache for clients and their versions
const clientCache = new Map();

const normalizeResponse = (response) => {
  // ES7 client returns { body, statusCode, headers, warnings }
  // ES8 client returns the body directly
  if (response && typeof response === 'object' && response.body !== undefined && (response.statusCode !== undefined || response.headers !== undefined)) {
    return response.body;
  }
  return response;
};

const getClientConfig = (req) => {
  const url = req.headers['x-scope-url'] || process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  const username = req.headers['x-scope-username'];
  const password = req.headers['x-scope-password'];
  const certPath = req.headers['x-scope-cert'];
  const keyPath = req.headers['x-scope-key'];

  const config = {
    node: url,
    auth: (username && password) ? { username, password } : undefined,
    tls: { 
      rejectUnauthorized: false 
    },
    agent: new Agent({
      rejectUnauthorized: false
    })
  };

  if (certPath && fs.existsSync(certPath)) {
    config.tls.cert = fs.readFileSync(certPath);
  }
  if (keyPath && fs.existsSync(keyPath)) {
    config.tls.key = fs.readFileSync(keyPath);
  }

  return { config, url };
};

const getVersionedClient = async (req) => {
  const { config, url } = getClientConfig(req);
  
  if (clientCache.has(url)) {
    return clientCache.get(url).client;
  }

  const clientVersions = [
    { Client: Client7, version: 7 },
    { Client: Client8, version: 8 },
    { Client: Client9, version: 9 }
  ];

  for (const { Client, version: clientMajor } of clientVersions) {
    try {
      const tempClient = new Client(config);
      const info = normalizeResponse(await tempClient.info());
      const versionNum = info.version.number;
      const majorVersion = parseInt(versionNum.split('.')[0]);
      
      let client;
      switch (majorVersion) {
        case 7:
          client = new Client7(config);
          break;
        case 8:
          client = new Client8(config);
          break;
        case 9:
          client = new Client9(config);
          break;
        default:
          throw new Error(`Unknown client version: ${majorVersion}`);
      }

      clientCache.set(url, { client, version: versionNum, majorVersion });
      return client;
    } catch (error) {
      console.warn(`ES version detection attempt with Client${clientMajor} failed:`, error.message);
    }
  }

  throw new Error('Failed to connect to Elasticsearch');
};

// Verify server endpoint
app.get('/api/verify-server', async (req, res) => {
  const { url } = getClientConfig(req);
  try {
    // Clear cache to force re-detection on verify
    clientCache.delete(url);
    
    const client = await getVersionedClient(req);
    const cached = clientCache.get(url);
    
    const result = await client.info();
    const info = normalizeResponse(result);

    res.json({
      success: true,
      version: cached.version,
      majorVersion: cached.majorVersion,
      clusterName: info.cluster_name,
      name: info.name
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const getClient = async (req) => {
  return await getVersionedClient(req);
};

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { index, query, from, to, offset = 0, size = 50, sortField, sortOrder, includeHistogram } = req.body;
    
    if (!index) {
      return res.status(400).json({ error: 'Index is required' });
    }

    const esClient = await getClient(req);

    const must = [];
    if (from || to) {
      must.push({ range: { '@timestamp': { gte: from, lte: to } } });
    }
    if (query) {
      must.push({ query_string: { query: query, default_field: '*' } });
    }

    const sort = [];
    if (sortField) {
      sort.push({ [sortField]: { order: sortOrder || 'desc' } });
    } else {
      sort.push({ '@timestamp': { order: 'desc' } });
    }

    const body = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
        },
      },
      sort,
    };

    if (includeHistogram) {
      body.aggs = {
        histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 60,
          },
        },
      };
    }

    const response = await esClient.search({
      index,
      from: offset,
      size,
      body,
    });
    res.json(normalizeResponse(response));
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get indices endpoint
app.get('/api/indices', async (req, res) => {
  try {
    const esClient = await getClient(req);
    const result = await esClient.cat.indices({ format: 'json' });
    const indices = normalizeResponse(result);
    
    if (!Array.isArray(indices)) {
      console.error('Expected array of indices, got:', typeof indices, indices);
      return res.json([]);
    }
    
    res.json(indices.filter(index => !index.index?.startsWith('.')));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fields endpoint
app.get('/api/fields', async (req, res) => {
  try {
    const { index } = req.query;
    const esClient = await getClient(req);
    const result = await esClient.indices.getMapping({ index });
    const response = normalizeResponse(result);
    const allFields = [];
    
    const getFieldsRecursive = (properties, prefix = '') => {
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
        getFieldsRecursive(indexData.mappings.properties);
      }
    });

    res.json(allFields.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get values endpoint
app.get('/api/values', async (req, res) => {
  try {
    const { index, field, query = '', type = '' } = req.query;
    const esClient = await getClient(req);
    const isNumeric = ['integer', 'long', 'float', 'double', 'short', 'byte', 'half_float', 'scaled_float'].includes(type);

    let include = undefined;
    if (!isNumeric && query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const result = await esClient.search({ index, body });
    const response = normalizeResponse(result);
    const topValues = response.aggregations.top_values;
    const buckets = topValues.buckets || [];
    let values = buckets.map((b) => (b.key_as_string || b.key));

    if (isNumeric) {
      if (query) values = values.filter(v => String(v).startsWith(query));
      values.sort((a, b) => Number(a) - Number(b));
    } else {
      values.sort((a, b) => String(a).localeCompare(String(b)));
    }
    res.json(values.slice(0, 20));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

module.exports = app;
