const mongoose = require('mongoose');

const SocialMediaSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  showIcon: {
    type: Boolean,
    default: true
  }
});

const BranchConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  mapLink: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  }
});

const FooterConfigSchema = new mongoose.Schema({
  branchConfigs: {
    type: [BranchConfigSchema],
    default: [
      { name: 'Colombo', address: 'Colombo Main Office, Galle Road, Colombo', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' },
      { name: 'Wattala', address: 'Wattala Branch, Negombo Road, Wattala', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' },
      { name: 'Negombo', address: '26st Lazarus road, Periyamulla, Negombo', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' },
      { name: 'Jaffna', address: 'Jaffna Town Centre, Jaffna', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' },
      { name: 'Kandy', address: 'Kandy Centre, Dalada Veediya, Kandy', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' },
      { name: 'Minuwangoda', address: 'Minuwangoda Town, Minuwangoda', mapLink: '', phone: '+94 77 431 1051', email: 'support@parksmart.com' }
    ]
  },
  description: {
    type: String,
    default: 'Your premium global parking partner, delivering exceptional parking experiences with real-time space locks and intelligent facility scoring.'
  },
  address: {
    type: String,
    default: '26st Lazarus road, Periyamulla, Negombo'
  },
  phone: {
    type: String,
    default: '+94 77 431 1051'
  },
  email: {
    type: String,
    default: 'support@parksmart.com'
  },
  branches: {
    type: [String],
    default: ['Colombo', 'Wattala', 'Negombo', 'Jaffna', 'Kandy', 'Minuwangoda']
  },
  workingHours: {
    type: String,
    default: '24 Hours & 7 Days'
  },
  whatsapp: {
    type: String,
    default: '94774311051'
  },
  instagram: {
    type: String,
    default: 'https://instagram.com'
  },
  twitter: {
    type: String,
    default: 'https://x.com'
  },
  facebook: {
    type: String,
    default: 'https://facebook.com'
  },
  tiktok: {
    type: String,
    default: 'https://tiktok.com'
  },
  showWhatsapp: {
    type: Boolean,
    default: true
  },
  showInstagram: {
    type: Boolean,
    default: true
  },
  showTwitter: {
    type: Boolean,
    default: true
  },
  showFacebook: {
    type: Boolean,
    default: true
  },
  showTiktok: {
    type: Boolean,
    default: true
  },
  showAllSocials: {
    type: Boolean,
    default: true
  },
  showMap: {
    type: Boolean,
    default: true
  },
  mapLink: {
    type: String,
    default: ''
  },
  socials: {
    type: [SocialMediaSchema],
    default: [
      { platform: 'whatsapp', value: '94774311051', showIcon: true },
      { platform: 'instagram', value: 'https://instagram.com', showIcon: true },
      { platform: 'twitter', value: 'https://x.com', showIcon: true },
      { platform: 'facebook', value: 'https://facebook.com', showIcon: true },
      { platform: 'tiktok', value: 'https://tiktok.com', showIcon: true }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('FooterConfig', FooterConfigSchema);
