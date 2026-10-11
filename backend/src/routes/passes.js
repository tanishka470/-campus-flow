import { Router } from 'express';
import { listActivePasses } from '../services/accessService.js';

const router = Router();

router.get('/active', (_req, res) => {
  res.json(listActivePasses());
});

export default router;
