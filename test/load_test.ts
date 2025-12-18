import { ordersService } from '../src/modules/orders/orders.service';
import { orderRepository } from '../src/modules/orders/repository/order.repository';
import { OrderStatus } from '../src/modules/orders/order.types';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

async function submitOrder(idx: number) {
    const start = Date.now();
    try {
        const { orderId } = await ordersService.submitMarketOrder({
            tokenIn: SOL,
            tokenOut: USDC,
            amountIn: 100_000_000,
            slippageBps: 50
        });
        const duration = Date.now() - start;
        return { idx, orderId, duration, success: true };
    } catch (err: any) {
        return { idx, error: err.message, duration: Date.now() - start, success: false };
    }
}

async function runConcurrencyTest() {
    console.log('\n--- Scenario A: 10 Concurrent Users ---');
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(submitOrder(i));
    }

    const results = await Promise.all(promises);

    const successful = results.filter(r => r.success);
    const avgTime = results.reduce((acc, r) => acc + r.duration, 0) / results.length;

    console.log(`Submitted: ${results.length}`);
    console.log(`Success: ${successful.length}`);
    console.log(`Avg Submission Time: ${avgTime.toFixed(2)}ms`);
}

async function runRateLimitTest() {
    console.log('\n--- Scenario B: 100 Requests / Minute ---');
    console.log('Target: ~1.67 requests/sec. Running for 1 minute (simulation: 20 orders only to save time if desired? user said 100 req/min)');
    // We will do a burst of 100 requests spread over 60 seconds? Or just 100 requests as fast as possible?
    // "100 request / minute" usually implies a rate limit or a sustained load.
    // I will try to submit 100 orders with a small delay to simulate the rate, or just blast them and measure if we *can* handle 100/min (which is very low).
    // 100/min is only 1.6/sec. Node should handle this easily.
    // I will simply submit 100 orders sequentially with appropriate delay to match the rate, OR submit them all and verify system handled it.
    // "Can you do that" implies testing capability.

    // Changing approach: Blast 100 requests and measure total time. If < 60s, we easily meet the requirement.

    console.log('Sending 100 requests immediately to test throughput capability...');
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 100; i++) {
        promises.push(submitOrder(i));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;

    const successful = results.filter(r => r.success);
    console.log(`Processed 100 requests in: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`Effective Rate: ${((100 / totalTime) * 1000 * 60).toFixed(0)} req/min`);
    console.log(`Success: ${successful.length}/100`);
}

async function main() {
    await runConcurrencyTest();
    await runRateLimitTest();
    process.exit(0);
}

main().catch(console.error);
