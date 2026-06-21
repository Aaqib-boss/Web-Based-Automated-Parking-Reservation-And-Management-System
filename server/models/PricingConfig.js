const mongoose = require('mongoose');

const PricingConfigSchema = new mongoose.Schema({
  branch: {
    type: String,
    required: [true, 'Please specify the branch'],
    default: 'Negombo',
    unique: true,
  },
  baseRate: {
    type: Number,
    required: [true, 'Please add a base rate'],
    default: 30,
  },
  twoHourRate: {
    type: Number,
    required: [true, 'Please add a 2 hour rate'],
    default: 50,
  },
  fourHourRate: {
    type: Number,
    required: [true, 'Please add a 4 hour rate'],
    default: 90,
  },
  fullDayRate: {
    type: Number,
    required: [true, 'Please add a full day rate'],
    default: 150,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PricingConfig', PricingConfigSchema);
