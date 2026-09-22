import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamesDb } from "@/games/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { GamesLogo } from "@/games/components/GamesLogo";
import { GAMES_ROUTES } from "@/games/brand";

const NewEvent = () => {
  const [eventName, setEventName] = useState("");
  const [firstPlace, setFirstPlace] = useState("");
  const [secondPlace, setSecondPlace] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: players = [] } = useQuery({
    queryKey: ["cp-games", "players"],
    queryFn: async () => {
      const { data, error } = await gamesDb.from("cp_games_players").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventName.trim() || !firstPlace || !secondPlace) throw new Error("Please fill all fields");
      if (firstPlace === secondPlace) throw new Error("Players must be different");

      const { data: event, error: eventError } = await gamesDb
        .from("cp_games_events")
        .insert({ name: eventName.trim() })
        .select()
        .single();
      if (eventError) throw eventError;

      const { error: scoresError } = await gamesDb.from("cp_games_scores").insert([
        { event_id: event.id, player_id: firstPlace, position: 1, points: 3 },
        { event_id: event.id, player_id: secondPlace, position: 2, points: 1 },
      ]);
      if (scoresError) throw scoresError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cp-games", "leaderboard"] });
      toast.success("Event recorded!");
      navigate(GAMES_ROUTES.leaderboard);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center gap-4">
          <GamesLogo />
          <h1 className="text-3xl font-bold text-primary">Record Event</h1>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Name</label>
            <Input
              placeholder="e.g., Pool, Badminton, Bowling"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-secondary" />
              1st Place (3 points)
            </label>
            <Select value={firstPlace} onValueChange={setFirstPlace}>
              <SelectTrigger>
                <SelectValue placeholder="Select winner" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Medal className="w-4 h-4 text-accent" />
              2nd Place (1 point)
            </label>
            <Select value={secondPlace} onValueChange={setSecondPlace}>
              <SelectTrigger>
                <SelectValue placeholder="Select second place" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => createEventMutation.mutate()}
            className="w-full"
            size="lg"
            disabled={!eventName.trim() || !firstPlace || !secondPlace || createEventMutation.isPending}
          >
            Record Event
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default NewEvent;
