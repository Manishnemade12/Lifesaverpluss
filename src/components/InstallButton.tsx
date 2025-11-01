import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS standalone mode
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstallClick = async () => {
    // iOS - show instructions
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS) {
      toast({
        title: 'Install on iOS',
        description: 'Tap the Share button → "Add to Home Screen" to install.',
      });
      return;
    }

    // Android/Desktop - use beforeinstallprompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          toast({
            title: 'Installing...',
            description: 'The app is being installed on your device.',
          });
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install error:', error);
        toast({
          title: 'Installation failed',
          description: 'Please try again or use the browser\'s install option.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Install option not available',
        description: 'Look for the install icon in your browser\'s address bar.',
      });
    }
  };

  // Don't show button if already installed
  if (isInstalled) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      className="bg-emerald-600 hover:bg-emerald-700"
      variant={deferredPrompt ? "default" : "outline"}
    >
      <Download className="mr-2 h-4 w-4" />
      {deferredPrompt ? 'Install App' : 'Install Available'}
    </Button>
  );
};

export default InstallButton;

