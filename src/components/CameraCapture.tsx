import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access to take a selfie.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera. Please try uploading a file instead.');
      }
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Mirror the image horizontally for selfie
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (!capturedImage) return;

    // Convert base64 to blob
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      });
  }, [capturedImage, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  // Start camera on mount
  useState(() => {
    startCamera();
  });

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      
      {error ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleCancel}>
              Go Back
            </Button>
            <Button onClick={startCamera} disabled={isStarting}>
              Try Again
            </Button>
          </div>
        </div>
      ) : capturedImage ? (
        <div className="space-y-4">
          <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden border-2 border-primary">
            <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={retake} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
            <Button onClick={confirmCapture} className="gap-2">
              <Check className="h-4 w-4" />
              Use Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-muted">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={capturePhoto} disabled={!stream} className="gap-2">
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
