import React, { useState, useEffect } from "react";
import { participants, rowNumbers, colNumbers, payouts } from "@/lib/pool-data";

const fetchFinishedGamesFromAPI = async (year) => {
    try {
      const response = await fetch(`/api/final_games?year=${year}`);
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

export default function Board() {
    const [year, setYear] = useState(2026);
    const [leaderboard, setLeaderboard] = useState({});
  
    useEffect(() => {
      const fetchAndCalculateWins = async () => {
        const allGames = await fetchFinishedGamesFromAPI(year);
        
        const results = {};

        allGames.forEach(game => {
            const winner = getWinningParticipant(game.score_a, game.score_b, game.round);
            if (winner !== 'TBD' && winner !== '-') {
                const winnings = payouts[game.round];
                if (!results[winner]) {
                    results[winner] = { wins: 0, winnings: 0 };
                }
                results[winner].wins += 1;
                results[winner].winnings += winnings;
            }
        });
        
        setLeaderboard(results);
      };
  
      fetchAndCalculateWins();
    }, [year]);
  
    const sorted = Object.entries(leaderboard).sort((a, b) => b[1].winnings - a[1].winnings);
    const isEmpty = sorted.length === 0;

    return (
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex justify-center gap-1 mb-4">
            {[2026, 2025].map((y) => (
              <button
                key={y}
                className={`px-3 py-1 rounded font-medium text-sm ${
                  year === y ? "bg-sky-500 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
          {year === 2025 && (
            <p className="text-center text-sm italic text-gray-500 -mt-2 mb-3">
              If you had these blocks last year, what could have been...
            </p>
          )}

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-4.5A3.375 3.375 0 0 0 13.125 10.875h-2.25A3.375 3.375 0 0 0 7.5 14.25v4.5m6-12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p className="text-sm font-medium">You're all losers so far.</p>
              <p className="text-xs mt-1">Even the Foley's</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                    <th className="py-2 pl-4 sm:pl-6 pr-2 text-left w-8">#</th>
                    <th className="py-2 px-2 text-left">Name</th>
                    <th className="py-2 px-2 text-center">Wins</th>
                    <th className="py-2 pl-2 pr-4 sm:pr-6 text-right">Winnings</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([participant, data], i) => (
                    <tr
                      key={participant}
                      className={`border-b border-gray-100 last:border-0 ${
                        i === 0 ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="py-3 pl-4 sm:pl-6 pr-2 text-gray-400 font-medium tabular-nums">
                        {i + 1}
                      </td>
                      <td className="py-3 px-2 font-semibold text-gray-900">
                        {i === 0 && <span className="mr-1">🏆</span>}
                        {participant}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-600 tabular-nums">{data.wins}</td>
                      <td className="py-3 pl-2 pr-4 sm:pr-6 text-right font-medium text-gray-900 tabular-nums">
                        ${data.winnings.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
  