/**
 * BIPV Design Artifact Component
 *
 * Always-open artifact panel for BIPV Design agent
 * - Top section: Generated image display with hybrid gallery (thumbnails for ≤5, list for >5)
 * - Bottom section: Image selectors for building and PV modules
 */

import { useState, useRef, useCallback } from 'react';
import type { BIPVGeneratedImage } from '../../contexts/BIPVContext';

// Sample images available for selection
const SAMPLE_BUILDINGS = [
  { id: 'building-1', name: 'Modern Office', path: '/design_images/buildings/building-1.jpg' },
  { id: 'building-2', name: 'Residential Home', path: '/design_images/buildings/building-2.jpg' },
  { id: 'building-3', name: 'Commercial Building', path: '/design_images/buildings/building-3.jpg' },
];

const SAMPLE_MODULES = [
  { id: 'futurasun-ab', name: 'FuturaSun Silk Nova AB', path: '/design_images/modules/futurasun-silk-nova-ab.png' },
  { id: 'futurasun-red', name: 'FuturaSun Silk Nova Red', path: '/design_images/modules/futurasun-silk-nova-red.png' },
  { id: 'futurasun-green', name: 'FuturaSun Silk Nova Green', path: '/design_images/modules/futurasun-silk-nova-green.png' },
];

// Theme colors matching the app's design
const THEME = {
  primary: {
    dark: '#0a1850',
    main: '#1e1b4b',
    light: '#312e81',
  },
  accent: {
    main: '#E9A544',
    light: '#E8BF4F',
  },
  success: '#10b981',
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
  },
};

interface BIPVDesignArtifactProps {
  generatedImages: BIPVGeneratedImage[];
  selectedImageIndex: number | null;
  onSelectImage: (index: number | null) => void;
  onRemoveImage: (index: number) => void;
  onImagesSelected: (buildingImages: File[], pvModuleImages: File[]) => void;
  selectedBuildingImages: File[];
  selectedPVModuleImages: File[];
  onRemoveBuildingImage: (index: number) => void;
  onRemovePVModuleImage: (index: number) => void;
  onGenerate?: (prompt: string) => void;
  isGenerating?: boolean;
}

const MAX_IMAGES = 3;
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const THUMBNAIL_THRESHOLD = 5; // Switch to list view when more than this many images

export default function BIPVDesignArtifact({
  generatedImages,
  selectedImageIndex,
  onSelectImage,
  onRemoveImage,
  onImagesSelected,
  selectedBuildingImages,
  selectedPVModuleImages,
  onRemoveBuildingImage,
  onRemovePVModuleImage,
  onGenerate,
  isGenerating = false,
}: BIPVDesignArtifactProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [pvModuleError, setPVModuleError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showBuildingSamples, setShowBuildingSamples] = useState(false);
  const [showModuleSamples, setShowModuleSamples] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const buildingInputRef = useRef<HTMLInputElement>(null);
  const pvModuleInputRef = useRef<HTMLInputElement>(null);

  // Check if we have images to generate
  const hasImages = selectedBuildingImages.length > 0;

  // Get the currently selected image
  const selectedImage = selectedImageIndex !== null ? generatedImages[selectedImageIndex] : null;

  // Determine view mode: thumbnail strip or list view
  const useListView = generatedImages.length > THUMBNAIL_THRESHOLD;

  // Handle generate button click
  const handleGenerate = () => {
    if (onGenerate && hasImages) {
      const prompt = customPrompt.trim() || 'Replace the existing PV modules on this building with the uploaded module style, keeping them in the same location and maintaining the architectural integrity.';
      onGenerate(prompt);
      setCustomPrompt(''); // Clear after sending
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Download generated image
  const handleDownload = (image: BIPVGeneratedImage) => {
    const byteCharacters = atob(image.imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: image.mimeType });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = image.mimeType === 'image/png' ? 'png' : 'jpg';
    link.download = `bipv-design-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Validate and handle image selection
  const validateAndAddImages = useCallback((
    files: FileList,
    currentImages: File[],
    setError: (error: string | null) => void,
  ): File[] => {
    setError(null);
    const newImages: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check max count
      if (currentImages.length + newImages.length >= MAX_IMAGES) {
        setError(`Maximum ${MAX_IMAGES} images allowed`);
        break;
      }

      // Check size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`Image "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`);
        continue;
      }

      // Check type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, and WebP images are allowed');
        continue;
      }

      newImages.push(file);
    }

    return newImages;
  }, []);

  const handleBuildingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = validateAndAddImages(
      files,
      selectedBuildingImages,
      setBuildingError,
    );

    if (newImages.length > 0) {
      onImagesSelected([...selectedBuildingImages, ...newImages], selectedPVModuleImages);
    }

    // Reset input
    if (buildingInputRef.current) {
      buildingInputRef.current.value = '';
    }
  };

  const handlePVModuleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = validateAndAddImages(
      files,
      selectedPVModuleImages,
      setPVModuleError,
    );

    if (newImages.length > 0) {
      onImagesSelected(selectedBuildingImages, [...selectedPVModuleImages, ...newImages]);
    }

    // Reset input
    if (pvModuleInputRef.current) {
      pvModuleInputRef.current.value = '';
    }
  };

  // Fetch sample image and convert to File
  const handleSelectSampleImage = async (
    sample: { id: string; name: string; path: string },
    type: 'building' | 'module'
  ) => {
    const currentImages = type === 'building' ? selectedBuildingImages : selectedPVModuleImages;

    // Check max count
    if (currentImages.length >= MAX_IMAGES) {
      if (type === 'building') {
        setBuildingError(`Maximum ${MAX_IMAGES} images allowed`);
      } else {
        setPVModuleError(`Maximum ${MAX_IMAGES} images allowed`);
      }
      return;
    }

    setLoadingSample(sample.id);

    try {
      // Fetch the image from public folder
      const response = await fetch(sample.path);
      if (!response.ok) throw new Error('Failed to fetch sample image');

      const blob = await response.blob();
      const extension = sample.path.split('.').pop() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
      const file = new File([blob], `${sample.name.toLowerCase().replace(/\s+/g, '-')}.${extension}`, { type: mimeType });

      // Add to selected images
      if (type === 'building') {
        onImagesSelected([...selectedBuildingImages, file], selectedPVModuleImages);
        setShowBuildingSamples(false);
        setBuildingError(null);
      } else {
        onImagesSelected(selectedBuildingImages, [...selectedPVModuleImages, file]);
        setShowModuleSamples(false);
        setPVModuleError(null);
      }
    } catch (error) {
      console.error('Error loading sample image:', error);
      if (type === 'building') {
        setBuildingError('Failed to load sample image');
      } else {
        setPVModuleError('Failed to load sample image');
      }
    } finally {
      setLoadingSample(null);
    }
  };

  const imageUrl = selectedImage
    ? `data:${selectedImage.mimeType};base64,${selectedImage.imageData}`
    : null;

  // Render thumbnail strip (for ≤5 images)
  const renderThumbnailStrip = () => (
    <div className="thumbnail-strip">
      {generatedImages.map((img, index) => (
        <div
          key={`thumb-${img.id || img.timestamp}-${index}`}
          className={`thumbnail-item ${selectedImageIndex === index ? 'selected' : ''}`}
          onClick={() => onSelectImage(index)}
        >
          <img
            src={`data:${img.mimeType};base64,${img.imageData}`}
            alt={img.title || `Design ${index + 1}`}
          />
          <button
            className="thumbnail-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveImage(index);
            }}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  // Render list view (for >5 images)
  const renderListView = () => (
    <div className="image-list-view">
      {/* Header */}
      <div className="list-header">
        <div className="list-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <div>
          <h3 className="list-title">BIPV Visualizations</h3>
          <p className="list-subtitle">{generatedImages.length} designs generated</p>
        </div>
      </div>

      {/* List items */}
      <div className="list-items">
        {generatedImages.map((img, index) => (
          <div
            key={`list-${img.id || img.timestamp}-${index}`}
            className={`list-item ${selectedImageIndex === index ? 'selected' : ''}`}
            onClick={() => onSelectImage(index)}
          >
            <div className="list-item-thumb">
              <img
                src={`data:${img.mimeType};base64,${img.imageData}`}
                alt={img.title || `Design ${index + 1}`}
              />
            </div>
            <div className="list-item-info">
              <div className="list-item-title">{img.title || `Design ${index + 1}`}</div>
              <div className="list-item-meta">
                {formatTime(img.timestamp)}
                {img.prompt && <span className="list-item-prompt"> • {img.prompt.slice(0, 40)}...</span>}
              </div>
            </div>
            <div className="list-item-actions">
              <button
                className="list-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(img);
                }}
                title="Download"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                className="list-action-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(index);
                }}
                title="Delete"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render detail view (when an image is selected in list mode)
  const renderDetailView = () => (
    <div className="detail-view">
      {/* Back button */}
      <button className="back-button" onClick={() => onSelectImage(null)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Back to Gallery
      </button>

      {/* Image viewer */}
      <div className="image-toolbar">
        <div className="zoom-controls">
          <button className="toolbar-btn" onClick={handleZoomOut} disabled={zoom <= 0.5} title="Zoom out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="toolbar-btn" onClick={handleZoomIn} disabled={zoom >= 3} title="Zoom in">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button className="toolbar-btn" onClick={handleResetZoom} title="Reset zoom">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <div className="action-controls">
          <button className="toolbar-btn" onClick={toggleFullscreen} title="Fullscreen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <button className="toolbar-btn download-btn" onClick={() => selectedImage && handleDownload(selectedImage)} title="Download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className={`image-container ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="image-wrapper" style={{ transform: `scale(${zoom})` }}>
          <img
            src={imageUrl || ''}
            alt={selectedImage?.title || 'Generated BIPV Visualization'}
            className="generated-image"
          />
        </div>
        {isFullscreen && (
          <button className="fullscreen-close" onClick={toggleFullscreen} title="Close">
            ✕
          </button>
        )}
      </div>
    </div>
  );

  // Render single image view with thumbnail strip (for ≤5 images)
  const renderGalleryView = () => (
    <>
      {selectedImage ? (
        <>
          {/* Toolbar */}
          <div className="image-toolbar">
            <div className="zoom-controls">
              <button className="toolbar-btn" onClick={handleZoomOut} disabled={zoom <= 0.5} title="Zoom out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button className="toolbar-btn" onClick={handleZoomIn} disabled={zoom >= 3} title="Zoom in">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button className="toolbar-btn" onClick={handleResetZoom} title="Reset zoom">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <div className="action-controls">
              <button className="toolbar-btn" onClick={toggleFullscreen} title="Fullscreen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
              <button className="toolbar-btn download-btn" onClick={() => handleDownload(selectedImage)} title="Download">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div className={`image-container ${isFullscreen ? 'fullscreen' : ''}`}>
            <div className="image-wrapper" style={{ transform: `scale(${zoom})` }}>
              <img
                src={imageUrl || ''}
                alt={selectedImage.title || 'Generated BIPV Visualization'}
                className="generated-image"
              />
            </div>
            {isFullscreen && (
              <button className="fullscreen-close" onClick={toggleFullscreen} title="Close">
                ✕
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {generatedImages.length > 1 && renderThumbnailStrip()}
        </>
      ) : (
        /* Placeholder */
        <div className="image-placeholder">
          <div className="placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <p className="placeholder-text">Your BIPV visualization will appear here</p>
          <p className="placeholder-hint">Upload building images below and describe your vision in the chat</p>
        </div>
      )}
    </>
  );

  return (
    <div className="bipv-design-artifact">
      {/* Top Section: Generated Image Area */}
      <div className="generated-image-section">
        {generatedImages.length === 0 ? (
          /* Placeholder when no images */
          <div className="image-placeholder">
            <div className="placeholder-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="placeholder-text">Your BIPV visualization will appear here</p>
            <p className="placeholder-hint">Upload building images below and describe your vision in the chat</p>
          </div>
        ) : useListView ? (
          /* List view for >5 images */
          selectedImageIndex !== null ? renderDetailView() : renderListView()
        ) : (
          /* Gallery view with thumbnails for ≤5 images */
          renderGalleryView()
        )}
      </div>

      {/* Divider */}
      <div className="section-divider" />

      {/* Bottom Section: Image Selectors - Single Row */}
      <div className="image-selectors-section">
        <div className="image-selectors-row">
          {/* Building Images */}
          <div className="image-selector">
            <div className="selector-header">
              <div className="selector-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Building</span>
              </div>
              <div className="selector-actions">
                <button
                  className="samples-toggle-btn"
                  onClick={() => setShowBuildingSamples(!showBuildingSamples)}
                  title="Choose from samples"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Samples</span>
                </button>
                <span className="image-count">{selectedBuildingImages.length}/{MAX_IMAGES}</span>
              </div>
            </div>

            {buildingError && (
              <div className="error-message">{buildingError}</div>
            )}

            {/* Sample Images Panel */}
            {showBuildingSamples && (
              <div className="samples-panel">
                <div className="samples-header">
                  <span>Sample Buildings</span>
                  <button className="close-samples-btn" onClick={() => setShowBuildingSamples(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="samples-grid">
                  {SAMPLE_BUILDINGS.map((sample) => (
                    <button
                      key={sample.id}
                      className={`sample-item ${loadingSample === sample.id ? 'loading' : ''}`}
                      onClick={() => handleSelectSampleImage(sample, 'building')}
                      disabled={loadingSample !== null || selectedBuildingImages.length >= MAX_IMAGES}
                      title={sample.name}
                    >
                      <img src={sample.path} alt={sample.name} />
                      {loadingSample === sample.id && (
                        <div className="sample-loading">
                          <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      <span className="sample-name">{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="image-grid">
              {selectedBuildingImages.map((img, index) => (
                <div key={`building-${index}`} className="image-thumbnail">
                  <img src={URL.createObjectURL(img)} alt={`Building ${index + 1}`} />
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveBuildingImage(index)}
                    title="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              {selectedBuildingImages.length < MAX_IMAGES && (
                <button
                  className="add-image-btn"
                  onClick={() => buildingInputRef.current?.click()}
                  title="Add building image"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>

            <input
              ref={buildingInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleBuildingImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Vertical Divider */}
          <div className="vertical-divider" />

          {/* PV Module Images */}
          <div className="image-selector">
            <div className="selector-header">
              <div className="selector-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="3" x2="8" y2="17" />
                  <line x1="16" y1="3" x2="16" y2="17" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span>PV Modules</span>
                <span className="optional-tag">Optional</span>
              </div>
              <div className="selector-actions">
                <button
                  className="samples-toggle-btn"
                  onClick={() => setShowModuleSamples(!showModuleSamples)}
                  title="Choose from samples"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Samples</span>
                </button>
                <span className="image-count">{selectedPVModuleImages.length}/{MAX_IMAGES}</span>
              </div>
            </div>

            {pvModuleError && (
              <div className="error-message">{pvModuleError}</div>
            )}

            {/* Sample Modules Panel */}
            {showModuleSamples && (
              <div className="samples-panel">
                <div className="samples-header">
                  <span>Sample PV Modules</span>
                  <button className="close-samples-btn" onClick={() => setShowModuleSamples(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="samples-grid">
                  {SAMPLE_MODULES.map((sample) => (
                    <button
                      key={sample.id}
                      className={`sample-item ${loadingSample === sample.id ? 'loading' : ''}`}
                      onClick={() => handleSelectSampleImage(sample, 'module')}
                      disabled={loadingSample !== null || selectedPVModuleImages.length >= MAX_IMAGES}
                      title={sample.name}
                    >
                      <img src={sample.path} alt={sample.name} />
                      {loadingSample === sample.id && (
                        <div className="sample-loading">
                          <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                      <span className="sample-name">{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="image-grid">
              {selectedPVModuleImages.map((img, index) => (
                <div key={`pv-${index}`} className="image-thumbnail">
                  <img src={URL.createObjectURL(img)} alt={`PV Module ${index + 1}`} />
                  <button
                    className="remove-btn"
                    onClick={() => onRemovePVModuleImage(index)}
                    title="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              {selectedPVModuleImages.length < MAX_IMAGES && (
                <button
                  className="add-image-btn"
                  onClick={() => pvModuleInputRef.current?.click()}
                  title="Add PV module image"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>

            <input
              ref={pvModuleInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePVModuleImageSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Generate Section */}
        {hasImages && (
          <div className="generate-section">
            <input
              type="text"
              className="prompt-input"
              placeholder="Describe your BIPV vision (optional)... e.g., 'Add solar panels to the south-facing roof with dark blue modules'"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGenerating && hasImages) {
                  handleGenerate();
                }
              }}
              disabled={isGenerating}
            />
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating || !hasImages}
              title="Generate Visualization"
            >
              {isGenerating ? (
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              )}
            </button>
          </div>
        )}

        <p className="help-text">
          {hasImages
            ? 'Press Enter or click the button to generate your BIPV design.'
            : 'Upload at least one building image to get started.'}
        </p>
      </div>

      <style>{`
        .bipv-design-artifact {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 1rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          font-family: 'Inter', 'Open Sans', Arial, sans-serif;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .image-count-badge {
          font-size: 0.75rem;
          font-weight: 600;
          background: ${THEME.primary.main};
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 10px;
        }

        /* Generated Image Section */
        .generated-image-section {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }

        /* Thumbnail Strip */
        .thumbnail-strip {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 0;
          overflow-x: auto;
          flex-shrink: 0;
        }

        .thumbnail-item {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .thumbnail-item:hover {
          border-color: ${THEME.neutral[300]};
        }

        .thumbnail-item.selected {
          border-color: ${THEME.primary.main};
          box-shadow: 0 0 0 2px ${THEME.primary.light}40;
        }

        .thumbnail-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 12px;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .thumbnail-item:hover .thumbnail-remove {
          display: flex;
        }

        .thumbnail-remove:hover {
          background: #dc2626;
        }

        /* List View */
        .image-list-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .list-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, ${THEME.primary.dark} 0%, ${THEME.primary.main} 100%);
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .list-header-icon {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${THEME.accent.main};
        }

        .list-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: white;
        }

        .list-subtitle {
          margin: 0.25rem 0 0;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
        }

        .list-items {
          flex: 1;
          overflow-y: auto;
          border: 1px solid ${THEME.neutral[200]};
          border-radius: 10px;
          background: white;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid ${THEME.neutral[100]};
          transition: background 0.2s;
        }

        .list-item:last-child {
          border-bottom: none;
        }

        .list-item:hover {
          background: ${THEME.neutral[50]};
        }

        .list-item.selected {
          background: ${THEME.primary.dark}08;
          border-left: 3px solid ${THEME.primary.main};
        }

        .list-item-thumb {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .list-item-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .list-item-info {
          flex: 1;
          min-width: 0;
        }

        .list-item-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: ${THEME.neutral[800]};
          margin-bottom: 0.25rem;
        }

        .list-item-meta {
          font-size: 0.75rem;
          color: ${THEME.neutral[500]};
        }

        .list-item-prompt {
          color: ${THEME.neutral[400]};
        }

        .list-item-actions {
          display: flex;
          gap: 0.25rem;
        }

        .list-action-btn {
          padding: 0.375rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: ${THEME.neutral[400]};
          transition: all 0.2s;
        }

        .list-action-btn:hover {
          background: ${THEME.neutral[100]};
          color: ${THEME.neutral[700]};
        }

        .list-action-btn.delete:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        /* Detail View */
        .detail-view {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: ${THEME.neutral[100]};
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: ${THEME.neutral[700]};
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
          transition: background 0.2s;
          width: fit-content;
        }

        .back-button:hover {
          background: ${THEME.neutral[200]};
        }

        .image-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 0.75rem;
        }

        .zoom-controls, .action-controls {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .zoom-level {
          font-size: 0.75rem;
          color: #64748b;
          min-width: 40px;
          text-align: center;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.375rem;
          border: none;
          background: transparent;
          color: #475569;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.75rem;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .download-btn {
          background: #010654;
          color: white;
          padding: 0.375rem 0.75rem;
        }

        .download-btn:hover {
          background: #020970;
          color: white;
        }

        .image-container {
          flex: 1;
          min-height: 200px;
          position: relative;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2000;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.95);
        }

        .image-wrapper {
          transition: transform 0.2s ease;
          transform-origin: center center;
        }

        .generated-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }

        .fullscreen .generated-image {
          max-height: 95vh;
        }

        .fullscreen-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 44px;
          height: 44px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .fullscreen-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Placeholder */
        .image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
          flex: 1;
          min-height: 200px;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          background: #fafafa;
        }

        .placeholder-icon {
          color: #cbd5e1;
          margin-bottom: 1rem;
        }

        .placeholder-text {
          font-size: 1rem;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 0.5rem 0;
        }

        .placeholder-hint {
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 0;
        }

        /* Divider */
        .section-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 0.5rem 0;
        }

        /* Image Selectors Section */
        .image-selectors-section {
          flex-shrink: 0;
        }

        .image-selectors-row {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .vertical-divider {
          width: 1px;
          background: #e2e8f0;
          align-self: stretch;
          min-height: 60px;
        }

        .image-selector {
          flex: 1;
          min-width: 0;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
        }

        .selector-title {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #334155;
        }

        .optional-tag {
          font-size: 0.5rem;
          font-weight: 400;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 0.1rem 0.25rem;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .image-count {
          font-size: 0.625rem;
          color: #94a3b8;
        }

        .error-message {
          font-size: 0.625rem;
          color: #dc2626;
          background: #fef2f2;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.375rem;
          border: 1px solid #fecaca;
        }

        .image-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .image-thumbnail {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .image-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-btn {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: background 0.2s;
        }

        .remove-btn:hover {
          background: rgba(220, 38, 38, 0.8);
        }

        .add-image-btn {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          transition: all 0.2s;
        }

        .add-image-btn:hover {
          border-color: #5C6BC0;
          color: #5C6BC0;
          background: rgba(92, 107, 192, 0.05);
        }

        .help-text {
          font-size: 0.6875rem;
          color: #94a3b8;
          margin: 0.5rem 0 0 0;
          line-height: 1.4;
        }

        /* Generate Section */
        .generate-section {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }

        .prompt-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-family: inherit;
          background: #fafafa;
          color: #1e293b;
          transition: all 0.2s;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #5C6BC0;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(92, 107, 192, 0.1);
        }

        .prompt-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .prompt-input::placeholder {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .generate-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          padding: 0;
          background: linear-gradient(135deg, ${THEME.accent.main} 0%, #d4922e 100%);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(233, 165, 68, 0.3);
        }

        .generate-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #d4922e 0%, #c4820e 100%);
          transform: scale(1.08);
          box-shadow: 0 3px 10px rgba(233, 165, 68, 0.4);
        }

        .generate-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .generate-btn .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Sample Selection Styles */
        .selector-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .samples-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: ${THEME.neutral[100]};
          border: 1px solid ${THEME.neutral[200]};
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.625rem;
          font-weight: 500;
          color: ${THEME.neutral[600]};
          transition: all 0.2s;
        }

        .samples-toggle-btn:hover {
          background: ${THEME.primary.dark}10;
          border-color: ${THEME.primary.main};
          color: ${THEME.primary.main};
        }

        .samples-panel {
          background: white;
          border: 1px solid ${THEME.neutral[200]};
          border-radius: 8px;
          margin-bottom: 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .samples-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: ${THEME.neutral[50]};
          border-bottom: 1px solid ${THEME.neutral[200]};
          font-size: 0.6875rem;
          font-weight: 600;
          color: ${THEME.neutral[700]};
        }

        .close-samples-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: ${THEME.neutral[400]};
          transition: all 0.2s;
        }

        .close-samples-btn:hover {
          background: ${THEME.neutral[200]};
          color: ${THEME.neutral[700]};
        }

        .samples-grid {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          overflow-x: auto;
        }

        .sample-item {
          position: relative;
          flex-shrink: 0;
          width: 72px;
          padding: 0;
          background: white;
          border: 2px solid ${THEME.neutral[200]};
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }

        .sample-item:hover:not(:disabled) {
          border-color: ${THEME.accent.main};
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .sample-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sample-item img {
          width: 100%;
          height: 56px;
          object-fit: cover;
          display: block;
        }

        .sample-item .sample-name {
          display: block;
          padding: 0.25rem 0.375rem;
          font-size: 0.5625rem;
          font-weight: 500;
          color: ${THEME.neutral[600]};
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: ${THEME.neutral[50]};
          border-top: 1px solid ${THEME.neutral[100]};
        }

        .sample-item.loading {
          pointer-events: none;
        }

        .sample-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sample-loading .spinner {
          animation: spin 1s linear infinite;
          color: ${THEME.accent.main};
        }
      `}</style>
    </div>
  );
}
