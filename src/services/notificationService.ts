/**
 * Servicio de Notificaciones en el Navegador (Web Notification API)
 * Relevamiento Arquitectónico GASV
 *
 * Proporciona alertas al usuario cuando un respaldo en Google Drive falla
 * o cuando el auto-guardado automático se ha completado exitosamente tras
 * una sesión prolongada de trabajo.
 */

export type NotificationState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface SendNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  silent?: boolean;
  data?: unknown;
  requireInteraction?: boolean;
}

const PREF_KEY = 'gasv_notifications_enabled';

/**
 * Comprueba si la API de Notificaciones está soportada en el navegador actual
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Obtiene el estado actual de los permisos de notificación
 */
export function getNotificationPermission(): NotificationState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Consulta la preferencia del usuario sobre si desea recibir notificaciones en la app
 */
export function getNotificationPreference(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? localStorage.getItem(PREF_KEY) !== 'false'
      : true;
  } catch {
    return true;
  }
}

/**
 * Guarda la preferencia del usuario sobre las notificaciones
 */
export function setNotificationPreference(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PREF_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // ignore in private / restricted browsing
  }
}

/**
 * Solicita permisos de notificación al usuario
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationPreference(true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error al solicitar permiso de notificaciones:', err);
    return false;
  }
}

/**
 * Envía una notificación nativa en el navegador
 */
export async function sendBrowserNotification(
  title: string,
  options: SendNotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (!getNotificationPreference()) return false;
  if (Notification.permission !== 'granted') return false;

  const baseUrl = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
  const defaultIcon = `${baseUrl}/gasv-icon-right.png`;

  const notificationOptions: NotificationOptions = {
    icon: options.icon || defaultIcon,
    badge: options.badge || defaultIcon,
    body: options.body || '',
    tag: options.tag || 'gasv-notification',
    silent: options.silent ?? false,
    requireInteraction: options.requireInteraction ?? false,
  };

  try {
    // Intento 1: A través de Service Worker si está registrado y activo
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, notificationOptions);
          return true;
        }
      } catch {
        // Fallback al constructor Notification clásico
      }
    }

    // Intento 2: Constructor directo new Notification
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('No se pudo desplegar la notificación en el navegador:', err);
    return false;
  }
}

/**
 * Alerta al usuario cuando un respaldo en Google Drive falla
 */
export async function notifyGoogleDriveBackupFailed(
  errorDetail?: string,
  isManual = false
): Promise<boolean> {
  const title = isManual
    ? '❌ Fallo en respaldo manual (Google Drive)'
    : '⚠️ Error en auto-respaldo (Google Drive)';

  const cleanDetail = errorDetail ? errorDetail.replace(/\s+/g, ' ').trim() : '';
  const body = cleanDetail
    ? `No se pudo guardar la copia en Drive: ${cleanDetail}`
    : 'No se pudo sincronizar el archivo de respaldo con Google Drive. Revisa tu conexión o vuelve a iniciar sesión.';

  return sendBrowserNotification(title, {
    body,
    tag: 'gasv-gdrive-backup-error',
    requireInteraction: true,
  });
}

/**
 * Alerta al usuario cuando el auto-guardado automático se ha completado
 * exitosamente tras una sesión prolongada de trabajo (ej. 15 minutos o más de edición activa).
 */
export async function notifyLongSessionAutoSave(details: {
  sessionMinutes: number;
  totalAmbientes: number;
  projectName?: string;
}): Promise<boolean> {
  const title = '💾 Auto-guardado exitoso | Relevamiento GASV';
  const min = Math.max(1, Math.round(details.sessionMinutes));
  const amb = `${details.totalAmbientes} ambiente${details.totalAmbientes === 1 ? '' : 's'}`;
  const proj = details.projectName ? ` en "${details.projectName}"` : '';

  const body = `Tus cambios se guardaron automáticamente tras ${min} min de sesión activa (${amb}${proj}).`;

  return sendBrowserNotification(title, {
    body,
    tag: 'gasv-long-session-autosave',
    requireInteraction: false,
  });
}

export const NotificationService = {
  isSupported: isNotificationSupported,
  getPermission: getNotificationPermission,
  getPreference: getNotificationPreference,
  setPreference: setNotificationPreference,
  requestPermission: requestNotificationPermission,
  send: sendBrowserNotification,
  notifyBackupFailed: notifyGoogleDriveBackupFailed,
  notifyLongSessionAutoSave,
};
