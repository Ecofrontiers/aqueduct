import { Router } from 'express';
import { SubgraphService } from '../services/subgraph.js';
import { logger } from '../utils/logger.js';

export function bioregionRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();

  // List all bioregions
  router.get('/', async (req, res) => {
    try {
      const bioregions = await subgraph.getBioregions();
      res.json({ bioregions });
    } catch (err) {
      logger.error(err, 'Failed to fetch bioregions');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get bioregion by ID
  router.get('/:id', async (req, res) => {
    try {
      const bioregion = await subgraph.getBioregion(req.params.id);
      if (!bioregion) {
        return res.status(404).json({ error: 'Bioregion not found' });
      }
      res.json({ bioregion });
    } catch (err) {
      logger.error(err, 'Failed to fetch bioregion');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get bioregion EII history
  router.get('/:id/eii-history', async (req, res) => {
    try {
      const { limit = 30, offset = 0 } = req.query;
      const history = await subgraph.getEIIHistory(
        req.params.id,
        Number(limit),
        Number(offset)
      );
      res.json({ history });
    } catch (err) {
      logger.error(err, 'Failed to fetch EII history');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get bioregion stats
  router.get('/:id/stats', async (req, res) => {
    try {
      const stats = await subgraph.getBioregionStats(req.params.id);
      res.json({ stats });
    } catch (err) {
      logger.error(err, 'Failed to fetch bioregion stats');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
