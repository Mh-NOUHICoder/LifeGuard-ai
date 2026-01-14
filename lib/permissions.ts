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
    
    // Try different constraint levels with fallbacks
    const constraintOptions = [
      // Try 1: Full featured
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      },
      // Try 2: Basic constraints
      {
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      },
      // Try 3: Minimal constraints
      {
        video: true,
        audio: true,
      },
      // Try 4: Video only
      {
        video: true,
        audio: false,
      },
      // Try 5: Audio only
      {
        video: false,
        audio: true,
      },
    ];

    let stream: MediaStream | null = null;
    let lastError: Error | null = null;

    for (let i = 0; i < constraintOptions.length; i++) {
      try {
        console.log(`Attempt ${i + 1}: Requesting with constraints:`, constraintOptions[i]);
        stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
        console.log(`✓ Success on attempt ${i + 1}`);
        break;
      } catch (err) {
        lastError = err as Error;
        console.warn(`Attempt ${i + 1} failed:`, (err as Error).message);
      }
    }

    if (!stream) {
      throw lastError || new Error('Failed to get media stream after all attempts');
    }

    console.log('Media stream acquired successfully');
    console.log('Video tracks:', stream.getVideoTracks().length);
    console.log('Audio tracks:', stream.getAudioTracks().length);

    return {
      camera: stream.getVideoTracks().length > 0,
      microphone: stream.getAudioTracks().length > 0,
      stream,
    };
  } catch (err) {
    let errorMessage = 'Permission denied';

    if (err instanceof DOMException) {
      console.error(`DOMException: ${err.name} - ${err.message}`);
      
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
      } else {
        errorMessage = `${err.name}: ${err.message}`;
      }
    } else {
      console.error('Unknown error:', err);
      errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    }

    console.error('Final error:', errorMessage);
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
