import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const data = await sql(`SELECT id, score_a, score_b, round FROM games where status = 'final' and round is not null limit 100`);
    return res.status(200).json(data);
}