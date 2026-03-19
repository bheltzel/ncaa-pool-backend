import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Fixture: realistic NCAA GraphQL API payload ─────────────────────────
const FIXTURE = {
  data: {
    championships: [
      {
        __typename: 'Championship',
        championshipId: 6393,
        games: [
          {
            contestId: 6020001,
            gameState: 'F',
            statusCodeDisplay: 'final',
            contestClock: '',
            currentPeriod: 'FINAL',
            startTimeEpoch: 1743112140, // 03-27-2025 23:09 UTC
            startTime: '19:09',
            startDate: '03/27/2025',
            teams: [
              { isHome: false, nameShort: 'Duke', seed: 1, score: 74, isWinner: true },
              { isHome: true, nameShort: 'UNC', seed: 2, score: 68, isWinner: false },
            ],
            round: { roundNumber: 4, title: 'Sweet 16&#174;' },
          },
          {
            contestId: 6020002,
            gameState: 'I',
            statusCodeDisplay: 'live',
            contestClock: '8:42',
            currentPeriod: '1st',
            startTimeEpoch: 1742659800, // 03-22-2025 16:10 UTC
            startTime: '12:10',
            startDate: '03/22/2025',
            teams: [
              { isHome: false, nameShort: 'Kansas', seed: 3, score: 31, isWinner: false },
              { isHome: true, nameShort: 'Gonzaga', seed: 6, score: 28, isWinner: false },
            ],
            round: { roundNumber: 3, title: 'Second Round' },
          },
          {
            contestId: 6020003,
            gameState: 'P',
            statusCodeDisplay: 'pre',
            contestClock: '',
            currentPeriod: '',
            startTimeEpoch: 1743285540, // 03-29-2025 23:09 UTC (approx)
            startTime: '18:09',
            startDate: '03/29/2025',
            teams: [
              { isHome: false, nameShort: 'Houston', seed: 1, score: 0, isWinner: false },
              { isHome: true, nameShort: 'Auburn', seed: 4, score: 0, isWinner: false },
            ],
            round: { roundNumber: 5, title: 'Elite Eight&#174;' },
          },
          {
            contestId: 6020004,
            gameState: 'I',
            statusCodeDisplay: 'live',
            contestClock: '3:15',
            currentPeriod: '2nd',
            startTimeEpoch: 1743890940, // 04-05-2025 22:09 UTC
            startTime: '18:09',
            startDate: '04/05/2025',
            teams: [
              { isHome: false, nameShort: 'UConn', seed: 1, score: 55, isWinner: false },
              { isHome: true, nameShort: 'Purdue', seed: 2, score: 52, isWinner: false },
            ],
            round: { roundNumber: 6, title: 'FINAL FOUR&#174;' },
          },
          {
            contestId: 6020005,
            gameState: 'F',
            statusCodeDisplay: 'final',
            contestClock: '',
            currentPeriod: 'FINAL',
            startTimeEpoch: 1744071600, // 04-07-2025 01:20 UTC (approx)
            startTime: '21:20',
            startDate: '04/07/2025',
            teams: [
              { isHome: false, nameShort: 'UConn', seed: 1, score: 80, isWinner: true },
              { isHome: true, nameShort: 'Duke', seed: 2, score: 72, isWinner: false },
            ],
            round: { roundNumber: 7, title: 'Championship' },
          },
          {
            contestId: 6020006,
            gameState: 'F',
            statusCodeDisplay: 'final',
            contestClock: '',
            currentPeriod: 'FINAL',
            startTimeEpoch: 1742000000,
            startTime: '18:40',
            startDate: '03/17/2025',
            teams: [
              { isHome: false, nameShort: 'UMBC', seed: 16, score: 83, isWinner: false },
              { isHome: true, nameShort: 'Howard', seed: 16, score: 86, isWinner: true },
            ],
            round: { roundNumber: 1, title: 'First Four&#174;' },
          },
          {
            contestId: 6020007,
            gameState: 'P',
            statusCodeDisplay: 'pre',
            contestClock: '',
            currentPeriod: '',
            startTimeEpoch: 1774065600,
            startTime: 'TBA',
            startDate: '03/21/2025',
            teams: [],
            round: { roundNumber: 3, title: 'Second Round' },
          },
        ],
      },
    ],
  },
};

// ── Mock infrastructure ─────────────────────────────────────────────────
let sqlCalls = [];

function mockSql(query, values) {
  sqlCalls.push({ query, values });
  return Promise.resolve([]);
}

function mockNeon(_url) {
  return mockSql;
}

mock.module('@neondatabase/serverless', {
  namedExports: { neon: mockNeon },
});

function installFetchMock(payload = FIXTURE, status = 200) {
  global.fetch = mock.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(payload),
    }),
  );
}

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

const { default: handler } = await import('../pages/api/scores.js');

function makeReq(query = {}) {
  return { query };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return res;
}

// ── Tests ───────────────────────────────────────────────────────────────
describe('scores handler (new API)', () => {
  beforeEach(() => {
    sqlCalls = [];
  });

  it('returns 200 and upserts only games with teams and roundNumber >= 2', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    assert.equal(res._status, 200);
    assert.deepEqual(res._json, { message: 'Data updated successfully' });
    // 7 fixture games: First Four skipped, empty-teams placeholder skipped → 5
    assert.equal(sqlCalls.length, 5, `expected 5 upserts, got ${sqlCalls.length}`);
  });

  it('skips First Four games (roundNumber < 2)', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const insertedIds = sqlCalls.map(c => c.values[0]);
    assert.ok(!insertedIds.includes(6020006), 'First Four game should be skipped');
  });

  it('skips future-round games with empty teams array', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const insertedIds = sqlCalls.map(c => c.values[0]);
    assert.ok(!insertedIds.includes(6020007), 'empty-teams placeholder should be skipped');
  });

  it('maps roundNumber to correct DB round (roundNumber - 2)', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const roundByGameId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values[9]]));
    assert.equal(roundByGameId[6020001], 2, 'Sweet 16 (roundNumber=4) → round 2');
    assert.equal(roundByGameId[6020002], 1, 'Second Round (roundNumber=3) → round 1');
    assert.equal(roundByGameId[6020003], 3, 'Elite Eight (roundNumber=5) → round 3');
    assert.equal(roundByGameId[6020004], 4, 'FINAL FOUR (roundNumber=6) → round 4');
    assert.equal(roundByGameId[6020005], 5, 'Championship (roundNumber=7) → round 5');
  });

  it('maps gameState codes to DB status strings', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const statusByGameId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values[3]]));
    assert.equal(statusByGameId[6020001], 'final');
    assert.equal(statusByGameId[6020002], 'live');
    assert.equal(statusByGameId[6020003], 'pre');
  });

  it('scores are integers from the API (no string parsing needed)', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const byId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values]));
    assert.equal(byId[6020001][4], 74);
    assert.equal(byId[6020001][5], 68);
  });

  it('parses half from currentPeriod', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const halfByGameId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values[8]]));
    assert.equal(halfByGameId[6020002], 1, '"1st" → 1');
    assert.equal(halfByGameId[6020004], 2, '"2nd" → 2');
    assert.equal(halfByGameId[6020001], null, 'FINAL → null');
  });

  it('passes contestClock as time_remaining (null when empty)', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const clockByGameId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values[6]]));
    assert.equal(clockByGameId[6020002], '8:42');
    assert.equal(clockByGameId[6020001], null);
  });

  it('converts startTimeEpoch to a Date', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const byId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values]));
    const startTime = byId[6020001][7];
    assert.ok(startTime instanceof Date, 'start_time should be a Date');
    assert.equal(startTime.getTime(), 1743112140 * 1000);
  });

  it('identifies away/home teams correctly via isHome', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const byId = Object.fromEntries(sqlCalls.map(c => [c.values[0], c.values]));
    // Duke is away (isHome=false → team_a), UNC is home (isHome=true → team_b)
    assert.equal(byId[6020001][1], 'Duke');
    assert.equal(byId[6020001][2], 'UNC');
  });

  it('passes year query param to the API URL', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq({ year: '2025' }), res);

    const fetchUrl = global.fetch.mock.calls[0].arguments[0];
    assert.ok(fetchUrl.includes('"year":2025') || fetchUrl.includes('year%22%3A2025'),
      `URL should contain year=2025: ${fetchUrl}`);
  });

  it('defaults year to current year when not specified', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const fetchUrl = global.fetch.mock.calls[0].arguments[0];
    const currentYear = new Date().getFullYear();
    assert.ok(
      fetchUrl.includes(`"year":${currentYear}`) || fetchUrl.includes(`year%22%3A${currentYear}`),
      `URL should contain year=${currentYear}: ${fetchUrl}`,
    );
  });

  it('returns 500 when fetch fails', async () => {
    installFetchMock(null, 500);
    const res = makeRes();
    await handler(makeReq(), res);

    assert.equal(res._status, 500);
    assert.ok(res._json.error.includes('Failed to fetch'));
  });

  it('upsert query uses INSERT ... ON CONFLICT DO UPDATE', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    const query = sqlCalls[0].query;
    assert.ok(query.includes('INSERT INTO games'), 'should INSERT INTO games');
    assert.ok(query.includes('ON CONFLICT (id) DO UPDATE'), 'should have ON CONFLICT upsert');
  });

  it('passes correct column order in values array', async () => {
    installFetchMock();
    const res = makeRes();
    await handler(makeReq(), res);

    // [game_id, team_a, team_b, game_state, score_a, score_b, contest_clock, start_time, half, round]
    const vals = sqlCalls[0].values;
    assert.equal(vals.length, 10, 'should have 10 parameterized values');
    assert.equal(typeof vals[0], 'number', 'game_id is number (contestId)');
    assert.equal(typeof vals[1], 'string', 'team_a is string');
    assert.equal(typeof vals[2], 'string', 'team_b is string');
    assert.equal(typeof vals[3], 'string', 'game_state is string');
  });
});
