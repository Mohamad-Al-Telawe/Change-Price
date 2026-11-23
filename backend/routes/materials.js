const express = require('express');
const crypto = require('crypto');
const Material = require('../models/Material');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const CHUNK_SIZE = 1000;
const MAX_CODE_LENGTH = 50;
const MIN_KEEP_RATIO = 0.5;

const normalize = (v) => String(v ?? '').trim();

function checkSyncKey(req, res, next) {
  const expected = process.env.MATERIALS_SYNC_KEY;
  if (!expected) return res.status(500).json({ error: 'Sync is not configured' });

  const a = Buffer.from(req.get('x-sync-key') || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid sync key' });
  }
  next();
}

// GET /api/v1/materials/check?code=...
router.get('/check', verifyToken, async (req, res) => {
  try {
    const code = normalize(req.query.code);
    if (!code || code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ error: 'invalid code' });
    }

    const found = await Material.findOne({ key: code.toUpperCase() }).select('code').lean();
    if (!found) return res.json({ exists: false });
    return res.json({ exists: true, material: { code: found.code } });
  } catch (err) {
    console.error('materials check error:', err.message);
    return res.status(500).json({ error: 'Failed to check material' });
  }
});

// POST /api/v1/materials/sync  { codes: [...], force?: true }
router.post('/sync', checkSyncKey, express.json({ limit: '5mb' }), async (req, res) => {
  try {
    if (!Array.isArray(req.body?.codes)) {
      return res.status(400).json({ error: 'codes must be an array' });
    }

    const unique = new Map();
    for (const raw of req.body.codes) {
      const code = normalize(raw);
      if (!code || code.length > MAX_CODE_LENGTH) continue;
      const key = code.toUpperCase();
      if (!unique.has(key)) unique.set(key, code);
    }

    if (unique.size === 0) {
      return res.status(400).json({ error: 'empty list' });
    }

    const existing = await Material.estimatedDocumentCount();
    if (!req.body.force && existing > 0 && unique.size < existing * MIN_KEEP_RATIO) {
      return res.status(409).json({
        error: 'New list is much smaller than the current one; send force: true to confirm',
        existing,
        received: unique.size,
      });
    }

    const syncId = crypto.randomUUID();
    const entries = [...unique.entries()];

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const ops = entries.slice(i, i + CHUNK_SIZE).map(([key, code]) => ({
        updateOne: { filter: { key }, update: { $set: { code, syncId } }, upsert: true },
      }));
      await Material.bulkWrite(ops, { ordered: false });
    }

    const removed = await Material.deleteMany({ syncId: { $ne: syncId } });
    return res.json({ received: unique.size, removed: removed.deletedCount });
  } catch (err) {
    console.error('materials sync error:', err.message);
    return res.status(500).json({ error: 'Failed to sync materials' });
  }
});

module.exports = router;