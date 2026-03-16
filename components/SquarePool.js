import React, { useState, useEffect } from "react";
import Board from "@/pages/board";
import { participants, rowNumbers, colNumbers, rounds, currentRound } from "@/lib/pool-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getWinningParticipant = (score_a, score_b, round) => {
  if (score_a === null || score_b === null) return "-";
  const winning_score = score_a > score_b ? score_a : score_b;
  const losing_score = score_a > score_b ? score_b : score_a;
  const row = rowNumbers[round].indexOf((losing_score % 10).toString());
  const col = colNumbers[round].indexOf((winning_score % 10).toString());
  return row >= 0 && col >= 0 ? participants[row][col] : "TBD";
};

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZone: "America/New_York",
  });

const getGameClock = (game) => {
  if (!game.time_remaining || game.time_remaining === "00:00:00") {
    return game.half === 1 ? "Half" : null;
  }
  return `${game.half}H ${game.time_remaining.slice(0, 5)}`;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

function useLocalStorageState(key, defaultValue) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        // setState(JSON.parse(stored));
        const parsed = JSON.parse(stored);
        // Migration: grid default is true; ignore stored false so users see the grid
        if (key === "grid" && parsed === false) {
          localStorage.removeItem(key);
        } else {
          setState(parsed);
        }
      } catch (e) {
        console.warn(`Error parsing localStorage for key "${key}"`, e);
      }
    }
    setIsHydrated(true);
  }, [key]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state, isHydrated]);

  return [state, setState, isHydrated];
}

// ── RoundNav ──────────────────────────────────────────────────────────────────

const RoundNav = ({ activeRound, setActiveRound, showLeaderboard, setShowLeaderboard, showGrid, setShowGrid }) => (
  <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-200 rounded-lg">
    {/* Mobile: select dropdown */}
    <select
      className="sm:hidden flex-1 border rounded px-3 py-2 bg-white font-medium"
      value={activeRound}
      onChange={(e) => {
        setActiveRound(Number(e.target.value));
        setShowLeaderboard(false);
      }}
    >
      {rounds.map((round, index) => (
        <option key={index} value={index}>{round}</option>
      ))}
    </select>

    {/* Desktop: individual buttons */}
    <div className="hidden sm:flex flex-wrap gap-2">
      {rounds.map((round, index) => (
        <button
          key={index}
          className={`px-3 py-2 rounded font-medium text-sm ${
            activeRound === index ? "bg-sky-500 text-white" : "bg-white hover:bg-gray-100"
          }`}
          onClick={() => {
            setActiveRound(index);
            setShowLeaderboard(false);
          }}
        >
          {round}
        </button>
      ))}
    </div>

    <button
      className={`px-3 py-2 rounded font-medium text-sm bg-gray-100 text-gray-400 cursor-not-allowed`}
      disabled
      onClick={() => setShowLeaderboard(!showLeaderboard)}
    >
      Leaderboard
    </button>
    <button
      className={`px-3 py-2 rounded font-medium text-sm bg-gray-100 text-gray-400 cursor-not-allowed`}
      disabled
      onClick={() => {}}
    >
      Blocks
    </button>
  </div>
);

// ── BlocksGrid ────────────────────────────────────────────────────────────────

const BlocksGrid = ({ activeRound }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [selectedName, setSelectedName] = useState(null);

  const handleCellClick = (rowIndex, colIndex, name) => {
    if (selectedName === name) {
      setSelectedName(null);
    } else {
      setSelectedName(name);
      setSelectedRow(null);
      setSelectedCol(null);
    }
  };

  const cellClass = (rowIndex, colIndex, name) => {
    if (selectedName) {
      return name === selectedName ? "bg-sky-500 text-white" : "bg-white";
    }
    if (selectedRow === rowIndex && selectedCol === colIndex) {
      return "bg-sky-500 text-white";
    }
    return "bg-white";
  };

  return (
    <div className="w-full min-w-0 overflow-x-auto shadow-lg bg-white rounded-lg p-2">
      <p className="text-xs text-center text-gray-400 mb-1 font-semibold tracking-wide uppercase">
        Winning score →
      </p>
      <div className="grid grid-cols-11 gap-px bg-gray-300 w-max min-w-0">
        {/* Corner */}
        <div className="bg-gray-200 sticky left-0 z-10 min-w-[2.5rem] min-[480px]:min-w-[4rem]" />

        {/* Column headers */}
        {colNumbers[activeRound].map((num, colIndex) => (
          <div
            key={`col-${colIndex}`}
            className={`p-1 sm:p-3 text-center font-bold text-xs sm:text-xl cursor-pointer select-none min-w-[2.5rem] min-[480px]:min-w-[4rem] ${
              selectedCol === colIndex && !selectedName ? "bg-sky-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => {
              setSelectedName(null);
              setSelectedCol(selectedCol === colIndex ? null : colIndex);
            }}
          >
            {num}
          </div>
        ))}

        {/* Rows */}
        {participants.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="contents">
            {/* Row header */}
            <div
className={`p-1 sm:p-3 text-center font-bold text-xs sm:text-xl sticky left-0 z-10 cursor-pointer select-none min-w-[2.5rem] min-[480px]:min-w-[4rem] ${
              selectedRow === rowIndex && !selectedName ? "bg-sky-500 text-white" : "bg-gray-200"
            }`}
              onClick={() => {
                setSelectedName(null);
                setSelectedRow(selectedRow === rowIndex ? null : rowIndex);
              }}
            >
              {rowNumbers[activeRound][rowIndex]}
            </div>

            {/* Cells */}
            {row.map((name, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`p-1 sm:p-3 border border-gray-100 text-center text-xs sm:text-sm w-12 min-[480px]:w-16 sm:w-28 cursor-pointer select-none transition-colors ${
                  cellClass(rowIndex, colIndex, name)
                }`}
                onClick={() => handleCellClick(rowIndex, colIndex, name)}
              >
                {name}
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedName && (
        <p className="text-center text-sm text-sky-600 font-medium mt-2">
          {selectedName} — tap again to clear
        </p>
      )}
    </div>
  );
};

// ── GamesList ─────────────────────────────────────────────────────────────────

const GamesList = ({ games, isLoading, activeRound }) => {
  if (isLoading) {
    return <p className="text-center text-gray-400 py-8">Loading games…</p>;
  }
  if (games.length === 0) {
    return <p className="text-center text-gray-400 py-8">No games this round.</p>;
  }

  return (
    <div className="grid gap-3">
      {games.map((game) => {
        const isFinal = game.status === "final";
        const isLive = game.status === "live";
        const winner = (isFinal || isLive)
          ? getWinningParticipant(game.score_a, game.score_b, activeRound)
          : null;
        const gameClock = isLive ? getGameClock(game) : null;
        const loserIsA = isFinal && game.score_a < game.score_b;
        const loserIsB = isFinal && game.score_a > game.score_b;

        return (
          <div key={game.id} className="bg-white rounded-lg shadow p-3 sm:p-4">
            <div className="grid grid-cols-3 items-center gap-2">
              {/* Teams */}
              <div>
                <p className={`font-semibold text-base sm:text-xl ${loserIsA ? "text-gray-400" : ""}`}>
                  {game.team_a}
                </p>
                <p className={`font-semibold text-base sm:text-xl ${loserIsB ? "text-gray-400" : ""}`}>
                  {game.team_b}
                </p>
              </div>

              {/* Scores */}
              <div className="text-center">
                {game.status !== "pre" && (
                  <>
                    <p className={`font-semibold text-base sm:text-xl ${loserIsA ? "text-gray-400" : ""}`}>
                      {game.score_a}
                    </p>
                    <p className={`font-semibold text-base sm:text-xl ${loserIsB ? "text-gray-400" : ""}`}>
                      {game.score_b}
                    </p>
                  </>
                )}
              </div>

              {/* Status + winner */}
              <div className="text-right">
                {game.status === "pre" && (
                  <p className="text-gray-500 text-sm sm:text-base">{formatTime(game.start_time)}</p>
                )}
                {isLive && (
                  <>
                    <p className="font-bold text-red-500 text-sm sm:text-base">{winner}</p>
                    {gameClock && (
                      <p className="text-red-400 text-xs sm:text-sm">{gameClock}</p>
                    )}
                  </>
                )}
                {isFinal && (
                  <>
                    <p className="font-bold text-sm sm:text-base">{winner}</p>
                    <p className="text-gray-500 text-xs sm:text-sm">Final</p>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── SquarePool ────────────────────────────────────────────────────────────────

const SquarePool = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeRound, setActiveRound] = useLocalStorageState("activeRound", currentRound);
  const [showLeaderboard, setShowLeaderboard] = useLocalStorageState("leaderboard", false);
  const [showGrid, setShowGrid] = useLocalStorageState("grid", true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchGames = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games?round=${activeRound}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch games");
        setGames(await response.json());
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching games:", err);
          setGames([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchGames();
    return () => controller.abort();
  }, [activeRound]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-6 flex flex-col gap-4 box-border">
      <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-center break-words">
        March Madness Blocks 2026
      </h1>
      <RoundNav
        activeRound={activeRound}
        setActiveRound={setActiveRound}
        showLeaderboard={showLeaderboard}
        setShowLeaderboard={setShowLeaderboard}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
      />
      {showLeaderboard && <Board />}
      {showGrid && <BlocksGrid activeRound={activeRound} />}
      {/* <GamesList games={games} isLoading={isLoading} activeRound={activeRound} /> */}
    </div>
  );
};

export default SquarePool;
