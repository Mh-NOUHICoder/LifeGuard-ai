/**
 * Utility functions for LifeGuard AI
 */

// Extend Window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Convert base64 data to Blob
 */
export function base64ToBlob(
  base64: string,
  mimeType: string = 'application/octet-stream'
): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Get current timestamp in ISO format
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if device has required APIs
 */
export function checkDeviceCapabilities(): {
  camera: boolean;
  microphone: boolean;
  tts: boolean;
  canvas: boolean;
} {
  return {
    camera:
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia,
    microphone:
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.enumerateDevices,
    tts:
      typeof window !== 'undefined' && !!window.speechSynthesis,
    canvas:
      typeof HTMLCanvasElement !== 'undefined',
  };
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validate emergency instruction response
 */
export function validateEmergencyResponse(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    typeof obj.dangerLevel === 'string' &&
    Array.isArray(obj.actions) &&
    obj.actions.every((a) => typeof a === 'string')
  );
}

/**
 * Debounce function for repeated calls
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Log emergency event (for analytics/debugging)
 */
export function logEmergencyEvent(
  eventType: 'start' | 'analyze' | 'success' | 'error',
  data?: Record<string, unknown>
): void {
  const timestamp = getTimestamp();
  const logEntry = {
    timestamp,
    eventType,
    ...data,
  };

  console.log('[LifeGuard]', logEntry);

  // Can be extended to send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', `lifeguard_${eventType}`, data);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Send notification
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

/**
 * Get local emergency number based on timezone/locale
 * Best-effort detection for US/CA (911), UK/IE (999), Morocco (150), EU (112)
 * Fallback: 112
 */
export function getLocalEmergencyNumber(): string {
  if (typeof window === 'undefined') return '112';

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = (navigator.language || '').toLowerCase();

    // Australia (000)
    if (timeZone.startsWith('Australia/')) return '000';

    // New Zealand (111)
    if (timeZone.startsWith('Pacific/Auckland') || timeZone.startsWith('Pacific/Chatham')) return '111';

    // UK & Ireland (999)
    if (
      timeZone === 'Europe/London' || 
      timeZone === 'Europe/Dublin' || 
      timeZone === 'Europe/Belfast' ||
      timeZone === 'Europe/Jersey' ||
      timeZone === 'Europe/Guernsey' ||
      timeZone === 'Europe/Isle_of_Man' ||
      locale === 'en-gb' || 
      locale === 'en-ie'
    ) {
      return '999';
    }

    // Brazil (190)
    if (timeZone.includes('Sao_Paulo') || timeZone.includes('Rio_Branco') || timeZone.includes('Belem') || timeZone.includes('Fortaleza') || timeZone.includes('Manaus') || timeZone.includes('Recife') || timeZone.includes('Araguaina') || timeZone.includes('Maceio') || timeZone.includes('Bahia') || timeZone.includes('Cuiaba') || timeZone.includes('Campo_Grande') || timeZone.includes('Porto_Velho') || timeZone.includes('Boa_Vista') || timeZone.includes('Noronha') || timeZone.includes('Eirunepe') || timeZone.includes('Santarem')) {
      return '190';
    }

    // Morocco (150)
    if (timeZone === 'Africa/Casablanca' || locale.endsWith('-ma')) {
      return '150';
    }

    // Asia Specifics
    if (timeZone.startsWith('Asia/')) {
      if (timeZone.includes('Tokyo')) return '110'; // Japan
      if (timeZone.includes('Hong_Kong') || timeZone.includes('Singapore')) return '999';
      // India, South Korea, etc use 112
    }

    // North & South America (911) - Catch-all for America/ zones (US, Canada, Mexico, etc)
    // This covers all US timezones (Detroit, Boise, etc) that were missed before
    if (timeZone.startsWith('America/') || timeZone.startsWith('US/') || timeZone.startsWith('Canada/') || locale === 'en-us' || locale === 'en-ca') {
      return '911';
    }

    // Europe (General)
    if (timeZone.startsWith('Europe/')) {
      return '112';
    }
  } catch (e) {
    console.warn('[LifeGuard] Failed to detect region for emergency number', e);
  }

  return '112';
}

/**
 * Trigger native phone dialer
 */
export function triggerEmergencyDialer(number: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = `tel:${number}`;
  }
}