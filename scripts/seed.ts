import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { subMinutes, subHours, subDays } from 'date-fns';

const client = new Client({
  node: 'http://localhost:9200',
});

const LOGS_INDEX = 'logs-events';
const METRICS_INDEX = 'metrics-data';

async function seedLogs() {
  if (await client.indices.exists({ index: LOGS_INDEX })) {
    console.log(`Deleting existing index: ${LOGS_INDEX}`);
    await client.indices.delete({ index: LOGS_INDEX });
  }

  console.log(`Creating index: ${LOGS_INDEX}`);
  await client.indices.create({
    index: LOGS_INDEX,
    body: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          service: { type: 'keyword' },
          user: { type: 'keyword' },
          response_time: { type: 'integer' },
          status_code: { type: 'integer' },
        },
      },
    },
  });

  const levels = ['info', 'warn', 'error', 'debug'];
  const services = ['auth-service', 'payment-api', 'frontend-web', 'inventory-worker'];

  console.log(`Generating and indexing data for ${LOGS_INDEX}...`);
  const batchSize = 100;
  const totalRecords = 500;

  for (let i = 0; i < totalRecords / batchSize; i++) {
    const body = [];
    for (let j = 0; j < batchSize; j++) {
      const timestamp = faker.date.between({
        from: subDays(new Date(), 7),
        to: new Date(),
      });

      body.push({ index: { _index: LOGS_INDEX } });
      body.push({
        '@timestamp': timestamp.toISOString(),
        level: faker.helpers.arrayElement(levels),
        message: faker.hacker.phrase(),
        service: faker.helpers.arrayElement(services),
        user: faker.internet.username(),
        response_time: faker.number.int({ min: 10, max: 2000 }),
        status_code: faker.helpers.arrayElement([200, 201, 400, 401, 403, 404, 500]),
      });
    }
    await client.bulk({ body });
  }
}

async function seedMetrics() {
  if (await client.indices.exists({ index: METRICS_INDEX })) {
    console.log(`Deleting existing index: ${METRICS_INDEX}`);
    await client.indices.delete({ index: METRICS_INDEX });
  }

  console.log(`Creating index: ${METRICS_INDEX}`);
  await client.indices.create({
    index: METRICS_INDEX,
    body: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          metric_name: { type: 'keyword' },
          value: { type: 'float' },
          unit: { type: 'keyword' },
          host: { type: 'keyword' },
          region: { type: 'keyword' },
          tags: { type: 'keyword' }
        },
      },
    },
  });

  const metrics = ['cpu_usage', 'memory_usage', 'disk_io', 'network_in', 'network_out'];
  const hosts = ['ip-10-0-1-5', 'ip-10-0-1-12', 'ip-10-0-2-45', 'web-prod-01'];
  const regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1'];

  console.log(`Generating and indexing data for ${METRICS_INDEX}...`);
  const batchSize = 100;
  const totalRecords = 500;

  for (let i = 0; i < totalRecords / batchSize; i++) {
    const body = [];
    for (let j = 0; j < batchSize; j++) {
      const timestamp = faker.date.between({
        from: subDays(new Date(), 7),
        to: new Date(),
      });

      body.push({ index: { _index: METRICS_INDEX } });
      body.push({
        '@timestamp': timestamp.toISOString(),
        metric_name: faker.helpers.arrayElement(metrics),
        value: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        unit: 'percent',
        host: faker.helpers.arrayElement(hosts),
        region: faker.helpers.arrayElement(regions),
        tags: [faker.commerce.department(), faker.company.buzzNoun()]
      });
    }
    await client.bulk({ body });
  }
}

async function seed() {
  console.log('Checking connection to Elasticsearch...');
  let connected = false;
  let attempts = 0;
  while (!connected && attempts < 30) {
    try {
      await client.info();
      connected = true;
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  await seedLogs();
  await seedMetrics();
  console.log('Seeding complete!');
}

seed().catch(console.error);