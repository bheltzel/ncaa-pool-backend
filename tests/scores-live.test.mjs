/**
 * Live API diagnostic — hits the real NCAA GraphQL endpoint.
 *
 * Run:  node tests/scores-live.test.mjs
 *   or: node tests/scores-live.test.mjs 2025
 */

const API_URL = 'https://sdataprod.ncaa.com/';
const QUERY_HASH = '833b812cd33218fbffa93fa81646e843d0b9bbca75283b2a33a0bf6d65ef9d27';

const STATE_LABELS = { P: 'pre', I: 'live', F: 'final' };

const year = Number(process.argv[2] || new Date().getFullYear());

const params = new URLSearchParams({
  meta: 'ScoringWidgetChampionship_ncaa',
  extensions: JSON.stringify({
    persistedQuery: { version: 1, sha256Hash: QUERY_HASH },
  }),
  variables: JSON.stringify({
    sportUrl: 'basketball-men',
    division: 1,
    year,
  }),
});

const url = `${API_URL}?${params}`;
console.log(`=== NCAA Scoreboard API Diagnostic (year=${year}) ===\n`);
console.log(`GET ${url}\n`);

const res = await fetch(url);
console.log(`→ HTTP ${res.status} ${res.ok ? 'OK' : 'FAIL'}\n`);

if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}

const json = await res.json();
if (json.errors) {
  console.log('GraphQL errors:', JSON.stringify(json.errors, null, 2));
  process.exit(1);
}

const games = json.data?.championships?.[0]?.games ?? [];
console.log(`Total games: ${games.length}\n`);

const byRound = {};
for (const g of games) {
  const rn = g.round?.roundNumber ?? '?';
  const rt = g.round?.title ?? '?';
  if (!byRound[rn]) byRound[rn] = { title: rt, games: [] };
  byRound[rn].games.push(g);
}

for (const rn of Object.keys(byRound).sort((a, b) => a - b)) {
  const { title, games: rGames } = byRound[rn];
  const dbRound = rn >= 2 ? rn - 2 : 'SKIP';
  console.log(`── Round ${rn} → DB round ${dbRound}: ${title} (${rGames.length} games) ──`);
  for (const g of rGames.slice(0, 4)) {
    const away = g.teams?.find(t => !t.isHome);
    const home = g.teams?.find(t => t.isHome);
    const state = STATE_LABELS[g.gameState] || g.gameState;
    console.log(
      `  [${g.contestId}] (${away?.seed}) ${away?.nameShort} ${away?.score ?? '-'} @ ` +
      `(${home?.seed}) ${home?.nameShort} ${home?.score ?? '-'}  ` +
      `state=${state}  clock=${g.contestClock || '-'}  period=${g.currentPeriod || '-'}`,
    );
  }
  if (rGames.length > 4) console.log(`  ... and ${rGames.length - 4} more`);
  console.log();
}

console.log('Done.');
