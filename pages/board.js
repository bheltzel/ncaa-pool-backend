import React, { useState, useEffect } from "react";
import { participants, rowNumbers, colNumbers, payouts } from "@/lib/pool-data";

const fetchFinishedGamesFromAPI = async () => {
    try {
      const response = await fetch(`/api/final_games`);
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
    const [leaderboard, setLeaderboard] = useState({});
  
    useEffect(() => {
      const fetchAndCalculateWins = async () => {
        let allGames = [];
        
        allGames = await fetchFinishedGamesFromAPI();
        
        const results = {};

        allGames.forEach(game => {
            const winner = getWinningParticipant(game.score_a, game.score_b, game.round);
            if (winner !== 'TBD' && winner !== '-') {
                const winnings = payouts[game.round]; // doubles each round
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
    }, []);
  
    return (
      <>
      <div className="shadow-xl bg-white rounded-lg shadow p-2">
        <div className="container mx-auto p-4">
            <table className="table-auto w-full border-collapse border border-gray-400">
                <thead>
                <tr>
                    <th className="border border-gray-400 px-4 py-2"></th>
                    <th className="border border-gray-400 px-4 py-2">Wins</th>
                    <th className="border border-gray-400 px-4 py-2">Winnings ($)</th>
                </tr>
                </thead>
                <tbody>
                {Object.entries(leaderboard)
                    .sort((a, b) => b[1].winnings - a[1].winnings)
                    .map(([participant, data]) => (
                    <tr key={participant}>
                        <td className="border border-gray-400 px-4 py-2">{participant}</td>
                        <td className="border border-gray-400 px-4 py-2 text-center">{data.wins}</td>
                        <td className="border border-gray-400 px-4 py-2 text-center">$ {data.winnings}</td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      </>
    );
  }
  