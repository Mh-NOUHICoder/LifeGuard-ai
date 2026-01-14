/**
 * Permission utilities for camera and microphone access
 */

export async function checkCameraPermission(): Promise<PermissionStatus | null> {
  try {
    const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    return permission;
  } catch {
    // Fallback for browsers that don't support permissions API
    return null;
  }
}

export async function checkMicrophonePermission(): Promise<PermissionStatus | null> {
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return permission;
  } catch {
    // Fallback for browsers that don't support permissions API
    return null;
  }
}

export async function requestMediaPermissions(): Promise<{
  camera: boolean;
  microphone: boolean;
  stream?: MediaStream;
  error?: string;
}> {
  try {
    console.log('Requesting media permissions...');
    
    // Try different MIME types for better browser compatibility
    const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/wav'];
    let mimeType = 'audio/webm';

    // Test which MIME type is supported
    for (const type of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      } catch (e) {
        // Continue trying other types
      }
    }

    console.log(`Using MIME type: ${mimeType}`);

    // Request both camera and microphone with simpler constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
      },
      audio: true,
    });

    console.log('Media permissions granted');
    return {
      camera: true,
      microphone: true,
      stream,
    };
  } catch (err) {
    let errorMessage = 'Permission denied';

    if (err instanceof DOMException) {
      console.error(`DOMException: ${err.name}`);
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permission denied - click Allow when prompted';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera/Mic is in use by another app - close it and retry';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'This site cannot access camera/mic - try HTTPS or localhost';
      } else if (err.name === 'TypeError') {
        errorMessage = 'getUserMedia not supported on this browser';
      }
    } else {
      console.error('Unknown error:', err);
    }

    console.error('Permission result error:', errorMessage);
    return {
      camera: false,
      microphone: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if browser supports getUserMedia
 */
export function isMediaDevicesSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
}

/**
 * Check if device is on HTTPS or localhost
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
