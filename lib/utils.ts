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

// Comprehensive Emergency Number Map
const EMERGENCY_NUMBERS: Record<string, string> = {
  // North America
  'US': '911', 'CA': '911', 'MX': '911',
  // Europe (General 112, specific overrides below)
  'UK': '999', 'GB': '999', 'IE': '112', 'FR': '112', 'DE': '112', 'ES': '112', 'IT': '112', 
  'PT': '112', 'NL': '112', 'BE': '112', 'AT': '112', 'CH': '112', 'SE': '112', 'NO': '112', 
  'DK': '112', 'FI': '112', 'PL': '112', 'GR': '112', 'CZ': '112', 'HU': '112', 'RO': '112', 
  'BG': '112', 'HR': '112', 'SI': '112', 'SK': '112', 'EE': '112', 'LT': '112', 'LV': '112', 
  'CY': '112', 'MT': '112', 'LU': '112', 'IS': '112',
  // Asia
  'CN': '110', 'JP': '110', 'IN': '112', 'KR': '112', 'ID': '112', 'TH': '191', 'VN': '113', 
  'PH': '911', 'MY': '999', 'SG': '995', 'HK': '999', 'TW': '110',
  // Oceania
  'AU': '000', 'NZ': '111',
  // South America
  'BR': '190', 'AR': '911', 'CO': '123', 'CL': '133', 'PE': '105', 'VE': '911',
  // Africa
  'ZA': '112', 'EG': '122', 'MA': '15', 'NG': '112', 'KE': '999',
  // Middle East
  'IL': '100', 'SA': '911', 'AE': '999', 'TR': '112', 'RU': '112',
};

/**
 * Get local emergency number based on timezone/locale
 * Best-effort detection for US/CA (911), UK/IE (999), Morocco (150), EU (112)
 * Fallback: 112
 */
export function getLocalEmergencyNumber(): string {
  if (typeof window === 'undefined') return '112';

  try {
    // 1. Try to get country from navigator.language (e.g. "en-US" -> "US")
    const locale = navigator.language || 'en-US';
    const countryCode = locale.split('-')[1]?.toUpperCase();

    if (countryCode && EMERGENCY_NUMBERS[countryCode]) {
      return EMERGENCY_NUMBERS[countryCode];
    }

    // 2. Fallback to Timezone mapping for broader regions if country code fails
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    
    if (timeZone.startsWith('America/')) return '911';
    if (timeZone.startsWith('Europe/')) return '112';
    if (timeZone.startsWith('Australia/')) return '000';
    if (timeZone.startsWith('Asia/')) return '110'; // Generic Asia fallback
    if (timeZone.startsWith('Africa/')) return '112'; // Generic Africa fallback

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