import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { ASINDetailModal } from "@/components/dashboard/ASINDetailModal";
import { AuthProvider } from "@/hooks/useAuth";
import FeedbackWidget from "@/components/FeedbackWidget";

const Index = React.lazy(() => import("./pages/Index"));
const CampaignDrilldown = React.lazy(() => import("./pages/CampaignDrilldown"));
const SharedView = React.lazy(() => import("./pages/SharedView"));
const ClientView = React.lazy(() => import("./pages/ClientView"));
const AdminView = React.lazy(() => import("./pages/AdminView"));
const PublicRoadmap = React.lazy(() => import("./pages/PublicRoadmap"));
const DemoView = React.lazy(() => import("./pages/DemoView"));
const ASINHub = React.lazy(() => import("./pages/ASINHub"));
const AgencyView = React.lazy(() => import("./pages/AgencyView"));
const FeedbackAdmin = React.lazy(() => import("./pages/FeedbackAdmin"));
const ListingImages = React.lazy(() => import("./pages/ListingImages"));

const NotFound = React.lazy(() => import("./pages/NotFound"));

// Center Parcs Games: the family scoreboard ported from the Lovable "Orlando Game Hub"
// project. Public like the share links, on its own cp_games_* tables and its own theme.
const GamesLayout = React.lazy(() => import("./games/components/GamesLayout"));
const GamesHome = React.lazy(() => import("./games/pages/GamesHome"));
const GamesPlayers = React.lazy(() => import("./games/pages/Players"));
const GamesNewEvent = React.lazy(() => import("./games/pages/NewEvent"));
const GamesMiniGolf = React.lazy(() => import("./games/pages/MiniGolf"));
const GamesLeaderboard = React.lazy(() => import("./games/pages/Leaderboard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
          <Routes>
            {/* Staff routes. AuthGate here rather than inside each page so a new staff
                route cannot be added unprotected by accident. /admin and /agency are ALSO
                behind Cloudflare Access; these three were not, and when Access was relaxed
                to let client share links through on 2026-08-16 they became publicly
                reachable — /feedback in particular renders client dashboard screenshots. */}
            <Route path="/" element={<AuthGate><Index /></AuthGate>} />
            <Route path="/campaigns" element={<AuthGate><CampaignDrilldown /></AuthGate>} />
            <Route path="/admin" element={<AuthGate><AdminView /></AuthGate>} />
            <Route path="/agency" element={<AuthGate><AgencyView /></AuthGate>} />
            <Route path="/feedback" element={<AuthGate><FeedbackAdmin /></AuthGate>} />
            <Route path="/listing-images" element={<AuthGate><ListingImages /></AuthGate>} />
            <Route path="/asin/:asin" element={<AuthGate><ASINHub /></AuthGate>} />

            {/* Deliberately public: client share links, the demo and the roadmap. */}
            <Route path="/share/:shareId" element={<SharedView />} />
            <Route path="/:brandName/:shareId" element={<SharedView />} />
            <Route path="/client/:accountId/:token" element={<ClientView />} />
            <Route path="/roadmap" element={<PublicRoadmap />} />
            <Route path="/demo" element={<DemoView />} />

            {/* Center Parcs Games. Static segments, so these outrank /:brandName/:shareId. */}
            <Route path="/games" element={<GamesLayout />}>
              <Route index element={<GamesHome />} />
              <Route path="players" element={<GamesPlayers />} />
              <Route path="new-event" element={<GamesNewEvent />} />
              <Route path="mini-golf" element={<GamesMiniGolf />} />
              <Route path="leaderboard" element={<GamesLeaderboard />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
        <ASINDetailModal />
        <FeedbackWidget />
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
