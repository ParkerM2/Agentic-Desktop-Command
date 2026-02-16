import type { OAuthConfig } from '../types';

export const GITHUB_OAUTH_CONFIG: OAuthConfig = {
  name: 'github',
  clientId: '',
  clientSecret: '',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'adc://oauth/callback',
  scopes: ['repo', 'read:user', 'notifications'],
};
