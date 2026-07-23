const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The pdf.js runtime ships to the device as an asset rather than as bundled
// JS: it runs inside the PDF Maker's WebView, not in the RN bundle. It is
// vendored with a .txt suffix because `mjs` is already a sourceExt here, and
// an extension cannot be both.
config.resolver.assetExts.push('txt');
module.exports = config;
