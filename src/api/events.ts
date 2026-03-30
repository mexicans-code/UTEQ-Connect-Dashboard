import { API_URL } from './config';

export interface Event {
  _id: string;
  nombre: string;
  descripcion?: string;
  fecha?: string;
  lugar?: string;
  activo?: boolean;
}

export const getEvents = async (): Promise<Event[]> => {
  try {
    const response = await fetch(`${API_URL}/events`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};


