/**
 * BIPV Design Artifact Wrapper
 *
 * A wrapper component that connects BIPVDesignArtifact to the BIPV context.
 * This is used when rendering in the artifact panel to avoid infinite re-renders
 * from Zustand store updates.
 */

import { useBIPV } from '../../contexts/BIPVContext';
import BIPVDesignArtifact from './BIPVDesignArtifact';

export default function BIPVDesignArtifactWrapper() {
  const {
    buildingImages,
    pvModuleImages,
    generatedImages,
    selectedImageIndex,
    isGenerating,
    setBuildingImages,
    setPVModuleImages,
    removeBuildingImage,
    removePVModuleImage,
    removeGeneratedImage,
    setSelectedImageIndex,
    onGenerate,
  } = useBIPV();

  const handleImagesSelected = (newBuildingImages: File[], newPVModuleImages: File[]) => {
    setBuildingImages(newBuildingImages);
    setPVModuleImages(newPVModuleImages);
  };

  return (
    <BIPVDesignArtifact
      generatedImages={generatedImages}
      selectedImageIndex={selectedImageIndex}
      onSelectImage={setSelectedImageIndex}
      onRemoveImage={removeGeneratedImage}
      onImagesSelected={handleImagesSelected}
      selectedBuildingImages={buildingImages}
      selectedPVModuleImages={pvModuleImages}
      onRemoveBuildingImage={removeBuildingImage}
      onRemovePVModuleImage={removePVModuleImage}
      onGenerate={onGenerate || undefined}
      isGenerating={isGenerating}
    />
  );
}
