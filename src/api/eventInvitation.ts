import { API_URL } from './config';

export interface Invitacion {
  _id: string;
  evento?: { nombre?: string } | string;
  usuario?: { nombre?: string; email?: string } | string;
  estadoInvitacion: string;
  estadoAsistencia: string;
  fechaEnvio?: string;
  emailEnviado?: boolean;
  token?: string;
}

export const getUserInvitations = async (userId: string): Promise<Invitacion[]> => {
  try {
    const response = await fetch(`${API_URL}/eventInvitations/user/${userId}`);
    const data = await response.json();
    return data.success ? data.data : data;
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
};

export const getAllInvitations = async (): Promise<Invitacion[]> => {
  try {
    const response = await fetch(`${API_URL}/invitaciones`);
    const data = await response.json();
    return data.success ? data.data : data;
  } catch (error) {
    console.error('Error fetching all invitations:', error);
    return [];
  }
};
