# Lessons Learned

Here are the key takeaways from building and running this connection pooling experiment:

---

### 1. `Client` executes queries one by one (Sequential)
- A `Client` is a single direct connection to PostgreSQL.
- Even if you send multiple queries at the exact same time using `Promise.all()`, they cannot run in parallel. They wait in line behind each other.
- **Result:** Running three 1-second queries through a single client takes **~3 seconds**.
- **When to use:** Good for one-off scripts, migrations, or simple CLI tasks where you only need to run a task and exit.

---

### 2. `Pool` executes queries in parallel (Concurrent)
- A `Pool` manages multiple connections at the same time (up to the `max` number you configure).
- When multiple requests come in simultaneously, the pool gives each request its own connection.
- **Result:** Running three 1-second queries through a pool takes **~1 second** because all 3 run at the same time.
- **When to use:** Best for web servers and APIs (like Express or NestJS) where many users hit endpoints at the same time.

---

### 3. Always clean up connections in `finally`
- If an error happens in your code after connecting to the database, your connection might stay open and get stuck ("dangling connection").
- Over time, abandoned connections will pile up and hit the database limit (`max_connections`), crashing the app.
- **Lesson:** Always use a `try ... finally` block so `client.end()` or `pool.end()` runs even when an error is thrown.

---

### 4. Using `pg_sleep()` to test real-world latency
- Local database queries are normally too fast to notice timing differences (taking less than 1 millisecond).
- Using PostgreSQL's built-in `SELECT pg_sleep(1)` forces the database to pause for 1 second.
- This made it very easy to prove whether queries were waiting in line (3s) or running together (1s).
