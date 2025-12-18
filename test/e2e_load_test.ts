import { ordersService } from '../src/modules/orders/orders.service';
import IORedis from 'ioredis';
import { orderEventChannel } from '../src/infra/redis/redis.pubsub';

const SOL = 'So11111111111111111111111111111111111111112';
const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

const redisSub = new IORedis(process.env.REDIS_URL!);

async function runE2ETest(count: number, label: string) {
    console.log(`\n--- Starting E2E Test: ${label} (${count} orders) ---`);
    console.log('Connecting to Redis Order Events...');

    // TRACKING
    const pendingOrders = new Map<string, number>(); // ID -> StartTime
    const latencyStats: number[] = [];
    const completedSet = new Set<string>();

    // SUBSCRIBE (Pattern to catch all order events)
    // Actually our pubsub helper uses specific channels "order-events:{id}"
    // So we should use psubscribe 'order-events:*'
    await redisSub.psubscribe('order-events:*');

    return new Promise<void>((resolve) => {

        redisSub.on('pmessage', (_pattern, _channel, message) => {
            const event = JSON.parse(message);

            if (event.status === 'confirmed' || event.status === 'failed') {
                if (pendingOrders.has(event.orderId)) {
                    const duration = Date.now() - pendingOrders.get(event.orderId)!;
                    latencyStats.push(duration);
                    pendingOrders.delete(event.orderId);
                    completedSet.add(event.orderId);

                    // console.log(`[${completedSet.size}/${count}] Order ${event.orderId} finished in ${duration}ms`);

                    if (completedSet.size === count) {
                        finish();
                    }
                }
            }
        });

        async function submitOrders() {
            const promises = [];
            const startTime = Date.now();

            for (let i = 0; i < count; i++) {
                // Add minor delay for "Rate Limit" scenario if needed, 
                // but for now we just blast them to test max E2E throughput
                const p = ordersService.submitMarketOrder({
                    tokenIn: SOL,
                    tokenOut: USDC,
                    amountIn: 100_000_000,
                    slippageBps: 50
                }).then(({ orderId }) => {
                    pendingOrders.set(orderId, Date.now());
                }).catch(err => console.error(err));

                promises.push(p);
            }

            await Promise.all(promises);
            console.log(`All ${count} orders submitted in ${Date.now() - startTime}ms. Waiting for worker...`);
        }

        function finish() {
            const avg = latencyStats.reduce((a, b) => a + b, 0) / latencyStats.length;
            const min = Math.min(...latencyStats);
            const max = Math.max(...latencyStats);

            console.log(`\n--- Results: ${label} ---`);
            console.log(`Total Orders: ${count}`);
            console.log(`E2E Latency (Avg): ${avg.toFixed(2)}ms`);
            console.log(`E2E Latency (Min): ${min}ms`);
            console.log(`E2E Latency (Max): ${max}ms`);

            redisSub.disconnect();
            resolve();
        }

        submitOrders();
    });
}

async function main() {
    // 1. Warmup / Concurrency
    await runE2ETest(10, 'Concurrency (10 Users)');

    // 2. Throughput batch
    // await runE2ETest(50, 'Throughput Batch'); 

    process.exit(0);
}

main().catch(console.error);
