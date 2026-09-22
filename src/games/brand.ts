/**
 * Everything brand-specific for the games app lives here, so the whole thing can be
 * rebadged (or its spelling corrected) by editing one file.
 */
export const GAMES_BRAND = {
  name: "Center Parcs Games",
  shortName: "CP Games",
  year: 2026,
  /** Prefix for the browser download name of the JSON backup. */
  backupFilePrefix: "center-parcs-games-backup",
  /** Path the whole app is mounted under in Insight Central's router. */
  basePath: "/games",
} as const;

export const GAMES_ROUTES = {
  home: GAMES_BRAND.basePath,
  players: `${GAMES_BRAND.basePath}/players`,
  newEvent: `${GAMES_BRAND.basePath}/new-event`,
  miniGolf: `${GAMES_BRAND.basePath}/mini-golf`,
  leaderboard: `${GAMES_BRAND.basePath}/leaderboard`,
} as const;
