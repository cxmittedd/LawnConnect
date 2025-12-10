import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { detectFaces } from '@/lib/faceDetection';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [isValidating, setIsValidating] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setFaceError(null);
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
    setFaceError(null);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setFaceError(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(async () => {
    if (!capturedImage || !canvasRef.current) return;

    setIsValidating(true);
    setFaceError(null);

    try {
      // Detect face in the captured image
      const hasFace = await detectFaces(canvasRef.current);
      
      if (!hasFace) {
        setFaceError('No face detected. Please ensure your face is clearly visible and try again.');
        setIsValidating(false);
        return;
      }

      // Convert base64 to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    } catch (err) {
      console.error('Validation error:', err);
      // Allow submission if face detection fails due to technical issues
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    } finally {
      setIsValidating(false);
    }
  }, [capturedImage, onCapture]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
          
          {faceError && (
            <Alert variant="destructive" className="max-w-sm mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{faceError}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={retake} disabled={isValidating} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
            <Button onClick={confirmCapture} disabled={isValidating} className="gap-2">
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Use Photo
                </>
              )}
            </Button>
          </div>
          
          {isValidating && (
            <p className="text-xs text-center text-muted-foreground">
              Checking for face in photo...
            </p>
          )}
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
          <p className="text-xs text-center text-muted-foreground">
            Position your face clearly in the frame
          </p>
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
