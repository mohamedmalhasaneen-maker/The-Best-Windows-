import { useEffect, useState, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standaloneMatch =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as { standalone?: boolean }).standalone === true);
      setIsStandalone(Boolean(standaloneMatch));
    };

    checkStandalone();

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const iosDevice =
      /iPad|iPhone|iPod/.test(ua) &&
      typeof window !== 'undefined' &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(iosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(display-mode: standalone)')
        : null;
    const handleModeChange = () => checkStandalone();

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    mq?.addEventListener('change', handleModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mq?.removeEventListener('change', handleModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    return outcome;
  }, [deferredPrompt]);

  return {
    canInstall: !isStandalone && !isInstalled && (Boolean(deferredPrompt) || isIos),
    hasNativePrompt: Boolean(deferredPrompt),
    isIos,
    isStandalone,
    isInstalled,
    promptInstall,
  };
}

export function useServiceWorkerUpdater(isOnline: boolean) {
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      swRegRef.current = registration;
      // Periodic gentle update check (every 60 mins) while online
      window.setInterval(() => {
        if (navigator.onLine) {
          void registration.update().catch(() => {});
        }
      }, 60 * 60 * 1000);
    },
    onRegisterError(err) {
      console.warn('[PWA] Service Worker registration warning:', err);
    },
  });

  // Trigger background SW check automatically upon reconnect without discarding user drafts
  useEffect(() => {
    if (isOnline && swRegRef.current) {
      void swRegRef.current.update().catch(() => {});
    }
  }, [isOnline]);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  };
}
