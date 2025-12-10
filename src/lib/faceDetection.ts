import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let detector: any = null;

export async function loadFaceDetector() {
  if (!detector) {
    detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      device: 'webgpu',
    });
  }
  return detector;
}

export async function detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
  try {
    const det = await loadFaceDetector();
    
    // Convert canvas to data URL if needed
    let imageData: string;
    if (imageElement instanceof HTMLCanvasElement) {
      imageData = imageElement.toDataURL('image/jpeg', 0.8);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(imageElement, 0, 0);
      imageData = canvas.toDataURL('image/jpeg', 0.8);
    }

    const results = await det(imageData);
    
    // Check if any detected object is a person (face detection)
    const hasFace = results.some((result: any) => 
      result.label === 'person' && result.score > 0.5
    );
    
    return hasFace;
  } catch (error) {
    console.error('Face detection error:', error);
    // If face detection fails, allow submission but log the error
    return true;
  }
}
