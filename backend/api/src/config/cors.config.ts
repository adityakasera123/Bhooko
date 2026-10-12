const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
];

export function getCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS;

  if (!configuredOrigins?.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ORIGINS must be configured in production',
      );
    }

    return DEFAULT_CORS_ORIGINS;
  }

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (
    origins.length === 0 ||
    origins.some((origin) => origin === '*')
  ) {
    throw new Error(
      'CORS_ORIGINS must contain explicit origins; wildcard is not allowed',
    );
  }

  return origins;
}
