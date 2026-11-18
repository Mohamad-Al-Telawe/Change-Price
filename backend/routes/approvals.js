const express = require('express');
const Request = require('../models/Request');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('approver'));

// GET /api/v1/approvals — الطلبات بانتظار المراجعة
router.get('/', async (req, res) => {
  try {
    const requests = await Request.find({ status: 'Under Review' })
      .populate('requester', 'name number company branch')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// PATCH /api/v1/approvals/:id — قرار الموافقة / التعديل / الرفض
router.patch('/:id', async (req, res) => {
  const { decision, approved_price, notes } = req.body;

  if (!['approve', 'modify', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approve", "modify" or "reject"' });
  }

  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'Under Review') {
      return res.status(409).json({ error: 'This request has already been decided' });
    }

    if (decision === 'approve') {
      request.status = 'Approved';
      request.approved_price = request.requested_price;
      request.stage = 'Pending Execution';
    } else if (decision === 'modify') {
      if (approved_price === undefined) {
        return res.status(400).json({ error: 'approved_price is required for a modified approval' });
      }
      request.status = 'Approved with Modification';
      request.approved_price = approved_price;
      request.stage = 'Pending Execution';
    } else {
      request.status = 'Rejected';
      request.stage = 'Reviewed';
    }

    if (notes) request.notes = notes;

    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

module.exports = router;