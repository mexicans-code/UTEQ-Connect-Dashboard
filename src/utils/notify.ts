/**
 * notify.ts
 * Utilidad centralizada de notificaciones para UTEQ Connect.
 *
 * Dos tipos:
 *  - notifyLocal()  → dispara la notificación desde la propia app (vía SW postMessage)
 *  - notifyPush()   → suscribe al navegador al servidor de push y guarda la suscripción
 *
 * Uso en cualquier pantalla:
 *   import { notifyLocal } from '../../utils/notify';
 *   await notifyLocal('Evento creado', 'El evento "Conferencia" fue guardado correctamente.');
 */

/* ─────────────────────────────────────────
   NOTIFICACIÓN LOCAL (vía Service Worker)
   Funciona aunque el usuario esté en la app.
   No requiere servidor externo.
───────────────────────────────────────── */

export async function notifyLocal(title: string, body: string): Promise<void> {
  // 1. El navegador debe soportar notificaciones
  if (!('Notification' in window)) return;

  // 2. Pedir permiso si aún no se ha dado
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  // 3. Si no hay permiso, salir sin error
  if (Notification.permission !== 'granted') return;

  // 4. Enviar mensaje al Service Worker para que muestre la notificación
  //    El SW tiene el listener 'message' con type === 'NOTIFY_SAVE'
  const sw = navigator.serviceWorker?.controller;
  if (sw) {
    sw.postMessage({ type: 'NOTIFY_SAVE', title, message: body });
  } else {
    // Fallback: mostrar notificación nativa directamente si el SW no está listo
    new Notification(title, { body, icon: '/icons/icon-192x192.png' });
  }
}

/* ─────────────────────────────────────────
   PUSH NOTIFICATIONS
   Requiere que el servidor tenga web-push
   con claves VAPID configuradas.
   El servidor envía la notificación incluso
   con la app cerrada.
───────────────────────────────────────── */

// Clave pública VAPID — debe coincidir con la del servidor (.env VAPID_PUBLIC_KEY)
// Si el servidor aún no tiene VAPID configurado, esta función simplemente no hace nada.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Convierte la clave VAPID de base64 a Uint8Array (requerido por la Web Push API)
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

/**
 * Suscribe este navegador al servidor de push y guarda la suscripción.
 * Llámalo una vez cuando el usuario inicia sesión.
 */
export async function suscribirPush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) {
    console.warn('⚠️ VITE_VAPID_PUBLIC_KEY no configurada. Push notifications deshabilitadas.');
    return;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Verificar si ya hay una suscripción activa
    const existente = await registration.pushManager.getSubscription();
    if (existente) return; // ya está suscrito

    // Crear nueva suscripción
    const suscripcion = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Enviar la suscripción al servidor para que pueda mandar pushes
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(suscripcion),
    });

    console.log('✅ Suscripción push registrada en el servidor');
  } catch (err) {
    console.error('❌ Error al suscribir push:', err);
  }
}