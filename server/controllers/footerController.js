const FooterConfig = require('../models/FooterConfig');

// @desc    Get footer configuration
// @route   GET /api/footer
// @access  Public
exports.getFooterConfig = async (req, res) => {
  try {
    let config = await FooterConfig.findOne();
    if (!config) {
      // Create default config if none exists
      config = await FooterConfig.create({});
    } else if (!config.socials || config.socials.length === 0) {
      // Migrate / fallback from old static fields if they exist
      const migratedSocials = [];
      if (config.whatsapp) migratedSocials.push({ platform: 'whatsapp', value: config.whatsapp, showIcon: config.showWhatsapp !== false });
      if (config.instagram) migratedSocials.push({ platform: 'instagram', value: config.instagram, showIcon: config.showInstagram !== false });
      if (config.twitter) migratedSocials.push({ platform: 'twitter', value: config.twitter, showIcon: config.showTwitter !== false });
      if (config.facebook) migratedSocials.push({ platform: 'facebook', value: config.facebook, showIcon: config.showFacebook !== false });
      if (config.tiktok) migratedSocials.push({ platform: 'tiktok', value: config.tiktok, showIcon: config.showTiktok !== false });
      
      if (migratedSocials.length > 0) {
        config.socials = migratedSocials;
        await config.save();
      }
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// @desc    Update footer configuration
// @route   PUT /api/footer
// @access  Private/SuperAdmin
exports.updateFooterConfig = async (req, res) => {
  try {
    let config = await FooterConfig.findOne();
    
    const { _id, __v, createdAt, updatedAt, ...updateData } = req.body;

    // Strip _id fields from subdocument arrays to prevent mongoose array merge casting issues
    if (updateData.socials && Array.isArray(updateData.socials)) {
      updateData.socials = updateData.socials.map(s => {
        const { _id, ...rest } = s;
        return rest;
      });
    }
    if (updateData.branchConfigs && Array.isArray(updateData.branchConfigs)) {
      updateData.branchConfigs = updateData.branchConfigs.map(b => {
        const { _id, ...rest } = b;
        return rest;
      });
    }

    if (!config) {
      config = new FooterConfig(updateData);
    } else {
      config.set(updateData);
    }

    // Sync branches list from branchConfigs names
    if (config.branchConfigs && config.branchConfigs.length > 0) {
      config.branches = config.branchConfigs.map(bc => bc.name);
    }

    await config.save();

    // Emit socket event to all clients about the footer update
    const io = req.app.get('socketio');
    if (io) {
      io.emit('footerUpdated', config);
    }

    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};
