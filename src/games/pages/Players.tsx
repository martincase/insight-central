import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamesDb, NIL_UUID } from "@/games/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, UserPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { GamesLogo } from "@/games/components/GamesLogo";
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

const Players = () => {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: players = [] } = useQuery({
    queryKey: ["cp-games", "players"],
    queryFn: async () => {
      const { data, error } = await gamesDb.from("cp_games_players").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await gamesDb.from("cp_games_players").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cp-games", "players"] });
      setNewPlayerName("");
      toast.success("Player added!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await gamesDb.from("cp_games_players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cp-games", "players"] });
      queryClient.invalidateQueries({ queryKey: ["cp-games", "leaderboard"] });
      toast.success("Player removed!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetAllDataMutation = useMutation({
    mutationFn: async () => {
      // Children first so nothing is left dangling if a later step fails.
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
      toast.success("All data has been reset!");
    },
    onError: () => toast.error("Failed to reset data"),
  });

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) addPlayerMutation.mutate(newPlayerName.trim());
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-4">
          <GamesLogo />
          <h1 className="text-3xl font-bold text-primary">Manage Players</h1>

          <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL players, events, scores, and mini golf rounds.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetAllDataMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
              className="flex-1"
            />
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim() || addPlayerMutation.isPending}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {players.map((player) => (
            <Card key={player.id} className="p-4 flex items-center justify-between">
              <span className="text-lg font-medium">{player.name}</span>
              <Button
                variant="destructive"
                size="icon"
                aria-label={`Remove ${player.name}`}
                onClick={() => deletePlayerMutation.mutate(player.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
          {players.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No players yet. Add the first one above.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Players;
