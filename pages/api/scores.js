import { neon } from '@neondatabase/serverless';

const API_URL = 'https://sdataprod.ncaa.com/';
const QUERY_HASH = '833b812cd33218fbffa93fa81646e843d0b9bbca75283b2a33a0bf6d65ef9d27';

const STATE_MAP = { P: 'pre', I: 'live', F: 'final' };

// New API roundNumber → DB round (preserves existing schema values)
// roundNumber 1 = First Four (skip), 2 = First Round → 0, … 7 = Championship → 5
function dbRound(roundNumber) {
  return roundNumber >= 2 ? roundNumber - 2 : null;
}

function parseHalf(currentPeriod) {
  const p = currentPeriod?.toLowerCase();
  if (p === '1st' || p === '1st half') return 1;
  if (p === '2nd' || p === '2nd half') return 2;
  return null;
}

export default async function handler(req, res) {
  try {
    const year = req.query.year || new Date().getFullYear();

    const params = new URLSearchParams({
      meta: 'ScoringWidgetChampionship_ncaa',
      extensions: JSON.stringify({
        persistedQuery: { version: 1, sha256Hash: QUERY_HASH },
      }),
      variables: JSON.stringify({
        sportUrl: 'basketball-men',
        division: 1,
        year: Number(year),
      }),
    });

    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status code: ${response.status}`);
    }
    const json = await response.json();

    const games = json.data?.championships?.[0]?.games ?? [];
    const sql = neon(process.env.DATABASE_URL);

    for (const game of games) {
      const roundNumber = game.round?.roundNumber;
      if (roundNumber == null || roundNumber < 2) continue;
      if (!game.teams?.length) continue;

      const round = dbRound(roundNumber);
      const game_state = STATE_MAP[game.gameState] || game.gameState;
      const contest_clock = game.contestClock || null;
      const half = parseHalf(game.currentPeriod);
      const start_time = game.startTimeEpoch
        ? new Date(game.startTimeEpoch * 1000)
        : null;

      const away = game.teams?.find(t => !t.isHome);
      const home = game.teams?.find(t => t.isHome);

      const game_id = game.contestId;
      const team_a = away?.nameShort ?? null;
      const team_b = home?.nameShort ?? null;
      const score_a = away?.score ?? null;
      const score_b = home?.score ?? null;

      const insertQuery = `
        INSERT INTO games (id, team_a, team_b, status, score_a, score_b, time_remaining, start_time, half, round)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          team_a = EXCLUDED.team_a,
          team_b = EXCLUDED.team_b,
          status = EXCLUDED.status,
          score_a = EXCLUDED.score_a,
          score_b = EXCLUDED.score_b,
          time_remaining = EXCLUDED.time_remaining,
          start_time = EXCLUDED.start_time,
          half = EXCLUDED.half,
          round = EXCLUDED.round
          ;
      `;
      const values = [game_id, team_a, team_b, game_state, score_a, score_b, contest_clock, start_time, half, round];
      console.log(values);
      await sql(insertQuery, values);
    }

    res.status(200).json({ message: "Data updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}
