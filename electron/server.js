const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');

const app = express();
app.use(cors());
app.use(express.json());

const getClient = (req) => {
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
    }
  };

  if (certPath && fs.existsSync(certPath)) {
    config.tls.cert = fs.readFileSync(certPath);
  }
  if (keyPath && fs.existsSync(keyPath)) {
    config.tls.key = fs.readFileSync(keyPath);
  }

  return new Client(config);
};

// Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { index, query, from, to, offset = 0, size = 50, sortField, sortOrder, includeHistogram } = req.body;
    
    if (!index) {
      return res.status(400).json({ error: 'Index is required' });
    }

    const esClient = getClient(req);

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

    const result = await esClient.search({
      index,
      from: offset,
      size,
      body,
    });
    res.json(result);
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get indices endpoint
app.get('/api/indices', async (req, res) => {
  try {
    const esClient = getClient(req);
    const indices = await esClient.cat.indices({ format: 'json' });
    res.json(indices.filter(index => !index.index?.startsWith('.')));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get fields endpoint
app.get('/api/fields', async (req, res) => {
  try {
    const { index } = req.query;
    const esClient = getClient(req);
    const response = await esClient.indices.getMapping({ index });
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
    const esClient = getClient(req);
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

    const response = await esClient.search({ index, body });
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
