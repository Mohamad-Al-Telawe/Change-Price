const express = require('express');
const Request = require('../models/Request');
const User = require('../models/User');   // جديد
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);
router.use(requireRole('price_editor'));

// GET /api/v1/price-edits — طلبات بانتظار تنفيذ التعديل
router.get('/', async (req, res) => {
  try {
    const requests = await Request.find({ stage: 'Pending Execution' })
      .populate('requester', 'name number company branch')
      .sort({ createdAt: 1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending price edits' });
  }
});

// PATCH /api/v1/price-edits/:id — تعليم الطلب كمكتمل بعد تنفيذ التعديل يدويًا
router.patch('/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.stage !== 'Pending Execution') {
      return res.status(409).json({ error: 'This request is not awaiting execution' });
    }

    request.stage = 'Completed';
    const branches = await User.distinct('branch', { company: request.company });
    request.branches_not_updated = branches;
    request.branches_updated = [];
    await request.save();
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// GET /api/v1/price-edits/materials-status — مواد تم تعديل سعرها وبانتظار تأكيد بعض الأفرع
router.get('/materials-status', async (req, res) => {
  try {
    const items = await Request.find({
      stage: 'Completed',
      branches_not_updated: { $ne: [] }
    }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials status' });
  }
});

module.exports = router;