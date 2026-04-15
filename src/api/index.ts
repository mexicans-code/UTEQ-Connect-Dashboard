/**
 * src/api/index.ts
 * ─────────────────────────────────────────────────────────────
 * Punto de entrada único para toda la capa API.
 *
 * En vez de importar desde cada archivo individual:
 *   import { getEventos } from '../api/events';
 *   import { getLocations } from '../api/locations';
 *
 * Puedes importar todo desde aquí:
 *   import { getEventos, getLocations } from '../api';
 * ─────────────────────────────────────────────────────────────
 */
export * from './espacios';
export * from './events';
export * from './locations';
export * from './users';
export * from './personal';
export * from './invitaciones';
export * from './logs';
export * from './reportes';