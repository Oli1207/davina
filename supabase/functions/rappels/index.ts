// ═══════════════════════════════════════════════════════════════════════════
// Davina — fonction « rappels » (Supabase Edge Function, Deno).
//
// Appelée chaque minute par pg_cron (voir migrations/99_rappels.sql). Pour
// chaque personne abonnée, calcule l'heure locale et envoie :
//   - le rappel du matin (une phrase, seulement s'il reste des actions) ;
//   - l'heure exacte d'une action à heure fixe, puis une relance après la marge
//     de grâce si elle n'est toujours pas cochée ;
//   - une séance placée dans la semaine ;
//   - la rupture d'un jeûne ;
//   - le bilan du soir (45 min avant le coucher) et le bilan du dimanche (19 h).
// push_log garantit qu'un même rappel ne part qu'une fois par jour.
//
// Secrets à définir (Edge Functions > Secrets) :
//   CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Le cron tourne chaque minute ; une fenêtre de 2 min rattrape un passage manqué.
const WINDOW = 2;

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

type Msg = { key: string; title: string; body: string; url: string };
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Jour, minute et jour de semaine dans le fuseau de la personne. */
function localNow(tz: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
    }).formatToParts(at).map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    min: Number(parts.hour) * 60 + Number(parts.minute),
    wd: WEEKDAYS[parts.weekday],
  };
}

const toMin = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('interdit', { status: 401 });
  }

  const { data: subs } = await db.from('push_subscriptions').select('*');
  if (!subs?.length) return Response.json({ sent: 0 });
  const ids = [...new Set(subs.map((s) => s.user_id))];

  const now = new Date();
  const from = new Date(now.getTime() - 36 * 3600e3).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 36 * 3600e3).toISOString().slice(0, 10);

  const [{ data: profiles }, { data: habits }, { data: planned }, { data: checkins }, { data: logs }, { data: fasts }] = await Promise.all([
    db.from('profiles').select('id, display_name, timezone, reminder_time, reminder_on, bed_time').in('id', ids),
    db.from('habits').select('id, user_id, title, full_version, min_version, days, at_time, duration_min, grace_min, notify, per_week').in('user_id', ids).eq('archived', false),
    db.from('planned_sessions').select('id, user_id, habit_id, day, at_time').in('user_id', ids).gte('day', from).lte('day', to),
    db.from('checkins').select('habit_id, day').in('user_id', ids).gte('day', from).lte('day', to),
    db.from('day_logs').select('user_id, day, gratitude, victory, lesson').in('user_id', ids).gte('day', from).lte('day', to),
    db.from('fasts').select('id, user_id, ends_at, intention').in('user_id', ids).is('ended_at', null)
      .gte('ends_at', new Date(now.getTime() - WINDOW * 60e3).toISOString()).lte('ends_at', now.toISOString()),
  ]);

  let sent = 0;
  for (const p of profiles ?? []) {
    const { day, min, wd } = localNow(p.timezone);
    const due = (at: number | null) => at != null && min >= at && min < at + WINDOW;
    const checked = (habitId: string) => (checkins ?? []).some((c) => c.habit_id === habitId && c.day === day);
    const mine = (habits ?? []).filter((h) => h.user_id === p.id);
    const msgs: Msg[] = [];

    for (const h of mine) {
      if (h.per_week != null || !h.at_time || !h.notify || !h.days.includes(wd)) continue;
      const at = toMin(h.at_time)!;
      if (due(at)) msgs.push({ key: `h-${h.id}`, title: h.title, body: h.full_version || 'C\'est l\'heure.', url: '/' });
      const relance = at + Math.max(h.grace_min ?? 15, 10);
      if (due(relance) && !checked(h.id)) {
        msgs.push({ key: `r-${h.id}`, title: `${h.title} : pas encore ?`, body: h.min_version ? `Il n'est pas trop tard. Version 2 minutes : ${h.min_version}.` : 'Il n\'est pas trop tard.', url: '/' });
      }
    }
    for (const s of (planned ?? []).filter((x) => x.user_id === p.id && x.day === day)) {
      const h = mine.find((x) => x.id === s.habit_id);
      if (h && due(toMin(s.at_time))) msgs.push({ key: `p-${s.id}`, title: h.title, body: `Séance prévue maintenant${h.duration_min ? ` (${h.duration_min} min)` : ''}.`, url: '/' });
    }
    for (const f of (fasts ?? []).filter((x) => x.user_id === p.id)) {
      msgs.push({ key: `f-${f.id}`, title: 'Tu peux rompre ton jeûne', body: f.intention ? `Intention : ${f.intention}` : 'Boire doucement, manger léger.', url: '/esprit?onglet=jeune' });
    }

    // Rappel du matin : seulement s'il reste des actions.
    const todo = mine.filter((h) => h.per_week == null && h.days.includes(wd) && !checked(h.id)).length;
    if (p.reminder_on && todo > 0 && due(toMin(p.reminder_time))) {
      msgs.push({
        key: 'matin', title: p.display_name ? `Bonjour ${p.display_name}` : 'Bonjour',
        body: wd === 0 ? 'Dimanche : fais ton bilan de la semaine en 2 minutes.' : todo === 1 ? 'Une action t\'attend. Deux minutes suffisent.' : `${todo} actions t'attendent. Commence par la plus petite.`,
        url: wd === 0 ? '/semaine' : '/',
      });
    }
    // Bilan du soir, 45 minutes avant le coucher, si rien n'est écrit.
    const bed = toMin(p.bed_time);
    const log = (logs ?? []).find((l) => l.user_id === p.id && l.day === day);
    if (bed != null && due(bed - 45) && !(log && (log.gratitude || log.victory || log.lesson))) {
      msgs.push({ key: 'soir', title: 'Bilan du soir', body: 'Merci, victoire du jour : 1 minute.', url: '/' });
    }
    if (wd === 0 && due(19 * 60)) msgs.push({ key: 'dimanche', title: 'Bilan de la semaine', body: 'Regarde ta semaine, puis place la suivante.', url: '/semaine' });
    if (!msgs.length) continue;

    for (const m of msgs) {
      const { error } = await db.from('push_log').insert({ user_id: p.id, key: m.key, day });
      if (error) continue; // déjà envoyé aujourd'hui
      for (const s of subs.filter((x) => x.user_id === p.id)) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.key, badge: todo }),
          );
          sent += 1;
        } catch (e) {
          // Abonnement expiré (téléphone changé, app désinstallée) : on le retire.
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
  }

  return Response.json({ sent });
});
