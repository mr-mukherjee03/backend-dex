import 'dotenv/config';

interface Config {
    PORT: number;
    REDIS_URL: string;
    RPC_URLS: string[];
    PRIVATE_KEY: string | undefined;

    // Dex Specific
    RAYDIUM_POOL_ID: string | undefined;
    DEVNET_MOCK_USDC_MINT: string | undefined;
    METEORA_POOL_ID: string | undefined;
}

const loadConfig = (): Config => {
    return {
        PORT: Number(process.env.PORT) || 3000,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        RPC_URLS: process.env.RPC_URLS
            ? process.env.RPC_URLS.split(',')
            : ['https://api.devnet.solana.com'],
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        RAYDIUM_POOL_ID: process.env.RAYDIUM_POOL_ID,
        DEVNET_MOCK_USDC_MINT: process.env.DEVNET_MOCK_USDC_MINT,
        METEORA_POOL_ID: process.env.METEORA_POOL_ID,
    };
};

export const config = loadConfig();

export const validateConfig = () => {
    const missing: string[] = [];

    if (!process.env.REDIS_URL) missing.push('REDIS_URL');
    // We don't strictly require PRIVATE_KEY, POOL_IDs etc for the app to start, 
    // as it might run in "simulation only" mode or fallback mode.
    // But strictly speaking, REDIS is infrastructure, so we probably need it.

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};
