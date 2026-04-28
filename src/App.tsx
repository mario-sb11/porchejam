import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import PlaylistSelection from "./pages/PlaylistSelection";
import GameModes from "./pages/GameModes";
import LocalLobby from "./pages/LocalLobby";
import GameSettings from "./pages/GameSettings";
import GameInterface from "./pages/GameInterface";
import ImposterInterface from "./pages/ImposterInterface"; 
import Lobby from "./pages/Lobby";
import PostGameSummary from "./pages/PostGameSummary";
import FinalResults from "./pages/FinalResults";
import DailyChallenge from "./pages/DailyChallenge";
import DailyChallengeResult from "./pages/DailyChallengeResult";
import UserProfile from "./pages/UserProfile";
import NotFound from "./pages/NotFound";
import PreGameStats from "./pages/PreGameStats"; 
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import LegalNotice from "./pages/LegalNotice";
import MusicRace from "./pages/MusicRace";
import MusicRaceGame from "./pages/MusicRaceGame";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
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
              <Route path="/daily-result" element={<DailyChallengeResult />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/stats" element={<PreGameStats />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/legal" element={<LegalNotice />} />
              <Route path="/music-race" element={<MusicRace />} />
              <Route path="/music-race-game" element={<MusicRaceGame />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
          <CookieBanner />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;