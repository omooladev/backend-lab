# PostgreSQL Connection Pooling: First Principles & Lessons Learned

This document breaks down the core mental models while exploring PostgreSQL connections in Node.js.

---

## 1. What is a Database Connection Under the Hood?

At the physical network layer, a database connection is not just an abstract object in JavaScript. It is a stateful **TCP/IP socket** between your Node.js application process and the PostgreSQL server process.

Every time a connection is established:
1. **TCP 3-Way Handshake**: SYN, SYN-ACK, ACK round trips occur over the network.
2. **TLS / SSL Negotiation**: If encrypted, cryptographic keys and certificates are exchanged.
3. **PostgreSQL Authentication**: The database validates user credentials, checks permissions, and forks/spawns an internal backend worker process in PostgreSQL dedicated solely to this connection.
4. **Memory Allocation**: PostgreSQL allocates dedicated session memory (such as `work_mem`) on the database server.

> **Takeaway:** Opening and closing a connection is **expensive** in both latency (network round-trips) and database server resources (CPU, RAM, process overhead).

---

## 2. PostgreSQL Wire Protocol is Half-Duplex (Sequential)

A PostgreSQL connection communicates sequentially: **one query at a time per TCP socket**.

- A single connection cannot pipeline and interleave multiple independent queries simultaneously.
- If you issue 3 queries over the exact same `Client` at once using `Promise.all()`:
  - Query 1 is sent and executed.
  - Query 2 must wait in an in-memory queue inside the Node driver until Query 1 completes and returns results.
  - Query 3 must wait until Query 2 completes.
- **Observed Behavior (`client.js`)**: 
  - 3 queries with `pg_sleep(1)` take **~3.0 seconds** in total:
    $$\text{Time} = 1s + 1s + 1s = 3s$$

```
Client (1 TCP Socket):
[Query 1 (1s)] ───► [Query 2 (1s)] ───► [Query 3 (1s)]  ===> Total: ~3 seconds
```

---

## 3. How Connection Pooling Works (`pg.Pool`)

Instead of opening a new TCP connection on every query or bottlenecking everything through one single connection, a **Connection Pool** maintains a cache of warm, pre-established connections.

### Key Characteristics:
1. **Pre-warmed Connections**: Reuses existing TCP sockets rather than paying the connection handshake penalty repeatedly.
2. **Concurrency (`max` parameter)**: The pool manages up to `max` connections (e.g., `max: 3`).
3. **Multiplexing across Clients**: When 3 queries arrive simultaneously, the pool assigns each query to an idle connection in parallel.
4. **Observed Behavior (`pool.js`)**:
  - 3 queries with `pg_sleep(1)` run concurrently across 3 connections.
  - **Total execution time is ~1.0 second**, not 3 seconds.

```
Pool (max: 3 TCP Sockets):
Socket 1: [Query 1 (1s)] ──┐
Socket 2: [Query 2 (1s)] ──┼──► Completed in parallel ===> Total: ~1 second
Socket 3: [Query 3 (1s)] ──┘
```

---

## 4. Connection Lifecycle & Resource Leaks (`try / finally`)

A common pitfall in database programming is **connection leaking**.

### The Problem:
If your application connects to a database, runs business logic, and an error is thrown before calling `.end()` or releasing the connection, the connection can remain **dangling** or open in the background indefinitely.
- If repeated, you exhaust PostgreSQL's `max_connections` limit.
- Subsequent requests will fail with: `sorry, too many clients already`.

### The Solution: Guaranteed Cleanup
Always clean up your connections in a `finally` block:
```javascript
let connected = false;
try {
  await client.connect();
  connected = true;

  // Business logic / queries here
  await client.query('...');
} catch (error) {
  console.error('Operation failed:', error);
} finally {
  // Runs whether an error was thrown or not
  if (connected) {
    await client.end();
    console.log('Client connection closed');
  }
}
```

> **Note for `pool.connect()` vs `pool.query()`**:
> - `pool.query()` automatically checks out a connection, runs the query, and returns it back to the pool.
> - If you manually acquire a client via `const client = await pool.connect()`, you **must** call `client.release()` in a `finally` block to return it to the pool, otherwise the pool runs out of available slots.

---

## 5. Simulating Real-World Latency with `pg_sleep()`

In a local lab, queries like `SELECT 1` complete in sub-milliseconds (e.g., `0.5ms`), making concurrency differences hard to measure accurately.

- **PostgreSQL's `pg_sleep(seconds)`**:
  - Instructs the PostgreSQL server process to pause execution for a specific duration.
  - Simulates long-running work (e.g., heavy aggregations, external API calls, or disk I/O) without creating artificial load.
- By using `SELECT pg_sleep(1)`, we make query duration deterministic (exactly 1 second), clearly highlighting whether operations run in **series** (3s) or in **parallel** (1s).

---

## 6. Summary: When to Use `Client` vs `Pool`

| Criteria | `pg.Client` | `pg.Pool` |
| :--- | :--- | :--- |
| **Best For** | One-off CLI scripts, database migrations, dedicated LISTEN/NOTIFY listeners | Web servers (Express, Fastify, NestJS), microservices, concurrent APIs |
| **Concurrency** | 1 query at a time (sequential) | Multiple queries concurrently up to `max` |
| **Connection Overhead** | Connects on startup, terminates when done | Maintains warm connections, reuses sockets |
| **Disconnection Risk** | If connection drops, manual reconnect logic is needed | Pool automatically manages, removes, and replenishes dead connections |
