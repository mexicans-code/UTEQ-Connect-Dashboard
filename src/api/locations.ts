import { API_URL } from './config';

export interface Location {
  _id: string;
  nombre: string;
  posicion: {
    latitude: number;
    longitude: number;
  };
  image?: string;
}

export const getLocations = async (): Promise<Location[]> => {
  try {
    const response = await fetch(`${API_URL}/locations`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
};
