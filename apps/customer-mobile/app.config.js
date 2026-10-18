
const fs = require('fs');
const path = require('path');
const { withAndroidColors, withAndroidStyles } = require('expo/config-plugins');

const { expo } = require('./app.json');

function withBhookoNativeSplashBackground(config) {
  // Expo's splash plugin composes the image against its own backgroundColor.
  // Keep that image canvas transparent, but restore the app's full-screen native
  // splash background to BHOOKO cream after expo-splash-screen has run.
  config = withAndroidColors(config, (modConfig) => {
    const resources = modConfig.modResults.resources;
    const colors = Array.isArray(resources.color)
      ? resources.color
      : resources.color
        ? [resources.color]
        : [];

    const background = colors.find(
      (color) => color.$?.name === 'splashscreen_background',
    );

    if (background) {
      background._ = '#FFF7F0';
    } else {
      colors.push({ $: { name: 'splashscreen_background' }, _: '#FFF7F0' });
    }

    resources.color = colors;
    return modConfig;
  });

  config = withAndroidStyles(config, (modConfig) => {
    const splashTheme = modConfig.modResults.resources.style?.find(
      (style) => style.$?.name === 'Theme.App.SplashScreen',
    );
    if (!splashTheme) return modConfig;

    const items = Array.isArray(splashTheme.item) ? splashTheme.item : [];
    const background = items.find(
      (item) => item.$?.name === 'windowSplashScreenBackground',
    );

    if (background) {
      background._ = '@color/splashscreen_background';
    } else {
      items.push({
        $: { name: 'windowSplashScreenBackground' },
        _: '@color/splashscreen_background',
      });
    }

    splashTheme.item = items;
    return modConfig;
  });

  return config;
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  // Local development: load .env when it exists.
  // EAS cloud builds can use EAS environment variables.
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}

loadEnvFile();

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error(
    'GOOGLE_MAPS_API_KEY is missing. Set it in customer-mobile/.env for local development or in the EAS environment for cloud builds.',
  );
}

const config = {
  ...expo,

  plugins: [
    ...(expo.plugins || []).filter(
      (plugin) =>
        plugin !== 'expo-splash-screen' &&
        !(
          Array.isArray(plugin) &&
          plugin[0] === 'expo-splash-screen'
        ),
    ),

    'expo-secure-store',

    // IMPORTANT: register this BEFORE expo-splash-screen. Expo config mods are
    // nested; a later plugin's callback runs first, then delegates to earlier
    // callbacks. This plugin therefore runs after the splash plugin and restores
    // the full-screen background to cream after the splash plugin writes transparent.
    withBhookoNativeSplashBackground,

    [
      'expo-splash-screen',
      {
        image: './assets/splash-transparent.png',
        imageWidth: 1,
        resizeMode: 'contain',
        backgroundColor: 'transparent',
      },
    ],
  ],

  android: {
    ...expo.android,

    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ||
      expo.android?.googleServicesFile,

    config: {
      ...expo.android?.config,

      googleMaps: {
        ...expo.android?.config?.googleMaps,
        apiKey,
      },
    },
  },
};

module.exports = config;
