import { API_URL } from './config';

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
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

export const getUserById = async (id: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/users/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return await response.json();
};

export const updateUser = async (id: string, data: any) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return await response.json();
};

export const deleteUser = async (id: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return await response.json();
};
