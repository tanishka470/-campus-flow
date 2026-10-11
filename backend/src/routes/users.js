import { Router } from 'express';
import { getStore } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const { users } = getStore();
  res.json([...users].sort((a, b) => a.id - b.id));
});

export default router;
