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
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const Index = lazyWithRetry(() => import("./pages/Index"));
const CampaignDrilldown = lazyWithRetry(() => import("./pages/CampaignDrilldown"));
const SharedView = lazyWithRetry(() => import("./pages/SharedView"));
const AdminView = lazyWithRetry(() => import("./pages/AdminView"));
const PublicRoadmap = lazyWithRetry(() => import("./pages/PublicRoadmap"));
const DemoView = lazyWithRetry(() => import("./pages/DemoView"));
const ASINHub = lazyWithRetry(() => import("./pages/ASINHub"));
const AgencyView = lazyWithRetry(() => import("./pages/AgencyView"));
const FeedbackAdmin = lazyWithRetry(() => import("./pages/FeedbackAdmin"));
const ListingImages = lazyWithRetry(() => import("./pages/ListingImages"));

const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Center Parcs Games: the family scoreboard ported from the Lovable "Orlando Game Hub"
// project. Public like the share links, on its own cp_games_* tables and its own theme.
const GamesLayout = lazyWithRetry(() => import("./games/components/GamesLayout"));
const GamesHome = lazyWithRetry(() => import("./games/pages/GamesHome"));
const GamesPlayers = lazyWithRetry(() => import("./games/pages/Players"));
const GamesNewEvent = lazyWithRetry(() => import("./games/pages/NewEvent"));
const GamesMiniGolf = lazyWithRetry(() => import("./games/pages/MiniGolf"));
const GamesLeaderboard = lazyWithRetry(() => import("./games/pages/Leaderboard"));

const queryClient = new QueryClient();

// Nothing wrapped the routed page itself: an unhandled render-time error (not
// a data-fetch error, which pages already catch) unmounted the whole React
// tree and left a blank white screen with no way back short of a manual
// reload. This boundary is the backstop for that failure mode.
const RouteCrashFallback = (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Something went wrong</h1>
        <p className="mb-4 text-gray-700">
          This page hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Reload
        </button>
        <p className="mt-4 text-sm text-gray-500">
          If this keeps happening, contact us at{' '}
          <a href="mailto:hello@martincase.co.uk" className="text-blue-600 hover:text-blue-800 underline">
            hello@martincase.co.uk
          </a>.
        </p>
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
        <ErrorBoundary fallback={RouteCrashFallback} showErrorDetail={false}>
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
        </ErrorBoundary>
        </React.Suspense>
        <ASINDetailModal />
        <FeedbackWidget />
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
