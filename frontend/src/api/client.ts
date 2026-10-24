const defaultApiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api/v1'
  : 'https://jenista-chits.onrender.com/api/v1';

const rawBaseUrl = (import.meta.env.VITE_API_URL || defaultApiUrl).trim().replace(/\/+$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl}/api/v1`;

export const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return response.json();
};
