import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql(`SELECT id, team_a, team_b, status, score_a, score_b, time_remaining::varchar as time_remaining, start_time, half, case when status = 'live' then 0 when status = 'pre' then 1 when status = 'final' then 2 else 3 end as status_sort FROM games where round = $1 order by case when status = 'live' then 0 when status = 'pre' then 1 when status = 'final' then 2 else 3 end asc, start_time asc limit 100`, [req.query.round]);
    return res.status(200).json(data);
}