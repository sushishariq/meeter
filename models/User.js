const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@kgpian\.iitkgp\.ac\.in$/, 'Please use a valid @kgpian.iitkgp.ac.in email address']
  },
  nickname: {
    type: String,
    required: true,
    maxLength: 20
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  credits: {
    type: Number,
    default: 3.0
  },
  meetsCompleted: {
    type: Number,
    default: 0
  },
  meetsCreated: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
