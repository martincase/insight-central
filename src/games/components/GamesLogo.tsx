import logo from "@/games/assets/center-parcs-games-logo.svg";
import { GAMES_BRAND } from "@/games/brand";

export const GamesLogo = ({ className = "w-32 h-32" }: { className?: string }) => (
  <img
    src={logo}
    alt={GAMES_BRAND.name}
    className={`${className} rounded-full object-cover shadow-md`}
  />
);
