import { Client } from 'pg';
import { performance } from 'node:perf_hooks';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export const testPgClient = async () => {
  let connected = false;

  try {
    console.log('Client experiment started');

    await client.connect();
    connected = true;

    console.log('Connected to PostgreSQL using Client');

    const start = performance.now();

    const results = await Promise.all([client.query('SELECT pg_sleep(1), 1 AS request'), client.query('SELECT pg_sleep(1), 2 AS request'), client.query('SELECT pg_sleep(1), 3 AS request')]);

    const end = performance.now();

    console.log(
      'Results:',
      results.map((r) => r.rows),
    );

    console.log('Execution time:', ((end - start) / 1000).toFixed(2), 'seconds');
  } catch (error) {
    console.error('Client experiment failed:', error);
  } finally {
    if (connected) {
      await client.end();
      console.log('Client connection closed');
    }
  }
};

await testPgClient();
