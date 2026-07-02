/**
 * Virtuals Protocol Integration
 *
 * Connects to Virtuals Protocol's Agent Commerce Protocol (ACP) for
 * live agent data on Base chain.
 *
 * API Options:
 * 1. @virtuals-protocol/acp-node SDK - browseAgents() with wallet auth
 * 2. agent0-base-mainnet subgraph on The Graph
 * 3. Terminal API (requires API key from Configure Agent page)
 *
 * @see https://github.com/Virtual-Protocol/acp-node
 * @see https://whitepaper.virtuals.io/
 */

export * from './types';
export * from './client';
export { useVirtualsAgents } from './hooks';
