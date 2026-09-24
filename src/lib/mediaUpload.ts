import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { SocialMediaType } from '../types';

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  mediaType: SocialMediaType;
  previewUrl?: string;
}

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/svg+xml',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'video/x-m4v',
];

/**
 * Validates a selected media file for type and size constraints.
 */
export function validateMediaFile(file: File): MediaValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided', mediaType: 'NONE' };
  }

  const isImage = file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  const isVideo = file.type.startsWith('video/') || ALLOWED_VIDEO_TYPES.includes(file.type.toLowerCase());

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a JPG, PNG, WEBP, GIF image or MP4, WEBM video.',
      mediaType: 'NONE',
    };
  }

  if (isImage) {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Image size exceeds the 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`,
        mediaType: 'IMAGE',
      };
    }
    return {
      valid: true,
      mediaType: 'IMAGE',
      previewUrl: URL.createObjectURL(file),
    };
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return {
        valid: false,
        error: `Video size exceeds the 60MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please compress or trim your video.`,
        mediaType: 'VIDEO',
      };
    }
    return {
      valid: true,
      mediaType: 'VIDEO',
      previewUrl: URL.createObjectURL(file),
    };
  }

  return { valid: false, error: 'Invalid file', mediaType: 'NONE' };
}

/**
 * Converts a file to base64 Data URL as a fallback.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads media to Firebase Storage with progress callback, falling back to Data URL if needed.
 */
export async function uploadPostMedia(
  file: File,
  userId: string,
  onProgress?: (progressPercent: number) => void
): Promise<{ downloadUrl: string; mediaType: SocialMediaType; storagePath?: string }> {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Media file is invalid');
  }

  const mediaType = validation.mediaType;
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `posts/${userId}/${timestamp}_${cleanName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        mediaType,
      },
    });

    return await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(Math.round(progress));
        },
        async (error) => {
          console.warn('Firebase Storage upload failed, falling back to client Data URL:', error);
          try {
            // Simulated upload progress for user feedback
            onProgress?.(50);
            const dataUrl = await fileToDataUrl(file);
            onProgress?.(100);
            resolve({ downloadUrl: dataUrl, mediaType });
          } catch (readErr) {
            reject(new Error('Failed to process media file: ' + error.message));
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.(100);
            resolve({ downloadUrl, mediaType, storagePath });
          } catch (urlErr) {
            console.warn('Error fetching download URL, using Data URL fallback:', urlErr);
            const dataUrl = await fileToDataUrl(file);
            resolve({ downloadUrl: dataUrl, mediaType });
          }
        }
      );
    });
  } catch (err: any) {
    console.warn('Firebase Storage initialization error, using local fallback:', err);
    onProgress?.(50);
    const dataUrl = await fileToDataUrl(file);
    onProgress?.(100);
    return { downloadUrl: dataUrl, mediaType };
  }
}

/**
 * Attempts to remove a file from Firebase Storage.
 */
export async function deletePostMedia(storagePathOrUrl?: string): Promise<void> {
  if (!storagePathOrUrl || !storagePathOrUrl.startsWith('http')) return;
  try {
    const storageRef = ref(storage, storagePathOrUrl);
    await deleteObject(storageRef);
  } catch (err) {
    // Non-blocking catch
    console.warn('Could not delete storage file (may already be removed or is a data URL):', err);
  }
}
