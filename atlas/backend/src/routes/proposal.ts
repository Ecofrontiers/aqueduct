import { Router } from 'express';
import { z } from 'zod';
import { SubgraphService } from '../services/subgraph.js';
import { IPFSService } from '../services/ipfs.js';
import { logger } from '../utils/logger.js';

const createProposalSchema = z.object({
  bioregionId: z.string(),
  targetPillar: z.number().min(0).max(2),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().optional(),
  stakeAmount: z.string(),
});

export function proposalRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();
  const ipfs = new IPFSService();

  // List proposals
  router.get('/', async (req, res) => {
    try {
      const {
        bioregionId,
        status,
        submitter,
        limit = 20,
        offset = 0,
      } = req.query;

      const proposals = await subgraph.getProposals({
        bioregionId: bioregionId as string,
        status: status as string,
        submitter: submitter as string,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({ proposals });
    } catch (err) {
      logger.error(err, 'Failed to fetch proposals');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get proposal by ID
  router.get('/:bioregionId/:proposalId', async (req, res) => {
    try {
      const { bioregionId, proposalId } = req.params;
      const proposal = await subgraph.getProposal(bioregionId, proposalId);

      if (!proposal) {
        return res.status(404).json({ error: 'Proposal not found' });
      }

      // Fetch description from IPFS if available
      if (proposal.descriptionHash) {
        try {
          const description = await ipfs.get(proposal.descriptionHash);
          proposal.description = description;
        } catch {
          logger.warn('Failed to fetch proposal description from IPFS');
        }
      }

      res.json({ proposal });
    } catch (err) {
      logger.error(err, 'Failed to fetch proposal');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Prepare proposal (upload to IPFS, return hash for onchain submission)
  router.post('/prepare', async (req, res) => {
    try {
      const data = createProposalSchema.parse(req.body);

      // Upload description to IPFS
      const descriptionHash = await ipfs.add({
        title: data.title,
        description: data.description,
        createdAt: Date.now(),
      });

      // Upload location proof if provided
      let locationProofHash: string | undefined;
      if (data.latitude && data.longitude) {
        locationProofHash = await ipfs.add({
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius || 1000,
          timestamp: Date.now(),
        });
      }

      res.json({
        descriptionHash,
        locationProofHash,
        message: 'Ready for onchain submission',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request', details: err.errors });
      }
      logger.error(err, 'Failed to prepare proposal');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get proposal funders
  router.get('/:bioregionId/:proposalId/funders', async (req, res) => {
    try {
      const { bioregionId, proposalId } = req.params;
      const funders = await subgraph.getProposalFunders(bioregionId, proposalId);
      res.json({ funders });
    } catch (err) {
      logger.error(err, 'Failed to fetch proposal funders');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
