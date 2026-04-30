import { useCallback, useState } from 'react';
import { Attachment } from '@/stores/useChatStore';

/**
 * useFileUpload Hook
 * 
 * Handles file uploads with support for:
 * - Image preview and validation
 * - Audio file handling
 * - Document files (PDF, TXT)
 * - Base64 conversion for storage
 */

export interface FileUploadState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export interface UseFileUploadReturn extends FileUploadState {
  uploadImage: (file: File) => Promise<Attachment | null>;
  uploadAudio: (blob: Blob, filename?: string) => Promise<Attachment | null>;
  uploadFile: (file: File) => Promise<Attachment | null>;
  clearError: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain'];

export const useFileUpload = (): UseFileUploadReturn => {
  const [state, setState] = useState<FileUploadState>({
    isLoading: false,
    error: null,
    progress: 0,
  });

  const convertToBase64 = useCallback(
    (file: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const uploadImage = useCallback(
    async (file: File): Promise<Attachment | null> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Validation
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          throw new Error('نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP أو GIF');
        }

        if (file.size > MAX_IMAGE_SIZE) {
          throw new Error('حجم الصورة كبير جداً. الحد الأقصى 5MB');
        }

        // Get image dimensions
        const { width, height } = await getImageDimensions(file);

        // Convert to base64
        const base64 = await convertToBase64(file);

        // Create object URL for preview
        const url = URL.createObjectURL(file);

        const attachment: Attachment = {
          id: `img_${Date.now()}`,
          type: 'image',
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          base64,
          width,
          height,
        };

        setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
        return attachment;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل تحميل الصورة';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    [convertToBase64, getImageDimensions]
  );

  const uploadAudio = useCallback(
    async (blob: Blob, filename = 'recording.webm'): Promise<Attachment | null> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        if (blob.size > MAX_AUDIO_SIZE) {
          throw new Error('حجم الملف الصوتي كبير جداً. الحد الأقصى 25MB');
        }

        // Convert to base64
        const base64 = await convertToBase64(blob);

        // Create object URL for playback
        const url = URL.createObjectURL(blob);

        // Try to get audio duration
        let duration = 0;
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          duration = audioBuffer.duration;
        } catch {
          // If duration extraction fails, continue without it
        }

        const attachment: Attachment = {
          id: `audio_${Date.now()}`,
          type: 'audio',
          name: filename,
          mimeType: blob.type || 'audio/webm',
          size: blob.size,
          url,
          base64,
          duration,
        };

        setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
        return attachment;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل تحميل الملف الصوتي';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    [convertToBase64]
  );

  const uploadFile = useCallback(
    async (file: File): Promise<Attachment | null> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Validation
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          throw new Error('نوع الملف غير مدعوم. استخدم PDF أو TXT');
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error('حجم الملف كبير جداً. الحد الأقصى 20MB');
        }

        // Convert to base64
        const base64 = await convertToBase64(file);

        // Create object URL
        const url = URL.createObjectURL(file);

        const attachment: Attachment = {
          id: `file_${Date.now()}`,
          type: 'file',
          name: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          base64,
        };

        setState((prev) => ({ ...prev, isLoading: false, progress: 100 }));
        return attachment;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'فشل تحميل الملف';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        return null;
      }
    },
    [convertToBase64]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    uploadImage,
    uploadAudio,
    uploadFile,
    clearError,
  };
};
