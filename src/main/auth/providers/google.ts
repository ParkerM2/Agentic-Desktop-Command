import type { OAuthConfig } from '../types';

export const GOOGLE_OAUTH_CONFIG: OAuthConfig = {
  name: 'google',
  clientId: '',
  clientSecret: '',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  redirectUri: 'adc://oauth/callback',
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};
