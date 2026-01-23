import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let detector: any = null;
let isLoading = false;
let loadError: Error | null = null;

export async function loadFaceDetector() {
  // If already loading, wait for completion
  if (isLoading) {
    return new Promise((resolve) => {
      const checkLoaded = setInterval(() => {
        if (!isLoading) {
          clearInterval(checkLoaded);
          resolve(detector);
        }
      }, 100);
    });
  }

  if (detector) return detector;
  if (loadError) throw loadError;

  isLoading = true;
  
  try {
    // Try WebGPU first, fall back to WASM (CPU)
    try {
      detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
        device: 'webgpu',
      });
      console.log('Face detection initialized with WebGPU');
    } catch (webgpuError) {
      console.log('WebGPU not available, falling back to CPU:', webgpuError);
      // Fall back to CPU/WASM
      detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
      console.log('Face detection initialized with CPU');
    }
    return detector;
  } catch (error) {
    loadError = error as Error;
    console.error('Failed to load face detector:', error);
    throw error;
  } finally {
    isLoading = false;
  }
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
      if (!ctx) {
        console.warn('Could not get canvas context for face detection');
        return true; // Allow submission if we can't process
      }
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
