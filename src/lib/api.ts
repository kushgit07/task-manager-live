export const fetchWithAuth = async (url: string, getToken: () => Promise<string | null>, options: RequestInit = {}) => {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API Request Failed');
  }
  
  return data;
};
