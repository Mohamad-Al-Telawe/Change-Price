const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: true,
    unique: true
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

module.exports = mongoose.model('User', userSchema);