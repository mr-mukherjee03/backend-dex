import { RaydiumAdapter } from './adapters/raydium';
import { MeteoraAdapter } from './adapters/meteora';
import { LiquidityPool, QuoteResult } from './interfaces/dex.interface';

export class DexAggregator {
    private readonly raydium = new RaydiumAdapter();
    private readonly meteora = new MeteoraAdapter();

    private cache = new Map<string, { quote: QuoteResult, timestamp: number }>();
    private readonly CACHE_TTL = 5000;

    async getBestQuote(params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: number;
    }): Promise<QuoteResult> {
        const { tokenIn, tokenOut, amountIn } = params;
        const cacheKey = `${tokenIn}-${tokenOut}-${amountIn}`;

        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            console.log(`[DexAggregator] Cache Hit for ${cacheKey}`);
            return cached.quote;
        }

        console.log(`[DexAggregator] Cache Miss for ${cacheKey}`);
        const [raydiumPools, meteoraPools] = await Promise.all([
            this.raydium.findPools({
                tokenA: tokenIn,
                tokenB: tokenOut,
            }),
            this.meteora.findPools({
                tokenA: tokenIn,
                tokenB: tokenOut,
            }),
        ]);

        console.log(`Discovered pools: Raydium=${raydiumPools.length}, Meteora=${meteoraPools.length}`);
        const allPools: LiquidityPool[] = [...raydiumPools, ...meteoraPools];

        if (allPools.length === 0) {
            throw new Error('No liquidity pools found');
        }

        const quotes = await Promise.all(
            allPools.map(pool =>
                this.getAdapter(pool.dex).quote({
                    pool,
                    tokenIn,
                    amountIn,
                })
            )
        );

        const bestQuote = quotes.reduce((best, q) =>
            q.amountOut > best.amountOut ? q : best
        );
        this.cache.set(cacheKey, { quote: bestQuote, timestamp: Date.now() });

        return bestQuote;
    }

    private getAdapter(dex: LiquidityPool['dex']) {
        switch (dex) {
            case 'raydium':
                return this.raydium;
            case 'meteora':
                return this.meteora;
            default:
                throw new Error(`Unsupported dex ${dex}`);
        }
    }

    async executeSwap(params: {
        dex: 'raydium' | 'meteora';
        poolId: string;
        tokenIn: string;
        tokenOut: string;
        amountIn: number;
        amountOutMin: number;
    }): Promise<{ txId: string }> {
        const pool: LiquidityPool = {
            dex: params.dex,
            poolId: params.poolId,
            tokenA: params.tokenIn,
            tokenB: params.tokenOut,
            liquidity: 0,
            feeBps: 0
        };

        return this.getAdapter(params.dex).swap({
            pool,
            tokenIn: params.tokenIn,
            amountIn: params.amountIn,
            amountOutMin: params.amountOutMin
        });
    }
}

export const dexAggregator = new DexAggregator();
