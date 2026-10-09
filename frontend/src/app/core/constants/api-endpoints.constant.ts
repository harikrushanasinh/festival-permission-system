export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  APPLICATIONS: '/applications',
  FESTIVALS: '/festivals',
  EVENT_TYPES: '/event-types',
  POLICE_STATIONS: '/police-stations',
  NOTIFICATIONS: '/notifications',
} as const;
