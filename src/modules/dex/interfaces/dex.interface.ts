export interface LiquidityPool {
  dex: 'raydium' | 'meteora';
  poolId: string;
  tokenA: string;
  tokenB: string;
  liquidity: number;
  feeBps: number;
}

export interface QuoteResult {
  dex: 'raydium' | 'meteora';
  poolId: string;
  amountOut: number;
  priceImpactBps: number;
  feeBps: number;
}

export interface DexAdapter {
  readonly name: 'raydium' | 'meteora';

  findPools(params: {
    tokenA: string;
    tokenB: string;
  }): Promise<LiquidityPool[]>;

  quote(params: {
    pool: LiquidityPool;
    tokenIn: string;
    amountIn: number;
  }): Promise<QuoteResult>;

  swap(params: {
    pool: LiquidityPool;
    tokenIn: string;
    amountIn: number;
    amountOutMin: number;
  }): Promise<{ txId: string }>;
}
