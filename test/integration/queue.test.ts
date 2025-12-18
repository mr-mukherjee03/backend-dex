import assert from 'assert';
import { ordersService } from '../../src/modules/orders/orders.service';
import { orderQueue } from '../../src/infra/queue/bullmq.client';
import { test } from '../utils/runner';

export async function runQueueTests() {
    console.log('\n--- Running Queue Tests ---');
    let passed = 0;

    if (await test('Queue: ordersService.submitMarketOrder adds job to queue', async () => {
        const spy = { called: false };
        const originalAdd = orderQueue.add;
        // @ts-ignore
        orderQueue.add = async () => { spy.called = true; return { id: 'job1' }; };

        await ordersService.submitMarketOrder({ tokenIn: 'A', tokenOut: 'B', amountIn: 1, slippageBps: 10 });
        assert.strictEqual(spy.called, true);

        orderQueue.add = originalAdd;
    })) passed++;

    return passed;
}
