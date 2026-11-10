import { useEffect, useState } from 'react';
import { Bell, EllipsisVertical, Share, SquarePlus, Smartphone } from 'lucide-react';
import { currentSubscription, isIos, isStandalone, pushSupport, subscribePush } from '../lib/push';
import { dismissInstall, inAppBrowser, installDismissed, isAndroid, isMobile, useInstall } from '../lib/install';
import { toast } from './toast';
import { Button, Sheet } from './ui';

/**
 * Invite à installer Davina sur l'écran d'accueil, puis à activer les rappels.
 * Sur iPhone, les notifications n'existent que dans l'app installée : l'installation passe d'abord.
 * Disparaît toute seule quand tout est en place. `always` : affichée même après « Plus tard » (réglages).
 */
export default function InstallCard({ always = false }) {
  const event = useInstall((s) => s.event);
  const [subscribed, setSubscribed] = useState(null);
  const [perm, setPerm] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [steps, setSteps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [later, setLater] = useState(() => !always && installDismissed());

  useEffect(() => { currentSubscription().then((s) => setSubscribed(!!s)).catch(() => setSubscribed(false)); }, []);

  const standalone = isStandalone();
  const support = pushSupport();
  let kind = null;
  if (!standalone && isMobile()) kind = 'install';
  else if (subscribed === false && support.ok) kind = perm === 'denied' ? 'denied' : 'enable';
  if (!kind || later) return null;

  const enable = async () => {
    setBusy(true);
    try { await subscribePush(); setSubscribed(true); setPerm('granted'); toast('Rappels activés ✓'); } catch (e) { setPerm(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'); toast(e.message, { tone: 'error' }); }
    setBusy(false);
  };
  const install = async () => {
    if (event) { event.prompt(); await event.userChoice.catch(() => {}); useInstall.setState({ event: null }); } else setSteps(true);
  };
  const postpone = () => { dismissInstall(); setLater(true); };

  const copy = {
    install: { icon: Smartphone, title: isIos() ? 'Installe Davina sur ton iPhone' : 'Installe Davina sur ton téléphone', text: 'Elle s\'ouvre comme une vraie app, plein écran, et c\'est la seule façon de recevoir tes rappels.', action: event ? 'Installer' : 'Comment faire ?', run: install },
    enable: { icon: Bell, title: 'Active tes rappels', text: 'Un rappel le matin, et à l\'heure exacte de tes actions. Une seule touche.', action: 'Activer les rappels', run: enable },
    denied: { icon: Bell, title: 'Les rappels sont bloqués', text: isIos() ? 'Ouvre les Réglages de l\'iPhone → Notifications → Davina, puis autorise-les.' : 'Autorise les notifications pour ce site dans les réglages de ton navigateur, puis rouvre Davina.', action: null },
  }[kind];

  return (
    <>
      <section className="red-block mb-4 p-4 fade-in" aria-label={copy.title}>
        <div className="flex items-start gap-3">
          <copy.icon className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-tight">{copy.title}</p>
            <p className="mt-1 text-sm opacity-95">{copy.text}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {copy.action && <button type="button" className="btn btn-md flex-1 bg-white font-bold text-rouge" onClick={copy.run} disabled={busy}>{busy ? '…' : copy.action}</button>}
          {!always && <button type="button" className="btn btn-md px-3 font-semibold text-white/90" onClick={postpone}>Plus tard</button>}
        </div>
      </section>

      <Sheet open={steps} onClose={() => setSteps(false)} title="Installer Davina">
        {isIos() ? <IosSteps /> : <AndroidSteps />}
        <Button size="lg" className="mt-4 w-full" onClick={() => setSteps(false)}>J'ai compris</Button>
      </Sheet>
    </>
  );
}

function Step({ n, icon: Icon, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rouge font-display text-sm font-bold text-white num">{n}</span>
      <span className="min-w-0 flex-1 pt-0.5">{children}</span>
      {Icon && <Icon className="mt-1 h-5 w-5 shrink-0 text-rouge" aria-hidden="true" />}
    </li>
  );
}

function IosSteps() {
  return (
    <div className="space-y-3">
      {inAppBrowser() && <p className="rounded-sm border-l-4 border-rouge bg-rouge-soft px-3 py-2 text-sm"><b>Tu es dans le navigateur d'une autre app.</b> Ouvre d'abord l'adresse de Davina dans <b>Safari</b> : c'est là qu'on peut l'installer.</p>}
      <ol className="space-y-4">
        <Step n={1} icon={Share}>Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut), en bas de l'écran.</Step>
        <Step n={2} icon={SquarePlus}>Fais défiler et touche <b>« Sur l'écran d'accueil »</b>.</Step>
        <Step n={3}>Touche <b>« Ajouter »</b> en haut à droite.</Step>
        <Step n={4}>Ferme Safari et <b>ouvre Davina depuis son icône</b> sur ton écran d'accueil. Elle te proposera alors d'activer les rappels.</Step>
      </ol>
      <p className="text-sm text-muted">Si tu ne vois pas « Sur l'écran d'accueil », ouvre l'adresse dans Safari, ou mets ton iPhone à jour (iOS 16.4 ou plus pour les rappels).</p>
    </div>
  );
}

function AndroidSteps() {
  return (
    <div className="space-y-3">
      <ol className="space-y-4">
        <Step n={1} icon={EllipsisVertical}>Touche le menu <b>⋮</b> de ton navigateur (en haut à droite).</Step>
        <Step n={2}>Touche <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</Step>
        <Step n={3}>Confirme, puis <b>ouvre Davina depuis son icône</b>. Elle te proposera d'activer les rappels.</Step>
      </ol>
      {!isAndroid() && <p className="text-sm text-muted">Sur ordinateur, Chrome et Edge proposent une icône d'installation dans la barre d'adresse.</p>}
    </div>
  );
}
