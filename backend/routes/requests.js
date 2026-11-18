const express = require('express');
const Request = require('../models/Request');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken); // every request route needs a logged-in user

// POST /api/v1/requests — requester creates a new request
router.post('/', requireRole('requester'), async (req, res) => {
  const { material, current_price, requested_price, notes } = req.body;

  if (!material || current_price === undefined || requested_price === undefined) {
    return res.status(400).json({ error: 'material, current_price and requested_price are required' });
  }

  try {
    const newRequest = await Request.create({
      material,
      current_price,
      requested_price,
      notes,
      company: req.user.company,   // copied from the token, never from the client body
      branch: req.user.branch,
      requester: req.user.id
    });
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// GET /api/v1/requests/mine — must be declared before /:id, or Express will try
// to match the literal word "mine" as an :id
router.get('/mine', requireRole('requester'), async (req, res) => {
  try {
    const requests = await Request.find({ requester: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/v1/requests/branch-updates — المواد التي يحتاج فرعي لتأكيد تعديل سعرها
router.get('/branch-updates', requireRole('requester'), async (req, res) => {
  try {
    const requests = await Request.find({
      company: req.user.company,
      stage: 'Completed',
      branches_not_updated: req.user.branch
    }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending branch updates' });
  }
});

// GET /api/v1/requests/:id — requester views one of their own requests
router.get('/:id', requireRole('requester'), async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, requester: req.user.id });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// PATCH /api/v1/requests/:id/branch-update — الفرع يؤشر أنه نفّذ التعديل فعليًا
router.patch('/:id/branch-update', requireRole('requester'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.company !== req.user.company) {
      return res.status(403).json({ error: 'This request does not belong to your company' });
    }

    if (!request.branches_not_updated.includes(req.user.branch)) {
      return res.status(409).json({ error: 'Your branch is not pending an update for this request' });
    }

    request.branches_not_updated = request.branches_not_updated.filter(b => b !== req.user.branch);
    request.branches_updated.push(req.user.branch);
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update branch status' });
  }
});
module.exports = router;