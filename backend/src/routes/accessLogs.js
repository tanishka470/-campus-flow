import { Router } from 'express';
import { listRecentAccessLogs } from '../services/accessService.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = req.query.limit;
  res.json(listRecentAccessLogs(limit));
});

export default router;
