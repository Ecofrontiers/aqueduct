import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.string().transform((s) => s.split(',')).default('http://localhost:3000'),

  // RPC
  rpcUrl: z.string().default('https://mainnet.base.org'),
  rpcUrlTestnet: z.string().default('https://sepolia.base.org'),

  // Subgraph
  subgraphUrl: z.string().default('http://localhost:8000/subgraphs/name/ecospatial-vault'),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),

  // IPFS
  ipfsUrl: z.string().default('http://localhost:5001'),
  ipfsGateway: z.string().default('https://ipfs.io/ipfs/'),

  // Keeper
  keeperEnabled: z.coerce.boolean().default(false),
  keeperPrivateKey: z.string().optional(),
  keeperInterval: z.coerce.number().default(60000), // 1 minute

  // Contract addresses (set after deployment)
  vaultAddress: z.string().optional(),
  oracleAddress: z.string().optional(),
  settlementAddress: z.string().optional(),
  emissionsAddress: z.string().optional(),
});

export const config = configSchema.parse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  corsOrigins: process.env.CORS_ORIGINS,
  rpcUrl: process.env.RPC_URL,
  rpcUrlTestnet: process.env.RPC_URL_TESTNET,
  subgraphUrl: process.env.SUBGRAPH_URL,
  redisUrl: process.env.REDIS_URL,
  ipfsUrl: process.env.IPFS_URL,
  ipfsGateway: process.env.IPFS_GATEWAY,
  keeperEnabled: process.env.KEEPER_ENABLED,
  keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY,
  keeperInterval: process.env.KEEPER_INTERVAL,
  vaultAddress: process.env.VAULT_ADDRESS,
  oracleAddress: process.env.ORACLE_ADDRESS,
  settlementAddress: process.env.SETTLEMENT_ADDRESS,
  emissionsAddress: process.env.EMISSIONS_ADDRESS,
});

export type Config = typeof config;
