/**
 * BIPV Design Context
 *
 * Provides state for the BIPV Design agent artifact panel
 * This allows the artifact to update without going through Zustand store
 * Supports multiple generated images with hybrid gallery/list view
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface BIPVGeneratedImage {
  imageData: string;
  mimeType: string;
  title?: string;
  prompt?: string;
  timestamp: number;
  id?: number; // Database ID for deduplication
}

interface BIPVContextType {
  // State
  buildingImages: File[];
  pvModuleImages: File[];
  generatedImages: BIPVGeneratedImage[];
  selectedImageIndex: number | null;
  isGenerating: boolean;

  // Actions
  setBuildingImages: (images: File[]) => void;
  setPVModuleImages: (images: File[]) => void;
  addGeneratedImage: (image: Omit<BIPVGeneratedImage, 'timestamp'>) => void;
  removeGeneratedImage: (index: number) => void;
  setSelectedImageIndex: (index: number | null) => void;
  setIsGenerating: (generating: boolean) => void;
  addBuildingImages: (images: File[]) => void;
  addPVModuleImages: (images: File[]) => void;
  removeBuildingImage: (index: number) => void;
  removePVModuleImage: (index: number) => void;
  clearGeneratedImages: () => void;
  clearAll: () => void;

  // Generate handler (set by ChatContainer)
  onGenerate: ((prompt: string) => void) | null;
  setOnGenerate: (handler: ((prompt: string) => void) | null) => void;
}

const BIPVContext = createContext<BIPVContextType | null>(null);

export function BIPVProvider({ children }: { children: ReactNode }) {
  const [buildingImages, setBuildingImages] = useState<File[]>([]);
  const [pvModuleImages, setPVModuleImages] = useState<File[]>([]);
  const [generatedImages, setGeneratedImages] = useState<BIPVGeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [onGenerateHandler, setOnGenerateHandler] = useState<{ fn: ((prompt: string) => void) | null }>({ fn: null });

  // Wrapper to set onGenerate - wraps the function to avoid React treating it as a state updater
  const setOnGenerate = useCallback((handler: ((prompt: string) => void) | null) => {
    setOnGenerateHandler({ fn: handler });
  }, []);

  const onGenerate = onGenerateHandler.fn;

  const addBuildingImages = useCallback((images: File[]) => {
    setBuildingImages(prev => [...prev, ...images].slice(0, 3));
  }, []);

  const addPVModuleImages = useCallback((images: File[]) => {
    setPVModuleImages(prev => [...prev, ...images].slice(0, 3));
  }, []);

  const removeBuildingImage = useCallback((index: number) => {
    setBuildingImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removePVModuleImage = useCallback((index: number) => {
    setPVModuleImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Add a new generated image to the array (newest first)
  // Supports optional timestamp and id for restoring from database
  const addGeneratedImage = useCallback((image: Omit<BIPVGeneratedImage, 'timestamp'> & { timestamp?: number; id?: number }) => {
    const newImage: BIPVGeneratedImage = {
      ...image,
      timestamp: image.timestamp || Date.now(),
      id: image.id,
    };

    setGeneratedImages(prev => {
      // Check for duplicates by database ID (if available) or by image data hash
      if (newImage.id) {
        const exists = prev.some(img => img.id === newImage.id);
        if (exists) {
          console.log('[BIPV] Skipping duplicate image with id:', newImage.id);
          return prev;
        }
      }

      // Also check for duplicate image data (for real-time streaming without ID)
      const imageDataPrefix = newImage.imageData.substring(0, 100);
      const existsByData = prev.some(img => img.imageData.substring(0, 100) === imageDataPrefix);
      if (existsByData) {
        console.log('[BIPV] Skipping duplicate image by data match');
        return prev;
      }

      return [newImage, ...prev];
    });

    // Auto-select the new image
    setSelectedImageIndex(0);
  }, []);

  // Remove a generated image by index
  const removeGeneratedImage = useCallback((index: number) => {
    console.log('[BIPV] removeGeneratedImage called with index:', index);

    setGeneratedImages(prev => {
      console.log('[BIPV] Current images count:', prev.length, 'Removing index:', index);

      // Validate index
      if (index < 0 || index >= prev.length) {
        console.warn('[BIPV] Invalid index for removal:', index, 'Array length:', prev.length);
        return prev;
      }

      const newImages = prev.filter((_, i) => i !== index);
      console.log('[BIPV] New images count after removal:', newImages.length);
      return newImages;
    });

    // Adjust selected index if needed
    setSelectedImageIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return null; // Deselect if removed
      if (prev > index) return prev - 1; // Shift down
      return prev;
    });
  }, []);

  // Clear only generated images (for re-loading from database)
  const clearGeneratedImages = useCallback(() => {
    console.log('[BIPV] clearGeneratedImages called');
    setGeneratedImages([]);
    setSelectedImageIndex(null);
  }, []);

  const clearAll = useCallback(() => {
    console.log('[BIPV] clearAll called');
    setBuildingImages([]);
    setPVModuleImages([]);
    setGeneratedImages([]);
    setSelectedImageIndex(null);
    setIsGenerating(false);
  }, []);

  const value: BIPVContextType = {
    buildingImages,
    pvModuleImages,
    generatedImages,
    selectedImageIndex,
    isGenerating,
    setBuildingImages,
    setPVModuleImages,
    addGeneratedImage,
    removeGeneratedImage,
    setSelectedImageIndex,
    setIsGenerating,
    addBuildingImages,
    addPVModuleImages,
    removeBuildingImage,
    removePVModuleImage,
    clearGeneratedImages,
    clearAll,
    onGenerate,
    setOnGenerate,
  };

  return (
    <BIPVContext.Provider value={value}>
      {children}
    </BIPVContext.Provider>
  );
}

export function useBIPV() {
  const context = useContext(BIPVContext);
  if (!context) {
    throw new Error('useBIPV must be used within a BIPVProvider');
  }
  return context;
}

export { BIPVContext };
