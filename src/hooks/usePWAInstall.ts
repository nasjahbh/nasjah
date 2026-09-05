import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined') {
      return (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith('android-app://');
    
    if (isStandalone) return true;
    try {
      return localStorage.getItem('pwa_app_installed') === 'true';
    } catch {
      return false;
    }
  });

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Initial check from global variable if already captured
    const globalPrompt = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
      setIsInstalled(false);
    }

    // Check display mode changes (e.g. user opens in standalone mode)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        try { localStorage.setItem('pwa_app_installed', 'true'); } catch (_) {}
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      // If browser triggered install prompt, it is definitely not installed currently
      setIsInstalled(false);
      try { localStorage.removeItem('pwa_app_installed'); } catch (_) {}
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      try { localStorage.setItem('pwa_app_installed', 'true'); } catch (_) {}
      setDeferredPrompt(null);
      (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
    };

    const handlePromptReady = () => {
      const p = (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;
      if (p) {
        setDeferredPrompt(p);
        setIsInstalled(false);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('pwa-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('pwa-installed', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    let promptEvent = deferredPrompt || (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt;

    if (!promptEvent) {
      // Wait briefly (up to 1200ms) in case beforeinstallprompt is in flight
      promptEvent = await new Promise<BeforeInstallPromptEvent | null>((resolve) => {
        const handler = () => {
          window.removeEventListener('pwa-prompt-ready', handler);
          resolve((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null);
        };
        window.addEventListener('pwa-prompt-ready', handler);
        setTimeout(() => {
          window.removeEventListener('pwa-prompt-ready', handler);
          resolve((window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt || null);
        }, 1200);
      });
    }

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          try { localStorage.setItem('pwa_app_installed', 'true'); } catch (_) {}
          setDeferredPrompt(null);
          (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent | null }).__pwaInstallPrompt = null;
          return true;
        }
      } catch (err) {
        console.warn('Install prompt execution failed:', err);
      }
      return false;
    }

    // Direct native share fallback without showing manual step-by-step modal
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'دار نَسْجَة للأقمشة الراقية',
          text: 'تطبيق إدارة دار نَسْجَة للأقمشة الراقية',
          url: window.location.href,
        });
        return true;
      } catch {
        // Dismissed share
      }
    }

    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt || !!(typeof window !== 'undefined' && (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt),
    isInstalled,
    isIOS,
    install,
  };
}
