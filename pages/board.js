import Head from 'next/head'
import React, { useState, useEffect, act } from "react";

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

  const payouts = [
    150,
    300,
    600,
    1200,
    2400,
    6000
  ]

  const exampleGamesAPIresponse = [
    {
        "id": 2640436,
        "team_a": "McNeese",
        "team_b": "Clemson",
        "status": "final",
        "score_a": 57,
        "score_b": 47,
        "time_remaining": "02:59:00",
        "start_time": "2025-03-20T19:24:00.000Z",
        "half": "2"
    },
    {
        "id": 2640432,
        "team_a": "VCU",
        "team_b": "BYU",
        "status": "live",
        "score_a": 34,
        "score_b": 52,
        "time_remaining": "16:45:00",
        "start_time": "2025-03-20T20:05:00.000Z",
        "half": "2"
    }
    ]
  
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
    console.log(activeRound)
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
  