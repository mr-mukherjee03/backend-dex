import { RaydiumAdapter } from '../../src/modules/dex/adapters/raydium';
import { MeteoraAdapter } from '../../src/modules/dex/adapters/meteora';
import { LiquidityPool, QuoteResult } from '../../src/modules/dex/interfaces/dex.interface';

export class MockRaydium extends RaydiumAdapter {
    async findPools(): Promise<LiquidityPool[]> {
        return [{ dex: 'raydium', poolId: 'r1', tokenA: 'A', tokenB: 'B', liquidity: 100, feeBps: 10 }];
    }
    async quote(): Promise<QuoteResult> {
        return { dex: 'raydium', poolId: 'r1', amountOut: 100, priceImpactBps: 10, feeBps: 10 };
    }
}

export class MockMeteora extends MeteoraAdapter {
    async findPools(): Promise<LiquidityPool[]> {
        return [{ dex: 'meteora', poolId: 'm1', tokenA: 'A', tokenB: 'B', liquidity: 100, feeBps: 10 }];
    }
    async quote(): Promise<QuoteResult> {
        return { dex: 'meteora', poolId: 'm1', amountOut: 200, priceImpactBps: 10, feeBps: 10 };
    }
}
