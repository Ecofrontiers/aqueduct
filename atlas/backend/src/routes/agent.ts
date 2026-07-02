import { Router } from 'express';
import { z } from 'zod';
import { SubgraphService } from '../services/subgraph.js';
import { IPFSService } from '../services/ipfs.js';
import { logger } from '../utils/logger.js';

const registerAgentSchema = z.object({
  agentType: z.enum(['species', 'ecosystem', 'initiative', 'operator']),
  name: z.string().min(1).max(100),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function agentRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();
  const ipfs = new IPFSService();

  // List agents
  router.get('/', async (req, res) => {
    try {
      const {
        bioregionId,
        agentType,
        active,
        limit = 50,
        offset = 0,
      } = req.query;

      const agents = await subgraph.getAgents({
        bioregionId: bioregionId as string,
        agentType: agentType as string,
        active: active === 'true',
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({ agents });
    } catch (err) {
      logger.error(err, 'Failed to fetch agents');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent by address
  router.get('/:address', async (req, res) => {
    try {
      const agent = await subgraph.getAgent(req.params.address);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ agent });
    } catch (err) {
      logger.error(err, 'Failed to fetch agent');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Prepare agent card (upload to IPFS)
  router.post('/prepare-card', async (req, res) => {
    try {
      const data = registerAgentSchema.parse(req.body);

      const cardHash = await ipfs.add({
        agentType: data.agentType,
        name: data.name,
        capabilities: data.capabilities || [],
        metadata: data.metadata || {},
        createdAt: Date.now(),
      });

      res.json({
        cardHash,
        message: 'Agent card ready for onchain registration',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: err.errors });
      }
      logger.error(err, 'Failed to prepare agent card');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent bounties
  router.get('/:address/bounties', async (req, res) => {
    try {
      const { status } = req.query;
      const bounties = await subgraph.getAgentBounties(
        req.params.address,
        status as string
      );
      res.json({ bounties });
    } catch (err) {
      logger.error(err, 'Failed to fetch agent bounties');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent tournament history
  router.get('/:address/tournaments', async (req, res) => {
    try {
      const tournaments = await subgraph.getAgentTournaments(req.params.address);
      res.json({ tournaments });
    } catch (err) {
      logger.error(err, 'Failed to fetch agent tournaments');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent earnings
  router.get('/:address/earnings', async (req, res) => {
    try {
      const earnings = await subgraph.getAgentEarnings(req.params.address);
      res.json({ earnings });
    } catch (err) {
      logger.error(err, 'Failed to fetch agent earnings');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
