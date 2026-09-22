import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamesDb, NIL_UUID } from "@/games/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Medal, Award, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { GamesLogo } from "@/games/components/GamesLogo";
import { GAMES_BRAND } from "@/games/brand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeaderboardEntry {
  player_id: string;
  player_name: string;
  total_points: number;
  first_places: number;
  second_places: number;
}

const Leaderboard = () => {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["cp-games", "leaderboard"],
    queryFn: async () => {
      const { data: scores, error } = await gamesDb
        .from("cp_games_scores")
        .select("player_id, points, position, cp_games_players (name)");
      if (error) throw error;

      const stats = scores.reduce((acc, score) => {
        const id = score.player_id;
        if (!acc[id]) {
          acc[id] = {
            player_id: id,
            player_name: score.cp_games_players?.name || "Unknown",
            total_points: 0,
            first_places: 0,
            second_places: 0,
          };
        }
        acc[id].total_points += score.points;
        if (score.position === 1) acc[id].first_places++;
        if (score.position === 2) acc[id].second_places++;
        return acc;
      }, {} as Record<string, LeaderboardEntry>);

      return Object.values(stats).sort((a, b) => b.total_points - a.total_points);
    },
  });

  const resetAllDataMutation = useMutation({
    mutationFn: async () => {
      const tables = [
        "cp_games_scores",
        "cp_games_mini_golf_hole_scores",
        "cp_games_mini_golf_round_players",
        "cp_games_events",
        "cp_games_mini_golf_rounds",
        "cp_games_players",
      ] as const;
      for (const table of tables) {
        const { error } = await gamesDb.from(table).delete().neq("id", NIL_UUID);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cp-games"] });
      setIsResetDialogOpen(false);
      setConfirmText("");
      toast.success("All data has been reset!");
    },
    onError: () => toast.error("Failed to reset data"),
  });

  const handleExportData = async () => {
    try {
      const [players, events, scores, rounds, holeScores, roundPlayers] = await Promise.all([
        gamesDb.from("cp_games_players").select("*"),
        gamesDb.from("cp_games_events").select("*"),
        gamesDb.from("cp_games_scores").select("*"),
        gamesDb.from("cp_games_mini_golf_rounds").select("*"),
        gamesDb.from("cp_games_mini_golf_hole_scores").select("*"),
        gamesDb.from("cp_games_mini_golf_round_players").select("*"),
      ]);

      const exportData = {
        app: GAMES_BRAND.name,
        exportedAt: new Date().toISOString(),
        players: players.data || [],
        events: events.data || [],
        scores: scores.data || [],
        mini_golf_rounds: rounds.data || [],
        mini_golf_hole_scores: holeScores.data || [],
        mini_golf_round_players: roundPlayers.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${GAMES_BRAND.backupFilePrefix}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch {
      toast.error("Failed to export data");
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-secondary" />;
    if (index === 1) return <Medal className="w-6 h-6 text-accent" />;
    if (index === 2) return <Award className="w-6 h-6 text-primary" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-4">
          <GamesLogo />
          <h1 className="text-3xl font-bold text-primary">Leaderboard</h1>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="w-4 h-4 mr-2" />
              Export Backup
            </Button>

            <AlertDialog
              open={isResetDialogOpen}
              onOpenChange={(open) => {
                setIsResetDialogOpen(open);
                if (!open) setConfirmText("");
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">⚠️ Danger Zone</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        This will permanently delete ALL players, events, scores, and mini golf rounds.
                        This action cannot be undone.
                      </p>
                      <p className="font-medium">
                        Type <span className="font-mono bg-muted px-1 rounded">DELETE</span> to confirm:
                      </p>
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="mt-2"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => confirmText === "DELETE" && resetAllDataMutation.mutate()}
                    disabled={confirmText !== "DELETE"}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <Card key={entry.player_id} className={`p-4 ${index === 0 ? "border-secondary border-2" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</span>
                  {getRankIcon(index)}
                  <div>
                    <p className="text-lg font-semibold">{entry.player_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.first_places} wins · {entry.second_places} seconds
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{entry.total_points}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            </Card>
          ))}
          {leaderboard.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No scores yet. Record your first event!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
