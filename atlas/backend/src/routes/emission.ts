import { Router } from 'express';
import { SubgraphService } from '../services/subgraph.js';
import { logger } from '../utils/logger.js';

export function emissionRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();

  // Get emissions for a bioregion
  router.get('/bioregion/:bioregionId', async (req, res) => {
    try {
      const { limit = 30, offset = 0 } = req.query;
      const emissions = await subgraph.getEmissions(
        req.params.bioregionId,
        Number(limit),
        Number(offset)
      );
      res.json({ emissions });
    } catch (err) {
      logger.error(err, 'Failed to fetch emissions');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get specific epoch emission
  router.get('/bioregion/:bioregionId/epoch/:epoch', async (req, res) => {
    try {
      const emission = await subgraph.getEpochEmission(
        req.params.bioregionId,
        req.params.epoch
      );
      if (!emission) {
        return res.status(404).json({ error: 'Emission not found' });
      }
      res.json({ emission });
    } catch (err) {
      logger.error(err, 'Failed to fetch epoch emission');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get pending claims for an address
  router.get('/claims/:address', async (req, res) => {
    try {
      const { bioregionId } = req.query;
      const claims = await subgraph.getPendingClaims(
        req.params.address,
        bioregionId as string
      );
      res.json({ claims });
    } catch (err) {
      logger.error(err, 'Failed to fetch pending claims');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get emission stats
  router.get('/stats', async (req, res) => {
    try {
      const { bioregionId } = req.query;
      const stats = await subgraph.getEmissionStats(bioregionId as string);
      res.json({ stats });
    } catch (err) {
      logger.error(err, 'Failed to fetch emission stats');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
