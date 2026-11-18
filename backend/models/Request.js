const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  material: {
    type: String,
    required: true
  },
  current_price: {
    type: Number,
    required: true
  },
  requested_price: {
    type: Number,
    required: true
  },
  approved_price: {
    type: Number,
    default: null
  },
  company: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Under Review', 'Approved', 'Approved with Modification', 'Rejected'],
    default: 'Under Review'
  },
  stage: {
    type: String,
    enum: ['Received', 'Reviewed', 'Pending Execution', 'Completed'],
    default: 'Received'
  },
  notes: {
    type: String
  },
  branches_updated: {
    type: [String],
    default: []
  },
  branches_not_updated: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Request', requestSchema);