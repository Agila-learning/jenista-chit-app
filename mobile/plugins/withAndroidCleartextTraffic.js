const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function copyNetworkSecurityConfigFile(projectRoot) {
  const src = path.join(projectRoot, 'plugins', 'network_security_config.xml');
  const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');

  if (!fs.existsSync(resDir)) {
    fs.mkdirSync(resDir, { recursive: true });
  }

  const dest = path.join(resDir, 'network_security_config.xml');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

module.exports = function withAndroidCleartextTraffic(config) {
  // 1. Copy the network_security_config.xml into android res/xml during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      copyNetworkSecurityConfigFile(config.modRequest.projectRoot);
      return config;
    },
  ]);

  // 2. Add usesCleartextTraffic and networkSecurityConfig to AndroidManifest.xml
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    androidManifest.$ = {
      ...androidManifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    mainApplication.$['android:usesCleartextTraffic'] = 'true';
    mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';

    const existingToolsReplace = mainApplication.$['tools:replace'] || '';
    const replacements = new Set(existingToolsReplace.split(',').filter(Boolean));
    replacements.add('android:usesCleartextTraffic');
    replacements.add('android:networkSecurityConfig');
    mainApplication.$['tools:replace'] = Array.from(replacements).join(',');

    return config;
  });

  return config;
};
