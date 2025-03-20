// import { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";

export const Card = ({ children }) => (
  <div className="bg-white rounded-lg shadow p-4">{children}</div>
);

export const CardContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);

const participants = [
  ["Foley-Trsic", "Blake C", "Maddy M", "Arthur G", "Bindi", "Mary T", "Matt Ross", "Hawk", "Austin E", "Justin L"],
  ["Paul P", "Ryan W", "Kurt", "Josh M", "Jackie R", "Let's Go Branson", "@foleys footballs", "Greg Andia", "Bob R", "Costella (Foley)"],
  ["Caroline W", "Robby", "@foleys footballs", "Chase H", "Eric Scott", "Hug Life", "Mike Hurd", "Sharks", "Nate T", "Billy R"],
  ["Kevin/John", "John from Costco", "Puleo-Hurd", "MILKED", "CMega", "Ramzi", "SeayHurd", "TJ", "Greenberg", "Ross Martin"],
  ["John Duffy", "Xander Ngo", "Dodd Fuller", "Foley-Trsic", "CMega", "Hidy", "Robby", "Paul Atkinson", "Bob Foley <3", "Ben G"],
  ["Weezie Foley", "Beckwith", "Lester", "Bob Fuller", "Kevin Baldwin", "Paul R", "TEAM USA", "Linda Hurd", "Matt & Danielle", "Zander H"],
  ["Craig", "Sandras", "Austin B", "Bobby Foley", "Bruce", "TEAM USA", "Chase H", "Missy & Lou", "Blake C", "Jared L"],
  ["Carson C", "Sexy Rexy", "Ross Martin", "Barb", "TEAM USA", "Big Boys", "Arthur G", "McCusker", "Jonathan Puleo", "Nick D"],
  ["Rob S", "Kevin D", "Graham G", "TEAM USA", "Shooter", "Brooks C", "Big Boys", "David Stern", "Jacob Puleo", "Pratik"],
  ["Richmond Pigs", "Zeke C", "TEAM USA", "Henrich", "Hugh M", "Zander H", "Cliff R", "Kevin D", "Kevin Baldwin", "Rohan"]
];

// row = losers
const rowNumbers = [
  ["2", "1", "6", "5", "3", "8", "7", "4", "9", "0"],
  ["5", "2", "8", "1", "7", "0", "4", "9", "3", "6"],
  ["6", "4", "0", "3", "9", "2", "7", "8", "1", "5"],
  ["8", "3", "5", "6", "0", "9", "2", "4", "1", "7"],
  ["7", "6", "2", "9", "5", "0", "3", "8", "4", "1"],
  ["9", "2", "3", "7", "1", "8", "5", "6", "0", "4"]
];

// col = winners 
const colNumbers = [ 
  ["7", "4", "9", "0", "8", "6", "1", "2", "5", "3"],
  ["4", "1", "7", "3", "9", "0", "6", "2", "8", "5"],
  ["3", "7", "1", "0", "8", "5", "2", "9", "4", "6"],
  ["2", "9", "4", "1", "6", "8", "0", "5", "7", "3"],
  ["0", "5", "8", "4", "1", "7", "9", "3", "6", "2"],
  ["1", "8", "6", "4", "3", "7", "0", "5", "9", "2"]
];

const rounds = [
  "Round of 64",
  "Round of 32",
  "Sweet 16",
  "Elite 8",
  "Final 4",
  "Championship"
];

const fetchGamesFromAPI = async (round) => {
  try {
    const response = await fetch(`/api/games?round=${round}`);
    if (!response.ok) {
      throw new Error("Failed to fetch games");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching games:", error);
    return [];
  }
};

const getWinningParticipant = (score_a, score_b, activeRound) => {
  if (score_a === null || score_b === null) return "-";
  const winning_score = score_a > score_b ? score_a : score_b
  const losing_score = score_a > score_b ? score_b : score_a
  const row = rowNumbers[activeRound].indexOf((losing_score % 10).toString());
  const col = colNumbers[activeRound].indexOf((winning_score % 10).toString());
  return row >= 0 && col >= 0 ? participants[row][col] : "TBD";
};

const sortGames = (games) => {
  return [...games].sort((a, b) => {
    if (a.status === "live" && b.status === "live") {
      return a.time_remaining.localeCompare(b.time_remaining);
    }
    if (a.status === "live") return -1;
    if (b.status === "live") return 1;

    if (a.status === "pre" && b.status === "pre") {
      return new Date(a.start_time) - new Date(b.start_time);
    }
    if (a.status === "pre") return -1;
    if (b.status === "pre") return 1;

    return new Date(b.start_time) - new Date(a.start_time);
  });
};

const ts = (timestamp) => {
  const date = new Date(timestamp);
  // Format the date for a specific locale and timezone.
  const options = {
    // year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZone: 'America/New_York',  // Adjust as needed
    // timeZoneName: 'short'
  };

  return date.toLocaleString('en-US', options);
}

const tsClock = (timestamp) => {
  const date = new Date(timestamp);
  // Format the date for a specific locale and timezone.
  const options = {
    minute: 'numeric',
    second: 'numeric'
  };

  return date.toLocaleString('en-US', options);
}

const SquarePool = () => {
  const [activeRound, setActiveRound] = useState(0);
  const [games, setGames] = useState([]);

  useEffect(() => {
    const fetchGames = async () => {
      const gamesData = await fetchGamesFromAPI(activeRound);
      setGames(sortGames(gamesData));
    };
    fetchGames();
    
  }, [activeRound]);

  return (
    <div className="p-4 grid gap-8">
      <div className="flex space-x-4 p-4 bg-gray-100">
        {rounds.map((round, index) => (
          <button
            key={index}
            className={`px-4 py-2 ${activeRound === index ? "bg-blue-500 text-white" : "bg-white text-gray"}`}
            onClick={() => setActiveRound(index)}
          >
            {round}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <h3 className="text-l font-bold text-center my-4">Winning score</h3>
        <div className="min-w-[800px] grid grid-cols-11 gap-px bg-gray-300 relative">
          <div className="bg-white sticky left-0 z-10"></div>
          {colNumbers[activeRound].map((num, index) => (
            <div key={index} className="bg-gray-100 p-4 text-center font-bold text-xl sm:text-xl">{num}</div>
          ))}
          {participants.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="bg-gray-100 p-4 text-center font-bold text-xl sm:text-xl sticky left-0 z-10">{rowNumbers[activeRound][rowIndex]}</div>
              {row.map((participant, colIndex) => (
                <div key={colIndex} className="p-4 border text-center text-xs sm:text-xs break-words bg-white min-w-[80px]">{participant}</div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-2 text-center">Games</h2>
      <div className="grid gap-4">
        {games.map((game) => (
          <Card key={game.id}>
            <CardContent className="p-4 grid grid-cols-2 gap-4 items-center">
              <div>
                <h3 className="text-lg font-semibold">{game.team_a} vs {game.team_b}</h3>
                {game.status === "pre" && <p>{ts(game.start_time)}</p>}
                
                {game.status !== "pre" && <p>
                  Score: {game.score_a !== null ? game.score_a : "-"} - {game.score_b !== null ? game.score_b : "-"}
                </p>}
                {game.status === "live" && <p>Remain: {game.half}H - {game.time_remaining.slice(0,5)}</p>}
                {game.status === "final" && <p>Final</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">{game.status === "final" ? "Winner" : "Leading"}:</p>
                <p>{getWinningParticipant(game.score_a, game.score_b, 0)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SquarePool;