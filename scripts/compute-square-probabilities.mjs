import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "../lib/MRegularSeasonCompactResults.csv");
const OUT_PATH = join(__dirname, "../lib/squareScoreProbabilities.json");

const SEASONS_WINDOW = 5;

function pct(count, total) {
  return total === 0 ? 0 : (100 * count) / total;
}

async function readMaxSeason() {
  let lineNum = 0;
  let maxS = -Infinity;
  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(",");
    const season = Number.parseInt(parts[0], 10);
    if (Number.isFinite(season)) maxS = Math.max(maxS, season);
  }
  return maxS;
}

async function aggregateSeasonWindow(minSeason, maxSeason) {
  const winCounts = Array(10).fill(0);
  const loseCounts = Array(10).fill(0);
  const joint = Array.from({ length: 10 }, () => Array(10).fill(0));
  const gamesPerSeason = {};
  let total = 0;
  let lineNum = 0;

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(",");
    if (parts.length < 6) continue;
    const season = Number.parseInt(parts[0], 10);
    if (
      !Number.isFinite(season) ||
      season < minSeason ||
      season > maxSeason
    ) {
      continue;
    }

    const w = Number.parseInt(parts[3], 10);
    const l = Number.parseInt(parts[5], 10);
    if (!Number.isFinite(w) || !Number.isFinite(l)) continue;

    const wd = ((w % 10) + 10) % 10;
    const ld = ((l % 10) + 10) % 10;
    winCounts[wd]++;
    loseCounts[ld]++;
    joint[wd][ld]++;
    gamesPerSeason[season] = (gamesPerSeason[season] ?? 0) + 1;
    total++;
  }

  return {
    winCounts,
    loseCounts,
    joint,
    total,
    gamesPerSeason,
  };
}

async function main() {
  const maxSeason = await readMaxSeason();
  if (!Number.isFinite(maxSeason) || maxSeason < 0) {
    throw new Error("Could not determine max Season from CSV");
  }
  const minSeason = maxSeason - (SEASONS_WINDOW - 1);
  const seasonsIncluded = [];
  for (let y = minSeason; y <= maxSeason; y++) seasonsIncluded.push(y);

  const { winCounts, loseCounts, joint, total, gamesPerSeason } =
    await aggregateSeasonWindow(minSeason, maxSeason);

  const winPct = Object.fromEntries(
    winCounts.map((c, d) => [String(d), +pct(c, total).toFixed(6)])
  );
  const losePct = Object.fromEntries(
    loseCounts.map((c, d) => [String(d), +pct(c, total).toFixed(6)])
  );
  const squares = {};
  for (let w = 0; w < 10; w++) {
    for (let l = 0; l < 10; l++) {
      squares[`${w}-${l}`] = +pct(joint[w][l], total).toFixed(6);
    }
  }

  const out = {
    source: "lib/MRegularSeasonCompactResults.csv",
    totalGames: total,
    seasonFilter: {
      description: `Last ${SEASONS_WINDOW} distinct Season values in file (CSV Season column).`,
      seasonsIncluded,
      minSeason,
      maxSeason,
      gamesPerSeason,
    },
    description:
      "Empirical frequencies from regular-season compact results: last digit of winning score (WScore) and losing score (LScore).",
    winningDigitPercent: winPct,
    losingDigitPercent: losePct,
    squarePercent: squares,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${OUT_PATH} (${total} games, seasons ${minSeason}–${maxSeason})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
