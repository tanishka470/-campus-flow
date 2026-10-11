import { Router } from 'express';
import { findUserById, getStore, persist } from '../db.js';
import { validateCardId } from '../services/accessService.js';

const router = Router();

router.get('/', (_req, res) => {
  const s = getStore();
  const cards = [...s.cards]
    .sort((a, b) => a.id - b.id)
    .map((c) => {
      const user = findUserById(c.userId);
      return {
        ...c,
        userName: user?.name,
        department: user?.department,
      };
    });
  res.json(cards);
});

router.post('/', (req, res) => {
  const validation = validateCardId(req.body?.cardId);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const userId = Number(req.body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'userId must be a positive integer' });
  }

  if (!findUserById(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }

  const s = getStore();
  if (s.cards.some((c) => c.cardId === validation.value)) {
    return res.status(409).json({ error: 'Card ID already registered' });
  }

  const active =
    req.body?.active === undefined
      ? true
      : req.body.active === true || req.body.active === 1;

  const card = {
    id: s.nextId.cards++,
    cardId: validation.value,
    userId,
    active,
    createdAt: new Date().toISOString(),
  };
  s.cards.push(card);
  persist();

  return res.status(201).json(card);
});

router.patch('/:id/active', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid card id' });
  }

  if (typeof req.body?.active !== 'boolean') {
    return res.status(400).json({ error: 'active must be a boolean' });
  }

  const s = getStore();
  const card = s.cards.find((c) => c.id === id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  card.active = req.body.active;
  persist();

  return res.json({ ...card });
});

export default router;
