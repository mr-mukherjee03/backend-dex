# Fix Order Type Definition & Browser Demo & Load Testing - Walkthrough

## QuotedAmountOut Type Fix
I regenerated the Prisma client to sync the generated TypeScript types with the [prisma/schema.prisma](file:///c:/ASSIGNMENT/Eterna/prisma/schema.prisma) file.
The [schema.prisma](file:///c:/ASSIGNMENT/Eterna/prisma/schema.prisma) already contained the `quotedAmountOut` field, but the generated client in `node_modules` was outdated.

## Browser Demo
I created a web server script [scripts/web_demo.ts](file:///c:/ASSIGNMENT/Eterna/scripts/web_demo.ts) that allows you to inspect the order flow directly in Chrome.

### How to Run
1.  **Open Browser**: Go to [http://localhost:3004](http://localhost:3004).
2.  **Inspect**: Press `F12` (or Right Click -> Inspect) and go to the **Console** tab.
3.  **Run**: Click the **Start New Order** button on the page.

## Load Testing
I created a load test script [test/load_test.ts](file:///c:/ASSIGNMENT/Eterna/test/load_test.ts) to verify performance requirements.

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
