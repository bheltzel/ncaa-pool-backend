import React, { useState, useEffect, useMemo } from "react";
import Board from "@/pages/board";
import { participants, rowNumbers, colNumbers, rounds, currentRound } from "@/lib/pool-data";
import squareScoreProbabilities from "@/lib/squareScoreProbabilities.json";

const SQUARE_PCT = squareScoreProbabilities.squarePercent;
const PCT_MIN = Math.min(...Object.values(SQUARE_PCT));
const PCT_MAX = Math.max(...Object.values(SQUARE_PCT));

/** Tailwind sky-500 — blue overlay from transparent (t=0) to stronger fill (t=1). */
const HEAT_BLUE = "14, 165, 233";

function heatmapBackground(t) {
  const a = t * 0.58;
  return {
    backgroundColor: "#ffffff",
    backgroundImage: `linear-gradient(rgba(${HEAT_BLUE}, ${a}), rgba(${HEAT_BLUE}, ${a}))`,
  };
}

function normalizePct(p) {
  if (PCT_MAX <= PCT_MIN) return 0.5;
  return (p - PCT_MIN) / (PCT_MAX - PCT_MIN);
}

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
    return (game.half === 1 || !game.half) ? "Half" : null;
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
        setState(JSON.parse(stored));
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

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Scores", "Blocks", "Leaderboard"];

const TabNav = ({ activeTab, setActiveTab }) => (
  <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
    {TABS.map((tab) => (
      <button
        key={tab}
        className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
          activeTab === tab
            ? "bg-sky-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        onClick={() => setActiveTab(tab)}
      >
        {tab}
      </button>
    ))}
  </div>
);

const RoundSelector = ({ activeRound, setActiveRound }) => (
  <div className="flex overflow-x-auto bg-gray-200 rounded-lg p-1 gap-1 scrollbar-none">
    {rounds.map((round, index) => (
      <button
        key={index}
        className={`flex-1 min-w-max whitespace-nowrap px-3 py-2 rounded-md font-medium text-sm transition-colors ${
          activeRound === index
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => setActiveRound(index)}
      >
        {round}
      </button>
    ))}
  </div>
);

// ── BlocksGrid ────────────────────────────────────────────────────────────────

const BlocksGrid = ({ activeRound }) => {
  const [heatmapMode, setHeatmapMode, heatmapHydrated] = useLocalStorageState(
    "blocksHeatmapMode",
    false
  );
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [selectedName, setSelectedName] = useState(null);

  const cellProbability = useMemo(() => {
    const grid = [];
    for (let r = 0; r < participants.length; r++) {
      const row = [];
      for (let c = 0; c < participants[0].length; c++) {
        const winD = colNumbers[activeRound][c];
        const loseD = rowNumbers[activeRound][r];
        row.push(SQUARE_PCT[`${winD}-${loseD}`] ?? 0);
      }
      grid.push(row);
    }
    return grid;
  }, [activeRound]);

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
        {heatmapMode && heatmapHydrated && (
          <span className="block normal-case font-normal text-[10px] text-gray-500 mt-0.5">
            Cell color = P(win digit, lose digit) from last 5 seasons of D1 results
          </span>
        )}
      </p>
      <div className="grid grid-cols-11 gap-px bg-gray-300 w-max min-w-0">
        {/* Corner — heatmap toggle */}
        <button
          type="button"
          title={heatmapMode ? "Turn off probability heatmap" : "Show probability heatmap"}
          aria-pressed={heatmapMode}
          aria-label={heatmapMode ? "Turn off probability heatmap" : "Show probability heatmap"}
          className={`bg-gray-200 sticky left-0 z-20 min-w-[2.5rem] min-[480px]:min-w-[4rem] min-h-[2rem] min-[480px]:min-h-[3rem] flex flex-col items-center justify-center gap-0.5 text-[9px] min-[480px]:text-[10px] font-bold leading-tight text-gray-600 hover:bg-gray-300 hover:text-gray-900 transition-colors cursor-pointer select-none border-0 p-0.5`}
          onClick={() => setHeatmapMode(!heatmapMode)}
        >
          <span className="text-[11px] min-[480px]:text-sm" aria-hidden>
            {heatmapMode ? "🔥" : "🔥"}
          </span>
        </button>

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
            {row.map((name, colIndex) => {
              const p = cellProbability[rowIndex][colIndex];
              const t = normalizePct(p);
              const isNameSel = selectedName === name;
              const isCellSel =
                selectedRow === rowIndex && selectedCol === colIndex && !selectedName;
              const showHeat = heatmapMode && heatmapHydrated;
              const heatStyle =
                showHeat && !isNameSel ? heatmapBackground(t) : undefined;
              const stateClass = showHeat
                ? isNameSel
                  ? "bg-sky-500 text-white"
                  : isCellSel
                    ? "text-gray-900 ring-2 ring-sky-600 ring-inset z-[1]"
                    : "text-gray-900"
                : cellClass(rowIndex, colIndex, name);

              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={heatStyle}
                  className={`p-1 sm:p-3 border border-gray-100 text-center text-xs sm:text-sm w-12 min-[480px]:w-16 sm:w-28 cursor-pointer select-none transition-[background-color,background-image,color,box-shadow] ${stateClass}`}
                  onClick={() => handleCellClick(rowIndex, colIndex, name)}
                >
                  <span className="block font-medium">{name}</span>
                  {showHeat && (
                    <span
                      className={`block text-[10px] min-[480px]:text-xs font-semibold tabular-nums mt-0.5 ${
                        isNameSel ? "text-white/90" : "text-gray-700/90"
                      }`}
                    >
                      {p.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
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
    return <p className="text-center text-gray-400 py-8">You can't win games that haven't been scheduled.</p>;
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
  const [activeTab, setActiveTab] = useLocalStorageState("activeTab", "Scores");

  useEffect(() => {
    if (activeTab === "Leaderboard") return;

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
  }, [activeRound, activeTab]);

  return (
    <div className="w-full p-3 sm:p-6 flex flex-col gap-4 box-border overflow-hidden">
      <div className="text-center">
        <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words">
          <span className="text-sky-500">March Madness</span>{" "}
          <span className="text-gray-900">Blocks 2026</span>
        </h1>
        {/* <p className="text-xs sm:text-sm text-gray-400 font-medium tracking-wide mt-0.5">2026 Tournament</p> */}
      </div>
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "Scores" && (
        <>
          <RoundSelector activeRound={activeRound} setActiveRound={setActiveRound} />
          <GamesList games={games} isLoading={isLoading} activeRound={activeRound} />
        </>
      )}

      {activeTab === "Blocks" && (
        <>
          <RoundSelector activeRound={activeRound} setActiveRound={setActiveRound} />
          <BlocksGrid activeRound={activeRound} />
        </>
      )}

      {activeTab === "Leaderboard" && <Board />}
    </div>
  );
};

export default SquarePool;
