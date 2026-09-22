import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gamesDb } from "@/games/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Minus, Plus, Trophy, Medal, Undo2, Play, X } from "lucide-react";
import { format } from "date-fns";

type Step = "setup" | "scoring" | "complete";

interface SelectedPlayer {
  id: string;
  name: string;
}

interface HoleScore {
  playerId: string;
  playerName: string;
  holeNumber: number;
  strokes: number;
}

interface InProgressRound {
  id: string;
  event_name: string;
  holes_count: number;
  current_hole: number;
}

const defaultEventName = () => `Mini Golf - ${format(new Date(), "MMM d, yyyy")}`;

const MiniGolf = () => {
  const queryClient = useQueryClient();
  const scoringRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("setup");
  const [holesCount, setHolesCount] = useState<9 | 18>(9);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [eventName, setEventName] = useState(defaultEventName());
  const [roundId, setRoundId] = useState<string | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [currentStrokes, setCurrentStrokes] = useState(1);
  const [scores, setScores] = useState<HoleScore[]>([]);
  const [inProgressRound, setInProgressRound] = useState<InProgressRound | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: players } = useQuery({
    queryKey: ["cp-games", "players"],
    queryFn: async () => {
      const { data, error } = await gamesDb.from("cp_games_players").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Look for a round left in progress (phone died, page refreshed) so it can be resumed.
  useEffect(() => {
    const checkInProgressRound = async () => {
      try {
        const { data: rounds, error } = await gamesDb
          .from("cp_games_mini_golf_rounds")
          .select("*")
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw error;

        if (rounds && rounds.length > 0) {
          const round = rounds[0];
          setInProgressRound({
            id: round.id,
            event_name: round.event_name,
            holes_count: round.holes_count,
            current_hole: round.current_hole,
          });
        }
      } catch (error) {
        console.error("Error checking for in-progress rounds:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkInProgressRound();
  }, []);

  // Which hole to be on: the first one that not every player has a score for.
  const calculateCurrentHole = (roundPlayers: SelectedPlayer[], roundScores: HoleScore[], maxHoles: number) => {
    for (let hole = 1; hole <= maxHoles; hole++) {
      const scored = roundPlayers.filter((p) => roundScores.some((s) => s.playerId === p.id && s.holeNumber === hole));
      if (scored.length < roundPlayers.length) return hole;
    }
    return maxHoles;
  };

  const handleResumeRound = async () => {
    if (!inProgressRound) return;
    if (selectedPlayers.length === 0) {
      toast.error("Please select players first");
      return;
    }

    try {
      setIsLoading(true);

      const { data: roundPlayers, error: playersError } = await gamesDb
        .from("cp_games_mini_golf_round_players")
        .select("player_id, cp_games_players(id, name)")
        .eq("round_id", inProgressRound.id);
      if (playersError) throw playersError;

      let resumedPlayers: SelectedPlayer[];

      if (!roundPlayers || roundPlayers.length === 0) {
        // Older round with no player links: save the currently ticked players to it.
        const { error: insertError } = await gamesDb
          .from("cp_games_mini_golf_round_players")
          .insert(selectedPlayers.map((p) => ({ round_id: inProgressRound.id, player_id: p.id })));
        if (insertError) throw insertError;
        resumedPlayers = selectedPlayers;
      } else {
        resumedPlayers = roundPlayers
          .map((rp) => ({ id: rp.cp_games_players?.id, name: rp.cp_games_players?.name }))
          .filter((p): p is SelectedPlayer => Boolean(p.id && p.name));
      }

      const { data: existingScores, error: scoresError } = await gamesDb
        .from("cp_games_mini_golf_hole_scores")
        .select("*")
        .eq("round_id", inProgressRound.id);
      if (scoresError) throw scoresError;

      const resumedScores: HoleScore[] = (existingScores ?? []).map((score) => {
        const player = resumedPlayers.find((p) => p.id === score.player_id);
        return {
          playerId: score.player_id,
          playerName: player?.name || "Unknown",
          holeNumber: score.hole_number,
          strokes: score.strokes,
        };
      });

      setRoundId(inProgressRound.id);
      setEventName(inProgressRound.event_name);
      setHolesCount(inProgressRound.holes_count as 9 | 18);
      setSelectedPlayers(resumedPlayers);
      setScores(resumedScores);
      setCurrentHole(calculateCurrentHole(resumedPlayers, resumedScores, inProgressRound.holes_count));
      setStep("scoring");
      setInProgressRound(null);

      toast.success(`Resumed: ${inProgressRound.event_name}`);
    } catch (error) {
      console.error("Error resuming round:", error);
      toast.error("Failed to resume round");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbandonRound = async () => {
    if (!inProgressRound) return;
    try {
      const { error } = await gamesDb
        .from("cp_games_mini_golf_rounds")
        .update({ status: "abandoned" })
        .eq("id", inProgressRound.id);
      if (error) throw error;
      setInProgressRound(null);
      toast.success("Round abandoned");
    } catch (error) {
      console.error("Error abandoning round:", error);
      toast.error("Failed to abandon round");
    }
  };

  const createRound = useMutation({
    mutationFn: async () => {
      const { data, error } = await gamesDb
        .from("cp_games_mini_golf_rounds")
        .insert({
          event_name: eventName,
          holes_count: holesCount,
          status: "in_progress",
          current_hole: 1,
          current_player_index: 0,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: playersError } = await gamesDb
        .from("cp_games_mini_golf_round_players")
        .insert(selectedPlayers.map((p) => ({ round_id: data.id, player_id: p.id })));
      if (playersError) throw playersError;

      return data;
    },
    onSuccess: (data) => {
      setRoundId(data.id);
      setStep("scoring");
      toast.success("Round started!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveScore = useMutation({
    mutationFn: async ({ playerId, holeNumber, strokes }: { playerId: string; holeNumber: number; strokes: number }) => {
      const { error } = await gamesDb
        .from("cp_games_mini_golf_hole_scores")
        .insert({ round_id: roundId!, player_id: playerId, hole_number: holeNumber, strokes });
      if (error) throw error;
    },
  });

  const deleteScore = useMutation({
    mutationFn: async ({ playerId, holeNumber }: { playerId: string; holeNumber: number }) => {
      const { error } = await gamesDb
        .from("cp_games_mini_golf_hole_scores")
        .delete()
        .eq("round_id", roundId!)
        .eq("player_id", playerId)
        .eq("hole_number", holeNumber);
      if (error) throw error;
    },
  });

  const updateCurrentHoleInDb = async (hole: number) => {
    if (!roundId) return;
    try {
      await gamesDb.from("cp_games_mini_golf_rounds").update({ current_hole: hole }).eq("id", roundId);
    } catch (error) {
      console.error("Error updating current hole:", error);
    }
  };

  const completeRound = useMutation({
    mutationFn: async () => {
      const { error: roundError } = await gamesDb
        .from("cp_games_mini_golf_rounds")
        .update({ status: "completed" })
        .eq("id", roundId!);
      if (roundError) throw roundError;

      // Lowest strokes wins.
      const playerTotals = selectedPlayers
        .map((player) => ({
          playerId: player.id,
          playerName: player.name,
          total: scores.filter((s) => s.playerId === player.id).reduce((sum, s) => sum + s.strokes, 0),
        }))
        .sort((a, b) => a.total - b.total);

      const { data: event, error: eventError } = await gamesDb
        .from("cp_games_events")
        .insert({ name: eventName, event_date: new Date().toISOString() })
        .select()
        .single();
      if (eventError) throw eventError;

      // Same points as any other event: 3 for the winner, 1 for second.
      const pointsData = [];
      if (playerTotals[0]) pointsData.push({ event_id: event.id, player_id: playerTotals[0].playerId, position: 1, points: 3 });
      if (playerTotals[1]) pointsData.push({ event_id: event.id, player_id: playerTotals[1].playerId, position: 2, points: 1 });

      if (pointsData.length > 0) {
        const { error: scoresError } = await gamesDb.from("cp_games_scores").insert(pointsData);
        if (scoresError) throw scoresError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cp-games", "leaderboard"] });
      setStep("complete");
      toast.success("Round saved to leaderboard!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handlePlayerToggle = (player: { id: string; name: string }) => {
    setSelectedPlayers((prev) =>
      prev.some((p) => p.id === player.id) ? prev.filter((p) => p.id !== player.id) : [...prev, player]
    );
  };

  const handleStartRound = () => {
    if (selectedPlayers.length < 2) {
      toast.error("Select at least 2 players");
      return;
    }
    createRound.mutate();
  };

  const handleSaveScore = async () => {
    if (!selectedPlayerId) {
      toast.error("Please select a player");
      return;
    }
    const currentPlayer = selectedPlayers.find((p) => p.id === selectedPlayerId)!;

    const newScore: HoleScore = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      holeNumber: currentHole,
      strokes: currentStrokes,
    };

    setScores((prev) => [...prev, newScore]);
    try {
      await saveScore.mutateAsync({ playerId: currentPlayer.id, holeNumber: currentHole, strokes: currentStrokes });
    } catch (error) {
      // Roll the optimistic add back so the round doesn't drift from the database.
      setScores((prev) => prev.filter((s) => s !== newScore));
      toast.error("Score didn't save. Check the connection and try again.");
      return;
    }

    setSelectedPlayerId(null);
    setCurrentStrokes(1);

    // `scores` is the pre-update snapshot, so +1 for the one just added.
    const playersCompletedThisHole = scores.filter((s) => s.holeNumber === currentHole).length + 1;
    if (playersCompletedThisHole === selectedPlayers.length) {
      if (currentHole < holesCount) {
        const nextHole = currentHole + 1;
        setCurrentHole(nextHole);
        await updateCurrentHoleInDb(nextHole);
        toast.success(`Hole ${currentHole} complete!`);
      } else {
        await completeRound.mutateAsync();
      }
    }

    scoringRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hasPlayerCompletedHole = (playerId: string, holeNumber: number) =>
    scores.some((s) => s.playerId === playerId && s.holeNumber === holeNumber);

  const getPlayersRemainingForHole = () => selectedPlayers.filter((p) => !hasPlayerCompletedHole(p.id, currentHole));

  const handleUndoLastScore = async () => {
    if (scores.length === 0) {
      toast.error("No scores to undo");
      return;
    }
    const lastScore = scores[scores.length - 1];

    try {
      await deleteScore.mutateAsync({ playerId: lastScore.playerId, holeNumber: lastScore.holeNumber });
    } catch {
      toast.error("Couldn't undo that score. Check the connection and try again.");
      return;
    }

    setScores((prev) => prev.slice(0, -1));

    if (lastScore.holeNumber < currentHole) {
      setCurrentHole(lastScore.holeNumber);
      await updateCurrentHoleInDb(lastScore.holeNumber);
    }

    toast.success(`Undid ${lastScore.playerName}'s score on hole ${lastScore.holeNumber}`);
  };

  const handleNewRound = () => {
    setStep("setup");
    setHolesCount(9);
    setSelectedPlayers([]);
    setEventName(defaultEventName());
    setRoundId(null);
    setCurrentHole(1);
    setSelectedPlayerId(null);
    setCurrentStrokes(1);
    setScores([]);
  };

  const getPlayerTotal = (playerId: string) =>
    scores.filter((s) => s.playerId === playerId).reduce((sum, s) => sum + s.strokes, 0);

  const getFinalScoreboard = () =>
    selectedPlayers
      .map((player) => ({ playerId: player.id, playerName: player.name, total: getPlayerTotal(player.id) }))
      .sort((a, b) => a.total - b.total);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          <h1 className="text-3xl font-bold text-center mb-6 text-primary">⛳ Mini Golf Setup</h1>

          {inProgressRound && (
            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  Resume Round
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-lg">{inProgressRound.event_name}</p>
                  <p className="text-muted-foreground">
                    Hole {inProgressRound.current_hole} of {inProgressRound.holes_count}
                  </p>
                  {selectedPlayers.length === 0 && (
                    <p className="text-amber-600 text-sm mt-2">⚠️ Select players below to resume this round</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleResumeRound} className="flex-1" disabled={selectedPlayers.length === 0}>
                    <Play className="h-4 w-4 mr-2" />
                    Resume {selectedPlayers.length > 0 && `(${selectedPlayers.length} players)`}
                  </Button>
                  <Button onClick={handleAbandonRound} variant="outline" className="text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Abandon
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Event Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} className="text-lg" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Number of Holes</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                variant={holesCount === 9 ? "default" : "outline"}
                className="flex-1 h-20 text-xl"
                onClick={() => setHolesCount(9)}
              >
                9 Holes
              </Button>
              <Button
                variant={holesCount === 18 ? "default" : "outline"}
                className="flex-1 h-20 text-xl"
                onClick={() => setHolesCount(18)}
              >
                18 Holes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {players?.map((player) => (
                <div key={player.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`mg-${player.id}`}
                    checked={selectedPlayers.some((p) => p.id === player.id)}
                    onCheckedChange={() => handlePlayerToggle(player)}
                  />
                  <Label htmlFor={`mg-${player.id}`} className="text-lg cursor-pointer flex-1">
                    {player.name}
                  </Label>
                </div>
              ))}
              {players && players.length === 0 && (
                <p className="text-muted-foreground">No players yet. Add some on the Players tab.</p>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleStartRound}
            disabled={selectedPlayers.length < 2 || createRound.isPending}
            className="w-full h-14 text-xl"
          >
            Start Round
          </Button>
        </div>
      </div>
    );
  }

  if (step === "scoring") {
    const playersRemaining = getPlayersRemainingForHole();
    const selectedPlayer = selectedPlayers.find((p) => p.id === selectedPlayerId);

    return (
      <div ref={scoringRef} className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-muted-foreground">
              Hole {currentHole} of {holesCount}
            </h1>
            {selectedPlayer && <h2 className="text-4xl font-bold text-primary">{selectedPlayer.name}</h2>}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Player</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {selectedPlayers.map((player) => {
                  const completed = hasPlayerCompletedHole(player.id, currentHole);
                  return (
                    <Button
                      key={player.id}
                      variant={selectedPlayerId === player.id ? "default" : "outline"}
                      className="h-16 text-lg relative"
                      onClick={() => setSelectedPlayerId(player.id)}
                      disabled={completed}
                    >
                      {player.name}
                      {completed && <span className="absolute top-1 right-1 text-green-600">✓</span>}
                    </Button>
                  );
                })}
              </div>
              {playersRemaining.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  {playersRemaining.length} player{playersRemaining.length !== 1 ? "s" : ""} remaining
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Strokes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-16"
                  aria-label="One stroke fewer"
                  onClick={() => setCurrentStrokes(Math.max(1, currentStrokes - 1))}
                  disabled={!selectedPlayerId}
                >
                  <Minus className="h-8 w-8" />
                </Button>
                <div className="text-6xl font-bold text-primary min-w-[100px] text-center">{currentStrokes}</div>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-16"
                  aria-label="One stroke more"
                  onClick={() => setCurrentStrokes(currentStrokes + 1)}
                  disabled={!selectedPlayerId}
                >
                  <Plus className="h-8 w-8" />
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSaveScore}
                  disabled={!selectedPlayerId || saveScore.isPending}
                  className="flex-1 h-14 text-xl"
                >
                  Save Score
                </Button>
                <Button
                  onClick={handleUndoLastScore}
                  disabled={scores.length === 0 || deleteScore.isPending}
                  variant="outline"
                  className="h-14 px-6"
                  aria-label="Undo last score"
                >
                  <Undo2 className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedPlayers.map((player) => (
                  <div key={player.id} className="flex justify-between items-center p-2 rounded bg-muted">
                    <span className={player.id === selectedPlayerId ? "font-bold text-primary" : ""}>{player.name}</span>
                    <span className="font-mono text-lg">{getPlayerTotal(player.id)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    const finalScoreboard = getFinalScoreboard();

    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          <h1 className="text-3xl font-bold text-center text-primary">🏆 Round Complete!</h1>

          <Card>
            <CardHeader>
              <CardTitle>Final Scoreboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {finalScoreboard.map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      index === 0
                        ? "bg-yellow-500/20 border-2 border-yellow-500"
                        : index === 1
                        ? "bg-gray-400/20 border-2 border-gray-400"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                      {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                      <span className="font-bold text-lg">{player.playerName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold">{player.total}</div>
                      {index === 0 && <div className="text-sm text-muted-foreground">+3 pts</div>}
                      {index === 1 && <div className="text-sm text-muted-foreground">+1 pt</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleNewRound} className="w-full h-14 text-xl">
            Start New Round
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default MiniGolf;
