import { Link, useLocation } from "react-router-dom";
import { Users, PlusCircle, Trophy, Flag, Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/games/hooks/useNetworkStatus";
import { GAMES_ROUTES } from "@/games/brand";

const items = [
  { to: GAMES_ROUTES.players, label: "Players", Icon: Users },
  { to: GAMES_ROUTES.newEvent, label: "New Event", Icon: PlusCircle },
  { to: GAMES_ROUTES.miniGolf, label: "Mini Golf", Icon: Flag },
  { to: GAMES_ROUTES.leaderboard, label: "Leaderboard", Icon: Trophy },
];

const BottomNav = () => {
  const location = useLocation();
  const { isOnline } = useNetworkStatus();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto relative">
        {/* Sits just above the bar so it never overlaps the last tab's icon. */}
        <div className="absolute -top-5 right-2 flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-600" />
          ) : (
            <WifiOff className="w-3 h-3 text-destructive" />
          )}
          <span className="text-[10px] text-muted-foreground">{isOnline ? "Online" : "Offline"}</span>
        </div>

        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              location.pathname === to ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
