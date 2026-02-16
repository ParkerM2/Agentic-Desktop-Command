import type { OAuthConfig } from '../types';

export const SPOTIFY_OAUTH_CONFIG: OAuthConfig = {
  name: 'spotify',
  clientId: '',
  clientSecret: '',
  authorizationUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',
  redirectUri: 'adc://oauth/callback',
  scopes: ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'],
};
