import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('installBannerDismissed');
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // On iOS, show banner with instructions (no beforeinstallprompt event)
    if (isIOSDevice) {
      // Only show on Safari (other iOS browsers can't install PWAs)
      const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        setShowBanner(true);
      }
      return;
    }

    // For other browsers, listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          {isIOS ? (
            <Share className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Download className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Install LawnConnect</h3>
          {isIOS ? (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                Tap <Share className="inline h-4 w-4 mx-0.5" /> then "Add to Home Screen" to install.
              </p>
              <Button size="sm" variant="outline" className="mt-3" onClick={handleDismiss}>
                Got it
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                Add to your home screen for quick access and offline features.
              </p>
              <Button size="sm" className="mt-3" onClick={handleInstall}>
                Install App
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
