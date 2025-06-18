// import { Pool } from 'pg';
import moment from 'moment-timezone';
import { neon } from '@neondatabase/serverless';

// This handler function will run when the API endpoint is called.
export default async function handler(req, res) {
  try {
    // Define the URL from which to fetch data.

    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Format returns something like "03/21/2025"
    const parts = formatter.formatToParts(new Date());
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    var day = parts.find(p => p.type === 'day').value;
    if (req.query.day) {
      day = req.query.day;
    }

    const url = `https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1/${year}/${month}/${day}/scoreboard.json`;
    
    // Fetch the JSON data
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data. Status code: ${response.status}`);
    }
    const data = await response.json();
   
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
      const game_state = game.gameState;
      const bracket_round = game.bracketRound
      
      // game_state !== 'pre' && 
      if (bracket_round !== '') {
        const game_id = game.gameID;

        const team_a = game.away.names.short;
        const team_b = game.home.names.short;
        
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

        var round = 0;
        if (bracket_round === 'Second Round') {
          round = 1
        } else if (bracket_round === 'Sweet 16') {
          round = 2
        } else if (bracket_round === 'Elite Eight') {
          round = 3
        } else if (bracket_round === 'FINAL FOUR') {
          round = 4
        } else if (bracket_round === 'Championship') {
          round = 5
        };
        
        // Define the upsert query with parameterized values for safety
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

        const results = await sql(insertQuery, values);
        // console.log(results);
      };
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