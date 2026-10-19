const { getDefaultConfig } = require('expo/metro-config');

// O Expo já resolve o campo "exports" do package.json (necessário para o Firebase JS SDK)
module.exports = getDefaultConfig(__dirname);
