import { environment } from '../../environments/environment';

function normalizeApiBaseUrl(value: string) {
  const cleanedValue = (value || '').trim().replace(/\/+$/, '');

  if (!cleanedValue) {
    return 'http://localhost:5000/api';
  }

  return cleanedValue.endsWith('/api')
    ? cleanedValue
    : `${cleanedValue}/api`;
}

export const APP_CONFIG = {
  apiBaseUrl: normalizeApiBaseUrl(environment.apiBaseUrl),
  googleMapsApiKey: environment.googleMapsApiKey || ''
};
