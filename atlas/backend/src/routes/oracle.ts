import { Router } from 'express';
import { SubgraphService } from '../services/subgraph.js';
import { logger } from '../utils/logger.js';

export function oracleRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();

  // Get latest EII reading for bioregion
  router.get('/eii/:bioregionId/latest', async (req, res) => {
    try {
      const reading = await subgraph.getLatestEII(req.params.bioregionId);
      if (!reading) {
        return res.status(404).json({ error: 'No EII data found' });
      }
      res.json({ reading });
    } catch (err) {
      logger.error(err, 'Failed to fetch latest EII');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get EII history for bioregion
  router.get('/eii/:bioregionId/history', async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const history = await subgraph.getEIIHistory(
        req.params.bioregionId,
        Number(limit),
        Number(offset)
      );
      res.json({ history });
    } catch (err) {
      logger.error(err, 'Failed to fetch EII history');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get EII delta between epochs
  router.get('/eii/:bioregionId/delta', async (req, res) => {
    try {
      const { fromEpoch, toEpoch } = req.query;
      if (!fromEpoch || !toEpoch) {
        return res.status(400).json({ error: 'fromEpoch and toEpoch required' });
      }
      const delta = await subgraph.getEIIDelta(
        req.params.bioregionId,
        Number(fromEpoch),
        Number(toEpoch)
      );
      res.json({ delta });
    } catch (err) {
      logger.error(err, 'Failed to fetch EII delta');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get pillar breakdown for bioregion
  router.get('/eii/:bioregionId/pillars', async (req, res) => {
    try {
      const pillars = await subgraph.getEIIPillars(req.params.bioregionId);
      res.json({ pillars });
    } catch (err) {
      logger.error(err, 'Failed to fetch EII pillars');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all bioregions ranked by EII
  router.get('/rankings', async (req, res) => {
    try {
      const rankings = await subgraph.getEIIRankings();
      res.json({ rankings });
    } catch (err) {
      logger.error(err, 'Failed to fetch EII rankings');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
