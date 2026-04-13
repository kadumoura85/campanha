type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const PWA_UPDATE_AVAILABLE_EVENT = "campanha:pwa-update-available";

type Listener = () => void;

let deferredPrompt: DeferredPromptEvent | null = null;
const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribePwaPrompt(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function setDeferredPrompt(event: DeferredPromptEvent | null) {
  deferredPrompt = event;
  emitChange();
}

export function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (typeof navigator !== "undefined" && "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isIosSafari() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  return isIosDevice() && /safari/i.test(userAgent) && !/crios|fxios|edgios|opios/i.test(userAgent);
}

export async function promptInstall() {
  if (!deferredPrompt) return false;

  const event = deferredPrompt;
  deferredPrompt = null;
  emitChange();

  await event.prompt();
  await event.userChoice.catch(() => undefined);
  return true;
}
