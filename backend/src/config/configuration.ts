export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'festival_user',
    password: process.env.DB_PASS || 'festival_pass',
    name: process.env.DB_NAME || 'festival_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localUploadsDir: process.env.LOCAL_UPLOADS_DIR || undefined, // defaults to ./uploads in the driver
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10), // 10MB
  },
  liveTracking: {
    // B20 - "make threshold configurable, do not hardcode it permanently."
    deviationWarningMeters: parseInt(process.env.DEVIATION_WARNING_METERS || '50', 10),
    deviationAlertMeters: parseInt(process.env.DEVIATION_ALERT_METERS || '100', 10),
    // B21 - how long without a GPS update before a live procession is flagged.
    gpsWarningSeconds: parseInt(process.env.GPS_WARNING_SECONDS || '120', 10),
    gpsLostSeconds: parseInt(process.env.GPS_LOST_SECONDS || '300', 10),
  },
});
