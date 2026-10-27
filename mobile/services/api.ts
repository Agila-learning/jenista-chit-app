import { Platform } from 'react-native';
import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';

export const getApiBaseUrl = async (): Promise<string> => {
  return await getActiveBaseUrl();
};

export const apiClient = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await secureStorage.getItem('auth_token');
  const baseUrl = await getActiveBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    throw error;
  }
};
