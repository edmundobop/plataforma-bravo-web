const LOCAL_BACKEND_RE = /^https?:\/\/(localhost|127\.0\.0\.1):5000/i;

export const getBackendOrigin = () => {
  const explicitOrigin = process.env.REACT_APP_API_ORIGIN;
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, '');
  }

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:5000';
};

export const toAbsoluteBackendUrl = (value) => {
  if (!value) return '';

  const raw = String(value);
  if (/^(data:|blob:)/i.test(raw)) return raw;

  const origin = getBackendOrigin();
  if (LOCAL_BACKEND_RE.test(raw)) {
    return raw.replace(LOCAL_BACKEND_RE, origin);
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
};
