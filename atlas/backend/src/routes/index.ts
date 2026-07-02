import { Router } from 'express';
import { bioregionRoutes } from './bioregion.js';
import { proposalRoutes } from './proposal.js';
import { agentRoutes } from './agent.js';
import { tournamentRoutes } from './tournament.js';
import { emissionRoutes } from './emission.js';
import { oracleRoutes } from './oracle.js';

export function createRoutes(): Router {
  const router = Router();

  router.use('/bioregions', bioregionRoutes());
  router.use('/proposals', proposalRoutes());
  router.use('/agents', agentRoutes());
  router.use('/tournaments', tournamentRoutes());
  router.use('/emissions', emissionRoutes());
  router.use('/oracle', oracleRoutes());

  return router;
}
