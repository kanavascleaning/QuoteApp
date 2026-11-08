import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const applyingRef = useRef(false);

  useEffect(() => {
    if (
      !import.meta.env.PROD ||
      Capacitor.isNativePlatform() ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    const basePath = import.meta.env.BASE_URL;
    const serviceWorkerUrl = `${basePath}sw.js`;

    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') return;
      void registration?.update().catch(() => {
        // Offline devices will check again the next time the app is online.
      });
    };

    const handleControllerChange = () => {
      if (applyingRef.current) window.location.reload();
    };

    void navigator.serviceWorker
      .register(serviceWorkerUrl, { scope: basePath })
      .then((currentRegistration) => {
        if (disposed) return;
        registration = currentRegistration;

        if (currentRegistration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(currentRegistration.waiting);
        }

        currentRegistration.addEventListener('updatefound', () => {
          const installingWorker = currentRegistration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installingWorker);
              setIsDismissed(false);
            }
          });
        });

        checkForUpdate();
      })
      .catch((error: unknown) => {
        console.error('Unable to register offline app support.', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener('focus', checkForUpdate);
    document.addEventListener('visibilitychange', checkForUpdate);
    const updateTimer = window.setInterval(checkForUpdate, 60 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('focus', checkForUpdate);
      document.removeEventListener('visibilitychange', checkForUpdate);
    };
  }, []);

  if (!waitingWorker || isDismissed) return null;

  function applyUpdate() {
    if (!waitingWorker) return;
    applyingRef.current = true;
    setIsApplying(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  return (
    <aside className="pwa-update-prompt" role="status" aria-live="polite">
      <div className="pwa-update-copy">
        <strong>A new version is ready</strong>
        <span>Your saved quotes and price lists will stay on this device.</span>
      </div>
      <div className="pwa-update-actions">
        <button type="button" onClick={applyUpdate} disabled={isApplying}>
          {isApplying ? 'Updating…' : 'Update now'}
        </button>
        <button
          className="pwa-update-later"
          type="button"
          onClick={() => setIsDismissed(true)}
          disabled={isApplying}
        >
          Later
        </button>
      </div>
    </aside>
  );
}
