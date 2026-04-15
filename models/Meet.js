const mongoose = require('mongoose');

const MeetSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['solo', 'squad'],
    required: true
  },
  participants: [{
    type: String, // Storing emails directly to match current frontend logic easily
    required: true
  }],
  nicknames: [{
    type: String
  }],
  venue: {
    type: String
  },
  time: {
    type: String
  },
  date: {
    type: String
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'matched', 'completed', 'cancelled'],
    default: 'pending'
  },
  confirmations: {
    type: Map,
    of: String // email -> 'showed' | 'noshow'
  },
  credited: {
    type: Map,
    of: Boolean // email -> true
  }
}, { timestamps: true });

module.exports = mongoose.model('Meet', MeetSchema);
