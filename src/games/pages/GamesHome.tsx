import { Navigate } from "react-router-dom";
import { GAMES_ROUTES } from "@/games/brand";

const GamesHome = () => <Navigate to={GAMES_ROUTES.leaderboard} replace />;

export default GamesHome;
