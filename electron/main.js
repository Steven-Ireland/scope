const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const serve = require('electron-serve');

const loadURL = serve({ directory: path.join(__dirname, '../out') });

const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#000000',
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:3000');
  } else {
    loadURL(win);
  }
}

// IPC Handlers
ipcMain.handle('search', async (event, params) => {
  const { index, query, from, to, offset = 0, size = 50, sortField, sortOrder } = params;
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
});

ipcMain.handle('get-indices', async () => {
  const indices = await esClient.cat.indices({ format: 'json' });
  return indices.filter(index => !index.index?.startsWith('.'));
});

ipcMain.handle('get-fields', async (event, index) => {
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
  return allFields.sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle('get-values', async (event, { index, field, query = '', type = '' }) => {
  const isNumeric = ['integer', 'long', 'float', 'double', 'short', 'byte', 'half_float', 'scaled_float'].includes(type);
  
  let include = undefined;
  if (!isNumeric && query) {
    // Escaping special regex characters safely
    const escaped = query.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    include = escaped + '.*';
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
  return values.slice(0, 20);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
