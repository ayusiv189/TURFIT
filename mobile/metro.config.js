const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable cjs and svg support if needed
config.resolver.sourceExts.push('cjs');

module.exports = config;
