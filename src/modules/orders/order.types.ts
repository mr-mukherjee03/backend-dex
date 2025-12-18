export enum OrderStatus {
    PENDING = 'pending',
    ROUTING = 'routing',
    QUOTED = 'quoted',
    BUILDING = 'building',
    SUBMITTED = 'submitted',
    CONFIRMED = 'confirmed',
    FAILED = 'failed',
}

export type OrderType = 'market';

export interface MarketOrderInput {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippageBps: number; // basis points, e.g. 50 = 0.5%
}
