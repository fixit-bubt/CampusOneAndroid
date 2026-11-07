const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The pdf.js runtime ships to the device as an asset rather than as bundled
// JS: it runs inside the PDF Maker's WebView, not in the RN bundle. It is
// vendored with a .txt suffix because `mjs` is already a sourceExt here, and
// an extension cannot be both.
config.resolver.assetExts.push('txt');

// Expo ships inlineRequires off, so every screen module (and the 11k-line
// location catalog) executes at launch. Inline them so a module only runs
// the first time it is actually used.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;
