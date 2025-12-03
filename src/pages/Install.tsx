import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Install LawnConnect</CardTitle>
              <CardDescription>
                Add LawnConnect to your home screen for quick access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    LawnConnect is already installed on your device!
                  </p>
                </div>
              ) : isIOS ? (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">To install on iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Tap the Share button in Safari</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Install App
                </Button>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="font-medium">To install on Android:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Tap the menu (three dots) in your browser</li>
                    <li>Tap "Add to Home screen" or "Install app"</li>
                    <li>Tap "Add" to confirm</li>
                  </ol>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Benefits of installing:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Quick access from your home screen</li>
                  <li>• Works offline</li>
                  <li>• Faster loading times</li>
                  <li>• Full-screen experience</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
