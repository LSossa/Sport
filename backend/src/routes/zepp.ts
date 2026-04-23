import { Router } from 'express';
import { getZeppStatus, saveZeppCredentials, disconnectZepp, syncWeight } from '../services/zeppService';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(getZeppStatus());
});

router.post('/credentials', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  saveZeppCredentials(email, password);
  res.json({ ok: true });
});

router.post('/sync', async (_req, res) => {
  try {
    const result = await syncWeight();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.delete('/disconnect', (_req, res) => {
  disconnectZepp();
  res.status(204).send();
});

export default router;
