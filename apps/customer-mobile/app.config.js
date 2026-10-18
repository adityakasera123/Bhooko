const fs = require('fs');
const path = require('path');

const { expo } = require('./app.json');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  // Local development: load .env when it exists.
  // EAS cloud builds: environment variables can be supplied by EAS.
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

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
  throw new Error('GOOGLE_MAPS_API_KEY is missing from customer-mobile/.env');
}

module.exports = {
  ...expo,
   plugins: [
    ...(expo.plugins || []),
    'expo-secure-store',
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
