import assert from 'assert';
import { Order } from '../../src/modules/orders/order.entity';
import { OrderStatus } from '../../src/modules/orders/order.types';
import { test } from '../utils/runner';

export async function runEntityTests() {
    console.log('\n--- Running Entity Tests ---');
    let passed = 0;

    if (await test('Queue: Order Entity handles status transitions', async () => {
        const order = new Order('123', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 50 });
        assert.strictEqual(order.status, OrderStatus.PENDING);
        order.transition(OrderStatus.ROUTING);
        assert.strictEqual(order.status, OrderStatus.ROUTING);
    })) passed++;

    if (await test('Queue: Order Entity validates slippage (Success)', async () => {
        const order = new Order('123', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 500 });
        order.acceptQuote({ amountOut: 100, dex: 'raydium', poolId: 'p1', priceImpactBps: 0, feeBps: 0 });
        order.validateSlippage(98);
    })) passed++;

    if (await test('Queue: Order Entity validates slippage (Failure)', async () => {
        const order = new Order('123', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 100 });
        order.acceptQuote({ amountOut: 100, dex: 'raydium', poolId: 'p1', priceImpactBps: 0, feeBps: 0 });
        assert.throws(() => order.validateSlippage(98.5), /Slippage exceeded/);
    })) passed++;

    if (await test('Entity: Correct mapping of domain fields', async () => {
        const order = new Order('id-repo-test', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 50 });
        order.dex = 'meteora';
        order.quotedAmountOut = 123;
        assert.strictEqual(order.dex, 'meteora');
        assert.strictEqual(order.quotedAmountOut, 123);
    })) passed++;

    if (await test('Lifecycle: Order transitions to CONFIRMED with txHash', async () => {
        const order = new Order('123', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 50 });
        order.markConfirmed('hash123');
        assert.strictEqual(order.status, OrderStatus.CONFIRMED);
        assert.strictEqual(order.txHash, 'hash123');
    })) passed++;

    if (await test('Lifecycle: Order transitions to FAILED with reason', async () => {
        const order = new Order('123', { tokenIn: 'A', tokenOut: 'B', amountIn: 100, slippageBps: 50 });
        order.markFailed('insufficient funds');
        assert.strictEqual(order.status, OrderStatus.FAILED);
        assert.strictEqual(order.failureReason, 'insufficient funds');
    })) passed++;

    return passed;
}
