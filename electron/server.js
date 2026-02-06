const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client: Client8 } = require('@elastic/elasticsearch-8');
const { Client: Client7 } = require('@elastic/elasticsearch-7');
const { Client: Client9 } = require('@elastic/elasticsearch-9');
const { Agent } = require('undici');

const app = express();
app.use(cors());
app.use(express.json());

// Path to the shared config file (matches electron/main.js)
const getContextPath = () => {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'scope');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA, 'scope');
  }
  return path.join(os.homedir(), '.config', 'scope');
};
const CONFIG_PATH = path.join(getContextPath(), 'config.json');

// Cache for clients and their versions: Map<serverId, { client, configHash, version, majorVersion }>
const clientCache = new Map();

const normalizeResponse = (response) => {
  // ES7 client returns { body, statusCode, headers, warnings }
  // ES8 client returns the body directly
  if (
    response &&
    typeof response === 'object' &&
    response.body !== undefined &&
    (response.statusCode !== undefined || response.headers !== undefined)
  ) {
    return response.body;
  }
  return response;
};

/**
 * Loads the server configuration from disk and finds the specific server.
 */
const getServerConfig = (serverId) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return data.servers.find((s) => s.id === serverId);
  } catch (e) {
    console.error('Failed to read config from disk:', e);
    return null;
  }
};

/**
 * Creates a hash of the connection settings to detect changes.
 */
const getConfigHash = (s) => {
  if (!s) return '';
  return `${s.url}|${s.username}|${s.password}|${s.certPath}|${s.keyPath}|${s.allowInsecureSSL}`;
};

const getClientConfig = (req) => {
  const serverId = req.headers['x-scope-server-id'];
  const server = getServerConfig(serverId);

  if (!server) {
    throw new Error(`Server config not found for ID: ${serverId}`);
  }

  const config = {
    node: server.url,
    auth: server.username && server.password ? { username: server.username, password: server.password } : undefined,
    ssl: {
      rejectUnauthorized: !server.allowInsecureSSL,
      cert: (server.certPath && fs.readFileSync(server.certPath)) || undefined,
      key: (server.keyPath && fs.readFileSync(server.keyPath)) || undefined,
      checkServerIdentity: server.allowInsecureSSL ? () => undefined : undefined,
    },
  };

  return { 
    config, 
    url: server.url, 
    serverId: server.id, 
    hash: getConfigHash(server),
    majorVersion: server.majorVersion
  };
};

const getVersionedClient = async (req) => {
  const { config, url, serverId, hash, majorVersion: hintMajorVersion } = getClientConfig(req);

  // If we have a cached client, check if it's still valid
  if (clientCache.has(serverId)) {
    const cached = clientCache.get(serverId);
    if (cached.configHash === hash) {
      // If we have a version hint, ensure it matches
      if (!hintMajorVersion || cached.majorVersion === hintMajorVersion) {
        return cached.client;
      }
    }
    // Config changed or version mismatch, remove old client
    clientCache.delete(serverId);
  }

  // Helper to create and verify a client
  const tryCreateClient = async (Client, major) => {
    const client = new Client(config);
    const info = normalizeResponse(await client.info());
    const versionNum = info.version.number;
    const detectedMajor = parseInt(versionNum.split('.')[0]);
    
    const entry = { client, configHash: hash, version: versionNum, majorVersion: detectedMajor };
    clientCache.set(serverId, entry);
    return client;
  };

  // 1. Try hinted version first
  if (hintMajorVersion) {
    try {
      const Client = { 7: Client7, 8: Client8, 9: Client9 }[hintMajorVersion];
      if (Client) return await tryCreateClient(Client, hintMajorVersion);
    } catch (e) {
      console.warn(`Hinted client v${hintMajorVersion} failed for ${url}, auto-detecting...`);
    }
  }

  // 2. Auto-detection loop
  const versions = [
    { Client: Client8, v: 8 },
    { Client: Client7, v: 7 },
    { Client: Client9, v: 9 },
  ];

  for (const { Client, v } of versions) {
    try {
      return await tryCreateClient(Client, v);
    } catch (e) {
      console.warn(`ES detection: v${v} failed for ${url}`);
    }
  }

  throw new Error(`Failed to connect to Elasticsearch at ${url}`);
};

// Verify server endpoint
app.get('/api/verify-server', async (req, res) => {
  const serverId = req.headers['x-scope-server-id'];
  try {
    // Force recreation on verify
    if (serverId) clientCache.delete(serverId);

    const client = await getVersionedClient(req);
    const cached = clientCache.get(serverId || 'default');

    const result = await client.info();
    const info = normalizeResponse(result);

    res.json({
      success: true,
      version: cached.version,
      majorVersion: cached.majorVersion,
      clusterName: info.cluster_name,
      name: info.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const getClient = async (req) => {
  return await getVersionedClient(req);
};

const getNiceInterval = (from, to, targetBuckets = 50) => {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const duration = Math.max(0, end - start);
  const ideal = duration / targetBuckets;

  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;

  const intervals = [
    { label: '10ms', value: 10 },
    { label: '100ms', value: 100 },
    { label: '1s', value: second },
    { label: '5s', value: 5 * second },
    { label: '15s', value: 15 * second },
    { label: '30s', value: 30 * second },
    { label: '1m', value: minute },
    { label: '5m', value: 5 * minute },
    { label: '15m', value: 15 * minute },
    { label: '30m', value: 30 * minute },
    { label: '1h', value: hour },
    { label: '3h', value: 3 * hour },
    { label: '6h', value: 6 * hour },
    { label: '12h', value: 12 * hour },
    { label: '1d', value: day },
    { label: '7d', value: 7 * day },
    { label: '30d', value: 30 * day },
  ];

  for (const interval of intervals) {
    if (interval.value >= ideal) {
      return interval.label;
    }
  }
  return '30d';
};

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const {
      index,
      query,
      from,
      to,
      offset = 0,
      size = 50,
      sortField,
      sortOrder,
      includeHistogram,
      timestampField,
    } = req.body;

    if (!index) {
      return res.status(400).json({ error: 'Index is required' });
    }

    const esClient = await getClient(req);

    const must = [];
    if (timestampField && (from || to)) {
      must.push({ range: { [timestampField]: { gte: from, lte: to } } });
    }
    if (query) {
      must.push({ query_string: { query: query, default_field: '*' } });
    }

    const sort = [];
    if (sortField) {
      sort.push({ [sortField]: { order: sortOrder || 'desc' } });
    } else if (timestampField) {
      sort.push({ [timestampField]: { order: 'desc' } });
    }

    const body = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
        },
      },
      sort,
    };

    if (includeHistogram && timestampField) {
      if (from && to) {
        const interval = getNiceInterval(from, to, 50);
        body.aggs = {
          histogram: {
            date_histogram: {
              field: timestampField,
              fixed_interval: interval,
              extended_bounds: {
                min: from,
                max: to,
              },
              min_doc_count: 0,
            },
          },
        };
      } else {
        body.aggs = {
          histogram: {
            auto_date_histogram: {
              field: timestampField,
              buckets: 60,
            },
          },
        };
      }
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

    res.json(indices.filter((index) => !index.index?.startsWith('.')));
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
    const fieldsMap = new Map();

    const getFieldsRecursive = (properties, prefix = '') => {
      if (!properties) return;
      for (const key in properties) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const property = properties[key];
        const type = property.type || 'object';

        // Only add leaf nodes (non-object types)
        if (type !== 'object' && !fieldsMap.has(fullPath)) {
          fieldsMap.set(fullPath, { name: fullPath, type });
        }

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

    // Final deduplication by name using a Set of strings for safety,
    // although Map should have handled it, this is more explicit.
    const seenNames = new Set();
    const allFields = [];

    Array.from(fieldsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((field) => {
        if (!seenNames.has(field.name)) {
          seenNames.add(field.name);
          allFields.push(field);
        }
      });

    res.json(allFields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get values endpoint
app.get('/api/values', async (req, res) => {
  try {
    const { index, field, query = '', type = '' } = req.query;
    const esClient = await getClient(req);
    const isNumeric = [
      'integer',
      'long',
      'float',
      'double',
      'short',
      'byte',
      'half_float',
      'scaled_float',
    ].includes(type);

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
            include,
          },
        },
      },
    };

    const result = await esClient.search({ index, body });
    const response = normalizeResponse(result);
    const topValues = response.aggregations.top_values;
    const buckets = topValues.buckets || [];
    let values = buckets.map((b) => b.key_as_string || b.key);

    if (isNumeric) {
      if (query) values = values.filter((v) => String(v).startsWith(query));
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
