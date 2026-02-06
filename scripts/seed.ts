import { Client } from '@elastic/elasticsearch-8';
import { faker } from '@faker-js/faker';
import { subMinutes, subHours, subDays } from 'date-fns';

const NODES = [
  'http://localhost:9200',
  'http://localhost:9201'
];

const LOGS_INDEX = 'logs-events';
const METRICS_INDEX = 'metrics-data';
const LARGE_EVENTS_INDEX = 'large-events';

async function seedLargeEvents(client: Client) {
  if (await client.indices.exists({ index: LARGE_EVENTS_INDEX })) {
    console.log(`Deleting existing index: ${LARGE_EVENTS_INDEX}`);
    await client.indices.delete({ index: LARGE_EVENTS_INDEX });
  }

  console.log(`Creating index: ${LARGE_EVENTS_INDEX}`);
  await client.indices.create({
    index: LARGE_EVENTS_INDEX,
    body: {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          stack_trace: { type: 'text' },
          payload: { type: 'text' },
          service: { type: 'keyword' },
          'metadata.hostname': { type: 'keyword' },
          'metadata.version': { type: 'keyword' },
          ...Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`extra_field_${i + 1}`, { type: 'keyword' }])
          ),
        },
      },
    },
  });

  const levels = ['info', 'warn', 'error', 'fatal'];
  const services = ['order-processor', 'legacy-monolith', 'data-pipeline'];

  console.log(`Generating and indexing data for ${LARGE_EVENTS_INDEX}...`);
  const batchSize = 50;
  const totalRecords = 100;

  for (let i = 0; i < totalRecords / batchSize; i++) {
    const body = [];
    for (let j = 0; j < batchSize; j++) {
      const timestamp = faker.date.between({
        from: subDays(new Date(), 2),
        to: new Date(),
      });

      const stackTrace = `Error: Something went wrong\n    at Object.execute (/app/src/worker.js:42:12)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async Promise.all (index 0)\n    at /app/node_modules/scheduler/index.js:15:3\n    at InternalMethod.invoke (native)\n    at Context.runWith (/app/src/context.js:101:8)\n    at Finalizer.cleanup (/app/src/cleanup.js:12:4)\n    at ${faker.system.filePath()}:${faker.number.int({ min: 1, max: 1000 })}:${faker.number.int({ min: 1, max: 120 })}`;

      const largePayload = JSON.stringify({
        id: faker.string.uuid(),
        user: {
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          email: faker.internet.email(),
          address: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            country: faker.location.country(),
            zip: faker.location.zipCode(),
            geo: {
              lat: faker.location.latitude(),
              lng: faker.location.longitude()
            }
          }
        },
        items: Array.from({ length: 10 }, () => ({
          sku: faker.string.alphanumeric(10),
          quantity: faker.number.int({ min: 1, max: 10 }),
          price: faker.commerce.price(),
          description: faker.commerce.productDescription()
        })),
        metadata: {
          browser: faker.internet.userAgent(),
          ip: faker.internet.ip(),
          session_id: faker.string.alphanumeric(32)
        }
      }, null, 2);

      const extraFields = Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`extra_field_${i + 1}`, faker.word.sample()])
      );

      body.push({ index: { _index: LARGE_EVENTS_INDEX } });
      body.push({
        '@timestamp': timestamp.toISOString(),
        level: faker.helpers.arrayElement(levels),
        message: faker.hacker.phrase() + " " + faker.lorem.sentences(2),
        stack_trace: stackTrace,
        payload: largePayload,
        service: faker.helpers.arrayElement(services),
        'metadata.hostname': faker.system.networkInterface(),
        'metadata.version': `v${faker.system.semver()}`,
        ...extraFields,
      });
    }
    await client.bulk({ body });
  }
}

async function seedLogs(client: Client) {
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
          event_time: { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          service: { type: 'keyword' },
          user: { type: 'keyword' },
          response_time: { type: 'integer' },
          status_code: { type: 'integer' },
          transaction: {
            properties: {
              processor: {
                properties: {
                  name: { type: 'keyword' }
                }
              },
              amount: { type: 'float' }
            }
          }
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
      // event_time is now completely independent and can be from a wider range
      const eventTime = faker.date.between({
        from: subDays(new Date(), 30),
        to: new Date(),
      });

      body.push({ index: { _index: LOGS_INDEX } });
      body.push({
        '@timestamp': timestamp.toISOString(),
        event_time: eventTime.toISOString(),
        level: faker.helpers.arrayElement(levels),
        message: faker.hacker.phrase(),
        service: faker.helpers.arrayElement(services),
        user: faker.internet.username(),
        response_time: faker.number.int({ min: 10, max: 2000 }),
        status_code: faker.helpers.arrayElement([200, 201, 400, 401, 403, 404, 500]),
        transaction: {
          processor: {
            name: faker.helpers.arrayElement(['stripe', 'paypal', 'braintree', 'adyen']),
          },
          amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
        },
      });
    }
    await client.bulk({ body });
  }
}

async function seedMetrics(client: Client) {
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

async function seedDailyLogs(client: Client) {
  const levels = ['info', 'warn', 'error'];
  const services = ['api-gateway', 'user-service', 'auth-service'];

  for (let d = 0; d < 3; d++) {
    const date = subDays(new Date(), d);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');
    const indexName = `logs-${dateStr}`;

    if (await client.indices.exists({ index: indexName })) {
      console.log(`Deleting existing index: ${indexName}`);
      await client.indices.delete({ index: indexName });
    }

    console.log(`Creating daily index: ${indexName}`);
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            level: { type: 'keyword' },
            message: { type: 'text' },
            service: { type: 'keyword' },
          },
        },
      },
    });

    console.log(`Generating data for ${indexName}...`);
    const body = [];
    for (let j = 0; j < 50; j++) {
      const timestamp = faker.date.between({
        from: date,
        to: date,
      });

      body.push({ index: { _index: indexName } });
      body.push({
        '@timestamp': timestamp.toISOString(),
        level: faker.helpers.arrayElement(levels),
        message: faker.hacker.phrase(),
        service: faker.helpers.arrayElement(services),
      });
    }
    await client.bulk({ body });
  }
}

async function seed() {
  for (const node of NODES) {
    console.log(`\n--- Seeding node: ${node} ---`);
    const client = new Client({ node });

    try {
      await client.info();
      await seedLogs(client);
      await seedMetrics(client);
      await seedLargeEvents(client);
      await seedDailyLogs(client);
      console.log(`Seeding complete for ${node}!`);
    } catch (error) {
      console.error(`Could not seed node ${node}: ${error.message}`);
    }
  }
}

seed().catch(console.error);
