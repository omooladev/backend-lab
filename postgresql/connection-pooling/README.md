# PostgreSQL Connection Pooling vs Single Client

A simple, beginner-friendly lab project demonstrating the difference between using a **Single Client** (`pg.Client`) versus a **Connection Pool** (`pg.Pool`) in PostgreSQL using Node.js.

---

## 📌 What is this project about?

When communicating with a database in Node.js, you have two primary options:

1. **`Client`**: A single direct connection to PostgreSQL.
   - Executes queries sequentially (one at a time) over that connection.
   - If multiple asynchronous queries are sent at the same time, they must wait in line.
2. **`Pool`**: A collection of reusable connections kept open.
   - Can execute multiple queries in parallel across available connections.
   - In this demo, multiple simultaneous 1-second queries run in parallel, finishing much faster.

### The Experiment

Both scripts run 3 queries simultaneously using `Promise.all()`. Each query asks PostgreSQL to sleep for 1 second (`SELECT pg_sleep(1)`):

- **With `client.js`**: Takes **~3 seconds** because all 3 queries wait in line over a single connection.
- **With `pool.js`**: Takes **~1 second** because the pool allocates separate connections to run them concurrently.

---

## 🚀 How to Run

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 20+ recommended, as native `.env` loading is used)
- A running PostgreSQL database instance

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in this directory (you can copy `.env.example`):
```bash
cp .env.example .env
```
Fill in your database connection string in `.env`:
```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
```

### 4. Run the Scripts

#### Run the Single Client experiment:
```bash
npm run pg-client
```
> Watch the total execution time — it will take around **3 seconds**.

#### Run the Connection Pool experiment:
```bash
npm run pg-pool
```
> Watch the total execution time — it will finish in around **1 second**.
