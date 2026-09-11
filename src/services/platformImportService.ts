export interface ImportedGamePlayer {
  username: string;
  rating: number;
  result: string;
}

export interface ImportedGame {
  id: string;
  platform: "chess.com" | "lichess";
  date: string;
  white: ImportedGamePlayer;
  black: ImportedGamePlayer;
  timeControl: string;
  result: string;
  pgn: string;
  url: string;
  openingName?: string;
  movesCount?: number;
}

export async function fetchChessComGames(username: string): Promise<ImportedGame[]> {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser) throw new Error("Please supply a valid Chess.com username.");

  const archiveRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUser)}/games/archives`);
  if (!archiveRes.ok) {
    if (archiveRes.status === 404) {
      throw new Error(`Player "${username}" was not found on Chess.com.`);
    }
    throw new Error(`Failed to fetch Chess.com archives (HTTP ${archiveRes.status}).`);
  }

  const archiveData = await archiveRes.json();
  const archives: string[] = archiveData.archives || [];
  if (archives.length === 0) {
    throw new Error(`No games found for player "${username}" on Chess.com.`);
  }

  const targetArchives = archives.slice(-2);
  let allGames: any[] = [];

  for (const archiveUrl of targetArchives) {
    try {
      const gRes = await fetch(archiveUrl);
      if (gRes.ok) {
        const gData = await gRes.json();
        if (Array.isArray(gData.games)) {
          allGames = allGames.concat(gData.games);
        }
      }
    } catch {}
  }

  if (allGames.length === 0) {
    throw new Error(`No games recorded in archives for "${username}".`);
  }

  allGames.sort((a, b) => (b.end_time || 0) - (a.end_time || 0));
  const recentGames = allGames.slice(0, 20);

  return recentGames.map((g, idx) => {
    const whiteUser = g.white?.username || "Unknown";
    const whiteRating = g.white?.rating || 0;
    const blackUser = g.black?.username || "Unknown";
    const blackRating = g.black?.rating || 0;

    let result = "1/2-1/2";
    if (g.white?.result === "win") result = "1-0";
    else if (g.black?.result === "win") result = "0-1";

    const dateStr = g.end_time ? new Date(g.end_time * 1000).toLocaleDateString() : "Recent";
    const ecoUrl = g.eco || "";
    const openingName = ecoUrl ? decodeURIComponent(ecoUrl.split("/").pop() || "").replace(/-/g, " ") : undefined;

    return {
      id: g.uuid || `chesscom-${idx}-${Date.now()}`,
      platform: "chess.com",
      date: dateStr,
      white: { username: whiteUser, rating: whiteRating, result: g.white?.result || "" },
      black: { username: blackUser, rating: blackRating, result: g.black?.result || "" },
      timeControl: g.time_control ? `${g.time_control}s` : g.time_class || "Standard",
      result,
      pgn: g.pgn || "",
      url: g.url || "",
      openingName,
    };
  });
}

export async function fetchLichessGames(username: string): Promise<ImportedGame[]> {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser) throw new Error("Please supply a valid Lichess username.");

  const res = await fetch(`https://lichess.org/api/games/user/${encodeURIComponent(cleanUser)}?max=20&pgnInJson=true&opening=true`, {
    headers: {
      Accept: "application/x-ndjson",
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Player "${username}" was not found on Lichess.`);
    }
    if (res.status === 429) {
      throw new Error("Lichess API rate limit encountered. Please wait a few seconds and try again.");
    }
    throw new Error(`Failed to retrieve Lichess games (HTTP ${res.status}).`);
  }

  const rawText = await res.text();
  const lines = rawText.trim().split("\n").filter(Boolean);
  if (lines.length === 0) {
    throw new Error(`No games found for player "${username}" on Lichess.`);
  }

  const imported: ImportedGame[] = [];

  for (const line of lines) {
    try {
      const g = JSON.parse(line);
      const whiteUser = g.players?.white?.user?.name || "Unknown";
      const whiteRating = g.players?.white?.rating || 0;
      const blackUser = g.players?.black?.user?.name || "Unknown";
      const blackRating = g.players?.black?.rating || 0;

      let result = "1/2-1/2";
      if (g.winner === "white") result = "1-0";
      else if (g.winner === "black") result = "0-1";

      const dateStr = g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "Recent";
      const openingName = g.opening?.name;

      imported.push({
        id: g.id || `lichess-${Date.now()}-${Math.random()}`,
        platform: "lichess",
        date: dateStr,
        white: { username: whiteUser, rating: whiteRating, result: g.winner === "white" ? "win" : "" },
        black: { username: blackUser, rating: blackRating, result: g.winner === "black" ? "win" : "" },
        timeControl: g.speed || "Standard",
        result,
        pgn: g.pgn || "",
        url: `https://lichess.org/${g.id}`,
        openingName,
      });
    } catch {}
  }

  return imported;
}
