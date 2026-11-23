const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  key: { type: String, required: true, unique: true },
  syncId: { type: String, index: true },
});

module.exports = mongoose.model('Material', materialSchema);