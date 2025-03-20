// import { Pool } from 'pg';
import moment from 'moment-timezone';
import { neon } from '@neondatabase/serverless';

// This handler function will run when the API endpoint is called.
export default async function handler(req, res) {
  try {
    // Define the URL from which to fetch data.
    const url = "https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/2025/03/20/scoreboard.json";
    
    // Fetch the JSON data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status code: ${response.status}`);
    }
    const data = await response.json();
    
    // Create a connection pool using environment variables
    // const pool = new Pool({
    //   host: process.env.POSTGRES_HOST,
    //   database: process.env.PGDATABASE,
    //   user: process.env.PGUSER,
    //   password: process.env.POSTGRES_PASSWORD
    // });
    
    // const data = await sql`SELECT id, team_a, team_b, status, score_a, score_b, time_remaining::varchar, start_time FROM games limit 100`;
    
    // Helper function to parse the start date and time into a JavaScript Date
    function parseStartTimestamp(startDateStr, startTimeStr) {
      // Remove " ET" from the time string if present
      const startTimeClean = startTimeStr.replace(" ET", "");
      const combinedStr = `${startDateStr} ${startTimeClean}`;
      // Parse using moment-timezone with the expected format and Eastern Time zone.
      const dt = moment.tz(combinedStr, "MM-DD-YYYY h:mmA", "America/New_York");
      return dt.toDate();
    }
    
    const sql = neon(process.env.DATABASE_URL);

    // Loop through each game in the fetched JSON and perform an upsert into the database
    for (const item of data.games) {
      const game = item.game;
      const game_id = parseInt(game.gameID, 10);
      const team_a = game.away.names.short;
      const team_b = game.home.names.short;
      const game_state = game.gameState;
      
      // Convert score strings to integers (or use null if empty)
      const score_a = game.away.score ? parseInt(game.away.score, 10) : null;
      const score_b = game.home.score ? parseInt(game.home.score, 10) : null;
      
      // contestClock may be empty so use null if not provided
      const contest_clock = game.contestClock ? game.contestClock : null;
      
      // Parse the start time using the helper function
      const start_time = parseStartTimestamp(game.startDate, game.startTime);

      var half = null;
      if (game.currentPeriod === '1ST HALF') {
        half = 1
      } else if (game.currentPeriod === '2ND HALF') {
        half = 2
      };
      
      // Define the upsert query with parameterized values for safety
      const insertQuery = `
        INSERT INTO games (id, team_a, team_b, status, score_a, score_b, time_remaining, start_time, half)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          team_a = EXCLUDED.team_a,
          team_b = EXCLUDED.team_b,
          status = EXCLUDED.status,
          score_a = EXCLUDED.score_a,
          score_b = EXCLUDED.score_b,
          time_remaining = EXCLUDED.time_remaining,
          start_time = EXCLUDED.start_time,
          half = EXCLUDED.half
          ;
      `;
      const values = [game_id, team_a, team_b, game_state, score_a, score_b, contest_clock, start_time, half];
      
      // Execute the query
    //   await pool.query(insertQuery, values);
      await sql(insertQuery, values)
    }
    
    // Close the connection pool
    // await pool.end();
    
    // Respond with a success message
    res.status(200).json({ message: "Data updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
}