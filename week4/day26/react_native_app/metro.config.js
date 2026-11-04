const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const mobileComponents = path.resolve(
  projectRoot,
  '../ai/mobile-components',
);

const config = getDefaultConfig(projectRoot);

// Watch the shared Day 26 components outside the Expo app directory.
config.watchFolders = [
  ...config.watchFolders,
  mobileComponents,
];

// Resolve native packages from the Expo app's node_modules directory
// when imported by files in the shared components directory.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
];

module.exports = config;