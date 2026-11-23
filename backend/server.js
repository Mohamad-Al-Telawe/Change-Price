require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const approvalRoutes = require('./routes/approvals');
const priceEditRoutes = require('./routes/priceEdits');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const materialsRoutes = require('./routes/materials');

const app = express();
app.use(cors());
app.use('/api/v1/materials', materialsRoutes);
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/price-edits', priceEditRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/search', searchRoutes);

const materialPhotoRoutes = require('./routes/materialPhoto');
// app.use('/api/v1/material_photo', requireAuth, materialPhotoRoutes);
app.use('/api/v1/material_photo', materialPhotoRoutes);
// ===== خدمة الـ frontend بعد البناء =====
const path = require('path');
const dist = path.join(__dirname, '../frontend/dist');

app.use(express.static(dist));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(dist, 'index.html'));
});
// =========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));