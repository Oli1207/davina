import { create } from 'zustand';

/**
 * Installation de l'app sur l'écran d'accueil. Chrome et Edge (Android, ordinateur)
 * proposent un événement qu'on garde pour déclencher l'installation d'un bouton.
 * Safari (iPhone) n'en a pas : on explique les étapes.
 */
export const useInstall = create(() => ({ event: null }));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ event: e });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ event: null }));
}

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '');
export const isAndroid = () => /android/i.test(ua());
export const isMobile = () => /android|iphone|ipad|ipod/i.test(ua()) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Navigateurs intégrés (Facebook, Instagram, TikTok…) : ils ne peuvent pas ajouter à l'écran d'accueil. */
export const inAppBrowser = () => /FBAN|FBAV|Instagram|TikTok|Snapchat|Line\/|MicroMessenger/i.test(ua());

const KEY = 'davina-install-later';
const DAYS = 2;
export const installDismissed = () => {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < DAYS * 86400000; } catch { return false; }
};
export const dismissInstall = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* navigation privée */ } };
