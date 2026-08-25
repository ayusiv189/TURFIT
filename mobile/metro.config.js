const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize resolver and avoid watching unnecessary large directories on Windows
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/.*/,
];

module.exports = config;
