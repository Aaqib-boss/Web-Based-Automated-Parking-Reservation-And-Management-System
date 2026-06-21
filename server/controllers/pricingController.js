const PricingConfig = require('../models/PricingConfig');

// @desc    Get pricing configurations
// @route   GET /api/pricing
// @access  Public
exports.getPricing = async (req, res) => {
  try {
    const branch = req.query.branch || 'Negombo';
    let config = await PricingConfig.findOne({ branch });
    if (!config) {
      config = await PricingConfig.create({
        branch,
        baseRate: 30,
        twoHourRate: 50,
        fourHourRate: 90,
        fullDayRate: 150,
      });
    }
    res.status(200).json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update pricing configurations
// @route   PUT /api/pricing
// @access  Private (Super Admin, Operations Admin)
exports.updatePricing = async (req, res) => {
  try {
    const { baseRate, twoHourRate, fourHourRate, fullDayRate } = req.body;
    const branch = req.query.branch || req.body.branch || 'Negombo';

    if (baseRate === undefined || twoHourRate === undefined || fourHourRate === undefined || fullDayRate === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all rate values' });
    }

    let config = await PricingConfig.findOne({ branch });
    if (!config) {
      config = new PricingConfig({ branch });
    }

    config.baseRate = Number(baseRate);
    config.twoHourRate = Number(twoHourRate);
    config.fourHourRate = Number(fourHourRate);
    config.fullDayRate = Number(fullDayRate);
    config.updatedAt = Date.now();

    await config.save();

    res.status(200).json({ success: true, message: 'Pricing rates updated successfully', data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
