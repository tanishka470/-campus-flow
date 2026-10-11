import { Router } from 'express';
import { processScan, validateCardId, validateScanContext } from '../services/accessService.js';

const router = Router();

router.post('/scan', (req, res) => {
  const validation = validateCardId(req.body?.cardId);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const ctx = validateScanContext(req.body);
  if (!ctx.ok) {
    return res.status(400).json({ error: ctx.error });
  }

  const result = processScan(validation.value, { gate: ctx.gate, direction: ctx.direction });
  return res.status(200).json({
    cardId: validation.value,
    ...result,
  });
});

export default router;
