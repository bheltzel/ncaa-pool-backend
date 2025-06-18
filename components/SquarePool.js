// import { useState, useEffect } from "react";
import React, { useState, useEffect, act } from "react";
import Board from "@/pages/board";

// export const Card = ({ children }) => (
//   <div className="bg-white rounded-lg shadow p-4">{children}</div>
// );

// export const CardContent = ({ children, className }) => (
//   <div className={className}>{children}</div>
// );

const participants = [
  [
    "Foley-Trsic",
    "Blake C",
    "Maddy M",
    "Arthur G",
    "Bindi",
    "Mary T",
    "Matt Ross",
    "Hawk",
    "Austin E",
    "Justin L",
  ],
  [
    "Paul P",
    "Ryan W",
    "Kurt",
    "Josh M",
    "Jackie R",
    "Let's Go Branson",
    "@foleys footballs",
    "Greg Andia",
    "Bob R",
    "Costella (Foley)",
  ],
  [
    "Caroline W",
    "Robby",
    "@foleys footballs",
    "Chase H",
    "Eric Scott",
    "Hug Life",
    "Mike Hurd",
    "Sharks",
    "Nate T",
    "Billy R",
  ],
  [
    "Kevin/John",
    "John from Costco",
    "Puleo-Hurd",
    "MILKED",
    "CMega",
    "Ramzi",
    "SeayHurd",
    "TJ",
    "Greenberg",
    "Ross Martin",
  ],
  [
    "John Duffy",
    "Xander Ngo",
    "Dodd Fuller",
    "Foley-Trsic",
    "CMega",
    "Hidy",
    "Robby",
    "Paul Atkinson",
    "Bob Foley <3",
    "Ben G",
  ],
  [
    "Weezie Foley",
    "Beckwith",
    "Lester",
    "Bob Fuller",
    "Kevin Baldwin",
    "Paul R",
    "TEAM USA",
    "Linda Hurd",
    "Matt & Danielle",
    "Zander H",
  ],
  [
    "Craig",
    "Sandras",
    "Austin B",
    "Bobby Foley",
    "Bruce",
    "TEAM USA",
    "Chase H",
    "Missy & Lou",
    "Blake C",
    "Jared L",
  ],
  [
    "Carson C",
    "Sexy Rexy",
    "Ross Martin",
    "Barb",
    "TEAM USA",
    "Big Boys",
    "Arthur G",
    "McCusker",
    "Jonathan Puleo",
    "Nick D",
  ],
  [
    "Rob S",
    "Kevin D",
    "Graham G",
    "TEAM USA",
    "Shooter",
    "Brooks C",
    "Big Boys",
    "David Stern",
    "Jacob Puleo",
    "Pratik",
  ],
  [
    "Richmond Pigs",
    "Zeke C",
    "TEAM USA",
    "Henrich",
    "Hugh M",
    "Zander H",
    "Cliff R",
    "Kevin D",
    "Kevin Baldwin",
    "Rohan",
  ],
];

// row = losers
const rowNumbers = [
  ["2", "1", "6", "5", "3", "8", "7", "4", "9", "0"],
  ["5", "2", "8", "1", "7", "0", "4", "9", "3", "6"],
  ["6", "4", "0", "3", "9", "2", "7", "8", "1", "5"],
  ["8", "3", "5", "6", "0", "9", "2", "4", "1", "7"],
  ["7", "6", "2", "9", "5", "0", "3", "8", "4", "1"],
  ["9", "2", "3", "7", "1", "8", "5", "6", "0", "4"],
];

// col = winners
const colNumbers = [
  ["7", "4", "9", "0", "8", "6", "1", "2", "5", "3"],
  ["4", "1", "7", "3", "9", "0", "6", "2", "8", "5"],
  ["3", "7", "1", "0", "8", "5", "2", "9", "4", "6"],
  ["2", "9", "4", "1", "6", "8", "0", "5", "7", "3"],
  ["0", "5", "8", "4", "1", "7", "9", "3", "6", "2"],
  ["1", "8", "6", "4", "3", "7", "0", "5", "9", "2"],
];

const rounds = [
  "Round of 64",
  "Round of 32",
  "Sweet 16",
  "Elite 8",
  "Final 4",
  "Champ",
];

const currentRound = 4;

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
  const winning_score = score_a > score_b ? score_a : score_b;
  const losing_score = score_a > score_b ? score_b : score_a;
  const row = rowNumbers[activeRound].indexOf((losing_score % 10).toString());
  const col = colNumbers[activeRound].indexOf((winning_score % 10).toString());
  return row >= 0 && col >= 0 ? participants[row][col] : "TBD";
};

const ts = (timestamp) => {
  const date = new Date(timestamp);
  // Format the date for a specific locale and timezone.
  const options = {
    // year: 'numeric',
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: "America/New_York", // Adjust as needed
    // timeZoneName: 'short'
  };

  return date.toLocaleString("en-US", options);
};

function useLocalStorageState(key, defaultValue) {
  const [isHydrated, setIsHydrated] = useState(false); // ← key fix
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        setState(JSON.parse(stored));
      } catch (e) {
        console.warn(`Error parsing localStorage for key "${key}"`, e);
      }
    }
    setIsHydrated(true); // ← now it's safe to render
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, isHydrated]);

  return [state, setState, isHydrated];
}

const SquarePool = () => {
  const [games, setGames] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);

  const [activeRound, setActiveRound] = useLocalStorageState("activeRound", currentRound);
  const [leaderboard, setLeaderboard] = useLocalStorageState(
    "leaderboard",
    false
  );
  const [grid, setGrid] = useLocalStorageState(
    "grid",
    false
  );

  useEffect(() => {
    const fetchGames = async () => {
      const gamesData = await fetchGamesFromAPI(activeRound);
      setGames(gamesData);
    };
    fetchGames();
  }, [activeRound]);

  return (
    <div className="flex p-4 grid gap-8">
      <div className="flex space-x-4">
        <h1 className="text-3xl font-bold text-center my-4">March Madness Blocks 2025</h1>
      </div>
      
      <div className="flex space-x-4 p-4 bg-gray-300">
        {rounds.map((round, index) => (
          <button
            key={index}
            className={`px-4 py-2 ${
              activeRound === index ? "bg-sky-500 text-white" : "bg-white"
            }`}
            // onClick={() => setActiveRound(index)}
            onClick={() => {
              setActiveRound(index);
              setLeaderboard(false);
            }}
          >
            {round}
          </button>
        ))}
        <button
          className={`px-4 py-2 ${
            leaderboard === true ? "bg-green-400 text-white" : "bg-white"
          }`}
          // onClick={() => setLeaderboard(!leaderboard)}
          onClick={() => {
            setLeaderboard(!leaderboard);
          }}
        >
          Leaderboard
        </button>
        <button
          className={`px-4 py-2 ${
            grid === true ? "bg-green-400 text-white" : "bg-white"
          }`}
          // onClick={() => setLeaderboard(!leaderboard)}
          onClick={() => {
            setGrid(!grid);
          }}
        >
          Blocks
        </button>
      </div>
      {leaderboard ? <Board /> : null}
      {grid ?
      <div id="blocks-grid" className="overflow-x-auto shadow-xl bg-white rounded-lg shadow p-2">
        <h3 className="text-l font-bold text-center my-4">Winning score</h3>
        <div className="min-w-[1210px] grid grid-cols-11 gap-px bg-gray-300 relative">
          <div className="bg-white sticky left-0 z-10"></div>
          {/* Column Headers */}
          {colNumbers[activeRound].map((num, index) => (
            <div
              key={`col-${index}`}
              className={`bg-gray-300 p-4 text-center font-bold text-xl sm:text-xl ${
                selectedCol === index ? "bg-sky-500 text-white" : ""
              }`}
              onClick={() => setSelectedCol(index)}
            >
              {num}
            </div>
          ))}
          {/* Rows */}
          {participants.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="contents">
              {/* Row Header */}
              <div
                className={`bg-gray-300 p-4 text-center font-bold text-xl sm:text-xl sticky left-0 z-10 ${
                  selectedRow === rowIndex ? "bg-sky-500 text-white" : ""
                }`}
                onClick={() => setSelectedRow(rowIndex)}
              >
                {rowNumbers[activeRound][rowIndex]}
              </div>
              {/* Row Cells */}
              {row.map((participant, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`p-4 border text-center text-xl break-words min-w-[110px] ${
                    selectedCol === colIndex && selectedRow === rowIndex
                      ? "bg-sky-500 text-white"
                      : "bg-white"
                  }`}
                  onClick={() => {
                    setSelectedRow(rowIndex);
                    setSelectedCol(colIndex);
                  }}
                >
                  {participant}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      : "" }
      <div id="games-list" className="grid gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            className="shadow-xl bg-white rounded-lg shadow p-4"
          >
            <div className="p-2 grid grid-cols-3 items-center text-2xl">
              <div>
                <h3 className="font-semibold p-2">
                  {game.team_a}
                </h3>
                <h3 className="font-semibold p-2">{game.team_b}</h3>
              </div>
              <div>
                {game.status !== "pre" && (
                  <div>
                    <p className={`p-2 font-semibold ${game.status === 'final' && game.score_a < game.score_b ? "text-gray-400" : ""}`}>{game.score_a}</p>
                    <p className={`p-2 font-semibold ${game.status === 'final' && game.score_a > game.score_b ? "text-gray-400" : ""}`}>{game.score_b}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                {game.status === "final" ? (
                  <div>
                    {/* <p className="">Winner</p> */}
                    <p className="font-bold text-black-500 p-1">
                      {getWinningParticipant(
                        game.score_a,
                        game.score_b,
                        activeRound
                      )}
                    </p>
                  </div>
                ) : game.status === "live" ? (
                  <div>
                    {/* <p className="text-gray-300">Leading</p> */}
                    <p className="font-bold text-red-500">
                      {getWinningParticipant(
                        game.score_a,
                        game.score_b,
                        activeRound
                      )}
                    </p>
                  </div>
                ) : (""
                  
                )}
                {game.status === "pre" && <p>{ts(game.start_time)}</p>}
                
                {game.status === "live" && game.time_remaining === '00:00:00' && game.half === 1 && 
                  <p className="text-red-500">Half</p>
                }

                {game.status === "live" && game.time_remaining !== '00:00:00' && game.half !== 1  && 
                  <p className="text-red-500">{game.half}H - {game.time_remaining.slice(0, 5)}</p>
                }
                
                {game.status === "final" && <p>Final</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SquarePool;
