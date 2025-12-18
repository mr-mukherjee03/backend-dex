# Eterna: Order Execution Engine

## Overview
Eterna is a high-performance order execution engine built for Solana DEXs. It routes orders to the best liquidity pool (Raydium or Meteora) and executes them using a scalable, asynchronous architecture.

## Architecture & Design Decisions
We chose **Market Orders** as the primary order type to focus on speed and immediate execution logic.

1.  **API Layer (Fastify)**: Handles high-throughput submission. Upgrades connection to WebSocket for real-time status updates (`pending` -> `routing` -> `confirmed`).
2.  **Queue (BullMQ + Redis)**: Decouples submission from execution. This allows the API to handle spikes (proved 100+ req/min) while workers process orders reliably with exponential backoff.
3.  **DEX Aggregator**: Queries Raydium (API/SDK) and Meteora (DLMM SDK) to find the best quote.
    *   *Note*: For Devnet, valid pools are scarce, so the system includes a smart "Mock Fallback" that simulates mainnet-like liquidity if devnet pools are empty.
4.  **Worker**: Processes orders from the queue, performs the swap, and publishes events via Redis Pub/Sub to the WebSocket.

## Tech Stack
*   **Runtime**: Node.js + TypeScript
*   **Server**: Fastify (HTTP + WebSocket)
*   **Queue**: BullMQ (Redis)
*   **Database**: PostgreSQL (Prisma ORM)
*   **Solana**: `@solana/web3.js`, `@raydium-io/raydium-sdk`, `@meteora-ag/dlmm`

## Setup Instructions

### Prerequisites
*   Node.js (v18+)
*   Redis (Local or Cloud)
*   PostgreSQL

### Installation
1.  Clone the repo:
    ```bash
    git clone <repo-url>
    cd eterna
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure Environment:
    Create `.env`:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/eterna"
    REDIS_URL="redis://localhost:6379"
    PORT=3000
    ```
4.  Initialize Database:
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```

## Running the Engine
1.  **Start the Server & Worker**:
    ```bash
    npm run dev
    # Or for the full demo flow
    npx ts-node scripts/demo_full_flow.ts
    ```

## Testing
We have included robust load testing scripts:
1.  **Browser Demo**:
    ```bash
    npx ts-node scripts/web_demo.ts
    ```
    Open `http://localhost:3004` to see orders flow visually.

2.  **Load Tests**:
    ```bash
    npx ts-node test/load_test.ts
    ```
    *   Verifies 10 Concurrent Users
    *   Verifies 100 Requests/Minute throughput

## Public Deployment
[Link to deployed instance]
