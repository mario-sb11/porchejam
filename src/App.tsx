import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { AuthProviderRoot } from "@/contexts/AuthContext";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
const PlaylistSelection = lazy(() => import("./pages/PlaylistSelection"));
const GameModes = lazy(() => import("./pages/GameModes"));
const LocalLobby = lazy(() => import("./pages/LocalLobby"));
const GameSettings = lazy(() => import("./pages/GameSettings"));
const GameInterface = lazy(() => import("./pages/GameInterface"));
const ImposterInterface = lazy(() => import("./pages/ImposterInterface"));
const Lobby = lazy(() => import("./pages/Lobby"));
const PostGameSummary = lazy(() => import("./pages/PostGameSummary"));
const FinalResults = lazy(() => import("./pages/FinalResults"));
const DailyChallenge = lazy(() => import("./pages/DailyChallenge"));
const DailyChallengeResult = lazy(() => import("./pages/DailyChallengeResult"));
const DailyGame = lazy(() => import("./pages/DailyGame"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PreGameStats = lazy(() => import("./pages/PreGameStats"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const MusicRace = lazy(() => import("./pages/MusicRace"));
const MusicRaceGame = lazy(() => import("./pages/MusicRaceGame"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProviderRoot>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            {/* Cada pantalla se descarga solo cuando se visita: la primera carga es mucho más ligera. */}
            <Suspense fallback={<div className="min-h-screen gradient-bg" aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/playlists" element={<PlaylistSelection />} />
              <Route path="/modes" element={<GameModes />} />
              <Route path="/local-lobby" element={<LocalLobby />} />
              <Route path="/settings" element={<GameSettings />} />
              <Route path="/game" element={<GameInterface />} />
              <Route path="/imposter" element={<ImposterInterface />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/summary" element={<PostGameSummary />} />
              <Route path="/results" element={<FinalResults />} />
              <Route path="/cancion-del-dia" element={<DailyChallenge />} />
              <Route path="/cancion-del-dia/:categoria" element={<DailyGame />} />
              <Route path="/cancion-del-dia/:categoria/resultado" element={<DailyChallengeResult />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/stats" element={<PreGameStats />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<LegalNotice />} />
              <Route path="/music-race" element={<MusicRace />} />
              <Route path="/music-race-game" element={<MusicRaceGame />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </div>
          <Footer />
          <CookieBanner />
        </div>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProviderRoot>
  </QueryClientProvider>
);

export default App;