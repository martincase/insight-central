import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/games/components/BottomNav";
import { GAMES_BRAND } from "@/games/brand";
import "@/games/games.css";

/**
 * Shell for every games page: applies the scoped theme, sets the tab title while the
 * games are open (and restores Insight Central's on the way out), and pins the nav.
 */
const GamesLayout = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = GAMES_BRAND.name;
    // Lets games.css reach things rendered outside this tree (the toast stack).
    document.body.classList.add("cp-games-active");
    return () => {
      document.title = previous;
      document.body.classList.remove("cp-games-active");
    };
  }, []);

  return (
    <div className="cp-games min-h-screen">
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default GamesLayout;
