import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const year = req.query.year || new Date().getFullYear();
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql(
        `SELECT id, score_a, score_b, round FROM games
         WHERE status = 'final' AND round IS NOT NULL
           AND EXTRACT(YEAR FROM start_time) = $1
         LIMIT 200`,
        [Number(year)]
    );
    return res.status(200).json(data);
}   