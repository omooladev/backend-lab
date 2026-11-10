import { Pool } from 'pg';
import { performance } from 'node:perf_hooks';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
});

export const testPgPool = async () => {
  try {
    console.log('Pool experiment started');

    const start = performance.now();

    const results = await Promise.all([
        pool.query('SELECT pg_sleep(1), 1 AS request'), 
        pool.query('SELECT pg_sleep(1), 2 AS request'), 
        pool.query('SELECT pg_sleep(1), 3 AS request')
    ]);

    const end = performance.now();

    console.log(
      'Results:',
      results.map((r) => r.rows),
    );

    console.log('Execution time:', ((end - start) / 1000).toFixed(2), 'seconds');
  } catch (error) {
    console.error('Pool experiment failed:', error);
  } finally {
    await pool.end();
    console.log('Pool connections closed');
  }
};

await testPgPool();
