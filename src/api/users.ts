import { API_URL } from './config';

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error login:', error);
    throw error;
  }
};

export const getUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  return await response.json();
};
