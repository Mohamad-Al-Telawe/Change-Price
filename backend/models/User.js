const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    enum: ['requester', 'approver', 'price_editor', 'admin'],
    required: true
  },
  company: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  }
});

userSchema.index({ company: 1, branch: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);