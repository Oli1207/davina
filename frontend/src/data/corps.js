// ─── Seances guidees sans materiel ─────────────────────────────────────────

/** Construit un circuit : chaque exercice `work` secondes, `rest` de repos, `rounds` tours. */
function circuit(exercises, { work, rest, rounds, roundRest = 60 }) {
  const steps = [{ name: 'Échauffement', sec: 180, cue: 'Marche sur place, cercles de bras, rotations des hanches.' }];
  for (let r = 1; r <= rounds; r += 1) {
    exercises.forEach(([name, cue], i) => {
      steps.push({ name, sec: work, cue, round: r });
      const last = i === exercises.length - 1;
      if (!last) steps.push({ name: 'Repos', sec: rest, rest: true });
      else if (r < rounds) steps.push({ name: 'Récupération', sec: roundRest, rest: true, cue: 'Bois une gorgée d\'eau.' });
    });
  }
  steps.push({ name: 'Étirements', sec: 180, cue: 'Cuisses, mollets, dos, épaules. Respire lentement.' });
  return steps;
}

export const ROUTINES = [
  {
    key: 'decouverte', title: 'Découverte', level: 'Douce',
    note: 'Pour reprendre sans se blesser. Idéale les jours de jeûne ou de fatigue.',
    steps: circuit([
      ['Squat sur chaise', 'Assieds-toi et relève-toi sans les mains, dos droit.'],
      ['Pompes contre le mur', 'Corps gainé, descends la poitrine vers le mur.'],
      ['Montées de genoux lentes', 'Alterne, bras qui accompagnent.'],
      ['Pont fessier', 'Allongée, pieds au sol, monte le bassin et serre.'],
    ], { work: 40, rest: 20, rounds: 2 }),
  },
  {
    key: 'tonus', title: 'Tonus', level: 'Moyenne',
    note: 'Renforcement de tout le corps. Le cœur de la semaine.',
    steps: circuit([
      ['Squats', 'Pieds largeur d\'épaules, descends comme pour t\'asseoir.'],
      ['Pompes sur les genoux', 'Mains sous les épaules, descends lentement.'],
      ['Fentes alternées', 'Grand pas en avant, genou arrière vers le sol.'],
      ['Gainage', 'Sur les avant-bras, corps en planche, ne creuse pas le dos.'],
      ['Jumping jacks', 'Ou version sans saut : pas de côté + bras.'],
      ['Superman', 'Sur le ventre, lève bras et jambes, tiens 2 s.'],
    ], { work: 40, rest: 20, rounds: 3 }),
  },
  {
    key: 'danse', title: 'Cardio danse', level: 'Énergique',
    note: 'Mets ta playlist (coupé-décalé, gospel, afrobeat) et suis le minuteur.',
    steps: circuit([
      ['Pas chassés', 'De gauche à droite, bras libres.'],
      ['Genoux hauts en rythme', 'Sur le temps de la musique.'],
      ['Talons-fesses', 'Rapide et léger.'],
      ['Pas libre', 'Danse comme tu veux, mais ne t\'arrête pas.'],
      ['Squat + bras en l\'air', 'Descends, remonte et lève les bras.'],
    ], { work: 60, rest: 15, rounds: 3, roundRest: 45 }),
  },
  {
    key: 'marche', title: 'Marche active', level: 'Douce',
    note: 'La version légère du jour : 10 minutes comptent.',
    steps: [
      { name: 'Marche tranquille', sec: 120, cue: 'Épaules relâchées.' },
      { name: 'Marche rapide', sec: 360, cue: 'Tu dois pouvoir parler, mais pas chanter.' },
      { name: 'Retour au calme', sec: 120, cue: 'Ralentis, respire par le nez.' },
    ],
  },
];

export const routineMinutes = (r) => Math.round(r.steps.reduce((s, x) => s + x.sec, 0) / 60);

// ─── Sucre et sel ──────────────────────────────────────────────────────────

export const SOS_ALTERNATIVES = {
  sucre: [
    'Un grand verre d\'eau, d\'un trait',
    'Un fruit entier (orange, papaye, banane)',
    'Une poignée d\'arachides grillées non salées',
    'Marcher 5 minutes dehors',
    'Se brosser les dents',
    'Appeler ou écrire à quelqu\'un',
  ],
  sel: [
    'Un grand verre d\'eau',
    'Assaisonner avec citron, ail, oignon, gingembre ou piment',
    'Des légumes crus (concombre, carotte)',
    'Goûter avant de saler : souvent ça suffit',
  ],
};

export const HIDDEN_SOURCES = {
  sucre: ['Sodas et jus en poudre', 'Sucre dans la bouillie, le thé, le café', 'Biscuits, gâteaux, beignets sucrés', 'Lait concentré sucré', 'Yaourts sucrés et « jus de fruits » industriels'],
  sel: ['Cubes d\'assaisonnement (première source cachée)', 'Chips, cacahuètes salées', 'Charcuterie, sardines en boîte', 'Sauces industrielles, mayonnaise', 'Pain et attiéké du commerce (souvent salés)'],
};

export const TRIGGERS = ['Stress', 'Fatigue', 'Ennui', 'Faim', 'Émotion', 'Social', 'Habitude'];

function moment(iso) {
  const h = new Date(iso).getHours();
  if (h < 12) return 'le matin';
  if (h < 18) return "l'après-midi";
  if (h < 22) return 'le soir';
  return 'tard le soir';
}

/** Ce que les envies révèlent : déclencheur le plus fréquent, moment de la journée, taux de réussite. */
export function cravingInsights(cravings, kind) {
  const list = cravings.filter((c) => !kind || c.kind === kind);
  if (list.length < 3) return [];
  const tally = (f) => Object.entries(list.reduce((m, c) => { const k = f(c); if (k) m[k] = (m[k] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]);
  const out = [];
  const [trig] = tally((c) => c.trigger);
  if (trig) out.push(`${Math.round((trig[1] / list.length) * 100)} % de tes envies viennent avec : ${trig[0].toLowerCase()}.`);
  const [when] = tally((c) => moment(c.at));
  if (when) out.push(`Elles arrivent surtout ${when[0]} (${when[1]} sur ${list.length}).`);
  const decided = list.filter((c) => c.resisted != null);
  if (decided.length) out.push(`Tu as tenu ${decided.filter((c) => c.resisted).length} fois sur ${decided.length}.`);
  return out;
}

export const MEALS = [['matin', 'Petit-déjeuner'], ['midi', 'Déjeuner'], ['soir', 'Dîner'], ['collation', 'Collation']];
export const QUALITY = [[1, 'Équilibré'], [2, 'Moyen'], [3, 'Écart']];
export const MILESTONES = [3, 7, 14, 21, 30, 45, 60];
