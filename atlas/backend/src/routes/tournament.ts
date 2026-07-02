import { Router } from 'express';
import { SubgraphService } from '../services/subgraph.js';
import { logger } from '../utils/logger.js';

export function tournamentRoutes(): Router {
  const router = Router();
  const subgraph = new SubgraphService();

  // List tournaments
  router.get('/', async (req, res) => {
    try {
      const {
        status,
        bioregionId,
        limit = 20,
        offset = 0,
      } = req.query;

      const tournaments = await subgraph.getTournaments({
        status: status as string,
        bioregionId: bioregionId as string,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({ tournaments });
    } catch (err) {
      logger.error(err, 'Failed to fetch tournaments');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get tournament by ID
  router.get('/:id', async (req, res) => {
    try {
      const tournament = await subgraph.getTournament(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json({ tournament });
    } catch (err) {
      logger.error(err, 'Failed to fetch tournament');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get tournament standings
  router.get('/:id/standings', async (req, res) => {
    try {
      const standings = await subgraph.getTournamentStandings(req.params.id);
      res.json({ standings });
    } catch (err) {
      logger.error(err, 'Failed to fetch tournament standings');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get active tournaments for a bioregion
  router.get('/bioregion/:bioregionId/active', async (req, res) => {
    try {
      const tournaments = await subgraph.getActiveTournamentsForBioregion(
        req.params.bioregionId
      );
      res.json({ tournaments });
    } catch (err) {
      logger.error(err, 'Failed to fetch active tournaments');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
