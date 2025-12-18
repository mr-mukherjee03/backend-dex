# Order Execution Engine

## Overview
A high-performance order execution engine built for Solana DEXs. It routes orders to the best liquidity pool (Raydium or Meteora) and executes them using a scalable, asynchronous architecture.

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
    git clone https://github.com/mr-mukherjee03/backend-dex.git
    cd backend-dex
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

# System Architecture

## Overview
The DEX Aggregator is designed as a high-performance, fault-tolerant system for executing token swaps on the Solana blockchain. It employs an asynchronous architecture to handle order processing reliability and implements a "Hybrid" execution model to seamless support both Mainnet (real liquidity) and Devnet (sparse liquidity/mocking) environments.

## High-Level Architecture

```mermaid
graph TD
    Client[Client / Web UI] -->|HTTP Request| API[API Server]
    
    subgraph "Service Layer"
        API -->|Create Order| OrdersService
        OrdersService -->|Persist| DB[(PostgreSQL)]
        OrdersService -->|Enqueue| Queue[Redis / BullMQ]
    end
    
    subgraph "Execution Layer"
        Queue -->|Consume| Worker[Order Worker]
        Worker -->|Fetch Quote| DexAggregator
    end
    
    subgraph "DEX Integration"
        DexAggregator -->|Pool Discovery| RaydiumAdapter
        DexAggregator -->|Pool Discovery| MeteoraAdapter
        RaydiumAdapter -->|SDK/RPC| Solana[Solana Blockchain]
        MeteoraAdapter -->|SDK/RPC| Solana
    end
```

## Component Details

### 1. API & Service Layer
-   **API Server**: Handles incoming HTTP requests for quotes and order creation.
-   **OrdersService**: Manages the lifecycle of an order. It validates requests, persists the initial order state to the database, and dispatches the job to the processing queue.
-   **Database**: PostgreSQL (via Prisma) serves as the persistent store for order history and status.

### 2. Async Execution (BullMQ & Redis)
-   Orders are not executed synchronously during the HTTP request. Instead, they are pushed to a Redis-backed queue.
-   This design ensures:
    -   **Resilience**: If the execution worker crashes, the job remains in the queue.
    -   **Scalability**: Multiple workers can consume from the queue to handle high load.
    -   **Non-blocking UI**: The user gets an immediate confirmation that the order was received.

### 3. DEX Aggregator
-   **Responsibility**: The [DexAggregator](file:///src/modules/dex/dex.aggregator.ts#5-99) acts as a facade over individual DEX adapters. It queries all available sources in parallel to find the best price.
-   **Caching**: Implements a short-lived (5000ms) in-memory cache for Quote Results.
    -   *Note*: Pool discovery is strictly not cached directly; however, because the quote cache is keyed by [(tokenIn, tokenOut, amountIn)](file:///src/modules/dex/adapters/meteora.ts#60-134), repeated requests for the same parameters effectively skip the expensive discovery step.

### 4. DEX Adapters (Raydium & Meteora)
-   **RaydiumAdapter**: Integrates with Raydium V2 SDK (CPMM).
-   **MeteoraAdapter**: Integrates with Meteora DLMM and Dynamic AMM SDKs.
-   **Hybrid Mode**: Both adapters feature a "Hybrid" logic:
    -   **Real Execution**: Attempts to use real on-chain pools and SDKs first.
    -   **Mock Fallback**: If on-chain discovery fails (common on Devnet due to low liquidity) or if specifically configured, it falls back to hardcoded mock pools and simulated quotes. This ensures the development flow is never blocked by external network conditions.

## Design Decisions

### Asynchronous Order Processing
**Decision**: Decoupling order ingestion from execution.<br>
**Reasoning**: Solana transactions can take several seconds to confirm. Keeping an HTTP connection open for this duration is brittle. An async queue allows the server to handle thousands of concurrent requests while workers process the heavy lifting of signing and confirming transactions at a controlled rate.

### Hybrid Devnet/Mainnet Support
**Decision**: Integrating "Mock" logic directly into the Adapters.<br>
**Reasoning**: Developing against Mainnet is expensive and risky. Developing against Devnet is frustrating due to broken pools and lack of liquidity. The Hybrid approach allows the system to behave *exactly* like production when possible, but seamlessly degrade to a simulation when necessary, allowing for uninterrupted UI and flow testing.

### In-Memory Quote Caching
**Decision**: Caching `QuoteResult` for 5 seconds.<br>**Reasoning**: RPC calls to fetch pool states are expensive and rate-limited. In a high-traffic scenario, multiple users (or the same user polling) might request the same quote repeatedly. A short TTL cache protects the RPC endpoints without serving significantly stale prices.

## Fault Tolerance

-   **Queue Retries**: BullMQ is configured to handle job failures. If a worker fails to process an order (e.g., network blip), the job can be retried automatically.
-   **Discovery Fallback**: If one DEX fails to load, the Aggregator continues with the results from the others.
-   **Mock Safety Net**: The system is designed to "fail open" to a mock state in non-production environments, ensuring that a demo or test run rarely crashes completely.

### 5. Configuration Management (New)
-   **Centralized Config**: A dedicated `src/config/index.ts` module handles all environment variable loading and validation.
-   **Type Safety**: Ensures that variables like `REDIS_URL` and `RPC_URLS` are present and correctly typed before the application starts, preventing runtime crashes due to potential misconfiguration.

## Verification Status
-   **Load Testing**: Validated with 10 concurrent users and 100 requests/minute throughput (0% failure rate).
-   **Full Flow**: Confirmed end-to-end execution from API -> Queue -> Worker -> Raydium/Meteora -> Real Devnet Transaction (Proof-of-Life).

### Results
Ran `npx ts-node test/load_test.ts`.

#### Scenario A: 10 Concurrent Users
-   **Method**: 10 [submitMarketOrder](file:///c:/ASSIGNMENT/Eterna/src/modules/orders/orders.service.ts#9-28) calls fired in parallel (`Promise.all`).
-   **Result**: 10/10 Success.
-   **Latency**: Average ~322ms per request (includes initial DB connection overhead).

#### Scenario B: 100 Requests / Minute
-   **Method**: 100 requests fired in a burst to measure peak throughput capability.
-   **Result**: Processed 100 requests in **0.20 seconds**.
-   **Effective Rate**: ~30,000 requests/minute.
-   **Conclusion**: System easily handles the requirement of 100 req/min.

> Note: These tests measure the **Submission Throughput** (API -> DB -> Queue). The background worker processes these asynchronously. Given the queue architecture, high submission throughput is expected and handled correctly.

