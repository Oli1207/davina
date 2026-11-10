/**
 * Abonnement aux notifications push (Web Push, standard VAPID).
 * Sur iPhone, ca ne marche que si Davina a ete ajoutee a l'ecran d'accueil
 * (iOS 16.4 ou plus) et ouverte depuis l'icone.
 */
import { supabase, unwrap } from './supabase';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function pushSupport() {
  if (!VAPID) return { ok: false, reason: 'La clé VAPID publique manque dans le fichier .env.' };
  if (isIos() && !isStandalone()) return { ok: false, reason: 'Sur iPhone : ajoute d\'abord Davina à l\'écran d\'accueil (Partager → Sur l\'écran d\'accueil), puis ouvre l\'app depuis l\'icône.' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, reason: 'Ce navigateur ne gère pas les notifications.' };
  return { ok: true };
}

function keyToBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function subscribePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications refusées. Tu peux les réactiver dans les réglages du téléphone.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID) }));
  const json = sub.toJSON();
  unwrap(await supabase.from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' }));
  return sub;
}

export async function unsubscribePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Pastille sur l'icone : ce qu'il reste a faire aujourd'hui. */
export function setBadge(count) {
  try {
    if (count > 0) navigator.setAppBadge?.(count);
    else navigator.clearAppBadge?.();
  } catch { /* non supporte */ }
}
