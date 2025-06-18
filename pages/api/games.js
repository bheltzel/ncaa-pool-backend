import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql(`SELECT id, team_a, team_b, status, score_a, score_b, time_remaining::varchar as time_remaining, start_time, half, round FROM games where round = $1 order by case when status = 'live' then 0 when status = 'pre' then 2 when status = 'final' then 1 else 3 end asc, start_time asc limit 100`, [req.query.round]);
    return res.status(200).json(data);
}