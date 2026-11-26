import { useSyncExternalStore } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallState {
  isInstalled: boolean;
  canPromptNatively: boolean;
}

const listeners = new Set<() => void>();
let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: PwaInstallState = {
  isInstalled: false,
  canPromptNatively: false,
};

function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ===
    true
  );
}

function detectIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMatch = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMatch || iosStandalone || isCapacitorNative();
}

function updateSnapshot(): void {
  const nextInstalled = detectIsInstalled();
  const nextCanPrompt = deferredPrompt !== null;
  if (snapshot.isInstalled === nextInstalled && snapshot.canPromptNatively === nextCanPrompt) {
    return;
  }
  snapshot = {
    isInstalled: nextInstalled,
    canPromptNatively: nextCanPrompt,
  };
  listeners.forEach((listener) => listener());
}

/** Captures browser install prompt and standalone installation state once at app startup. */
export function initPwaInstall(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  snapshot = {
    isInstalled: detectIsInstalled(),
    canPromptNatively: false,
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    updateSnapshot();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    snapshot = {
      isInstalled: true,
      canPromptNatively: false,
    };
    listeners.forEach((listener) => listener());
  });

  const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
  mediaQuery?.addEventListener?.('change', updateSnapshot);
}

/** Registers the minimal lifecycle service worker in production web builds. */
export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || isCapacitorNative()) return;

  const register = () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

function subscribe(listener: () => void): () => void {
  initPwaInstall();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PwaInstallState {
  return snapshot;
}

/** Triggers the native install prompt when available, otherwise indicates manual instructions are needed. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'manual'> {
  if (!deferredPrompt) {
    return 'manual';
  }
  const currentPrompt = deferredPrompt;
  deferredPrompt = null;
  updateSnapshot();

  await currentPrompt.prompt();
  const choice = await currentPrompt.userChoice;
  return choice.outcome;
}

/** Exposes reactive PWA installability state and prompt trigger for React components. */
export function usePwaInstall() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...state,
    promptInstall,
  };
}
