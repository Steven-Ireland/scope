import { Client } from '@elastic/elasticsearch-8';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export default esClient;
