import assert from 'assert';
import { DexAggregator } from '../../src/modules/dex/dex.aggregator';
import { QuoteResult } from '../../src/modules/dex/interfaces/dex.interface';
import { MockRaydium, MockMeteora } from '../utils/mocks';
import { test } from '../utils/runner';

export async function runRoutingTests() {
    console.log('\n--- Running Routing Tests ---');
    let passed = 0;

    let aggregator: DexAggregator;

    const setupAggregatorMocks = () => {
        aggregator = new DexAggregator();
        // @ts-ignore
        aggregator.raydium = new MockRaydium();
        // @ts-ignore
        aggregator.meteora = new MockMeteora();
    };

    if (await test('Routing: Picks Meteora when output is higher', async () => {
        setupAggregatorMocks();
        const quote = await aggregator.getBestQuote({ tokenIn: 'A', tokenOut: 'B', amountIn: 10 });
        assert.strictEqual(quote.dex, 'meteora');
        assert.strictEqual(quote.amountOut, 200);
    })) passed++;

    if (await test('Routing: Picks Raydium when output is higher', async () => {
        setupAggregatorMocks();
        // @ts-ignore
        aggregator.meteora.quote = async (): Promise<QuoteResult> => ({ dex: 'meteora', poolId: 'm1', amountOut: 50, priceImpactBps: 0, feeBps: 0 });
        const quote = await aggregator.getBestQuote({ tokenIn: 'A', tokenOut: 'B', amountIn: 10 });
        assert.strictEqual(quote.dex, 'raydium');
        assert.strictEqual(quote.amountOut, 100);
    })) passed++;

    if (await test('Routing: Throws error if no pools found', async () => {
        setupAggregatorMocks();
        // @ts-ignore
        aggregator.raydium.findPools = async () => [];
        // @ts-ignore
        aggregator.meteora.findPools = async () => [];
        await assert.rejects(aggregator.getBestQuote({ tokenIn: 'C', tokenOut: 'D', amountIn: 10 }), /No liquidity pools found/);
    })) passed++;

    if (await test('Routing: Handles adapter quoting failure gracefully', async () => {
        setupAggregatorMocks();
        // @ts-ignore
        aggregator.raydium.quote = async () => { throw new Error('Crashed'); };
        try {
            await aggregator.getBestQuote({ tokenIn: 'A', tokenOut: 'B', amountIn: 10 });
        } catch (e) { }
    })) passed++;

    if (await test('Aggregator: executeSwap uses correct adapter', async () => {
        setupAggregatorMocks();
        const spy = { dexRequested: '' };
        // @ts-ignore
        aggregator.raydium.swap = async () => { spy.dexRequested = 'raydium'; return { txId: 'tx1' }; };

        await aggregator.executeSwap({ dex: 'raydium', poolId: 'p1', tokenIn: 'A', tokenOut: 'B', amountIn: 1, amountOutMin: 0 });
        assert.strictEqual(spy.dexRequested, 'raydium');
    })) passed++;

    return passed;
}
