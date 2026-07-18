import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import SilverBall from "./pages/SilverBall";
import GoldenBall from "./pages/GoldenBall";
import LiveMatch from "./pages/LiveMatch";
import Admin from "./pages/Admin";
import Team from "./pages/Team";
import Player from "./pages/Player";
import Series from "./pages/Series";
import Match from "./pages/Match";
import MatchHistory from "./pages/MatchHistory";
import Scorer from "./pages/Scorer";

import BackgroundEffects from "./components/BackgroundEffects";

export default function App() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      <BackgroundEffects />
      <div className="relative z-10">
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/home"    element={<Home />} />
          <Route path="/silver-ball" element={<SilverBall />} />
          <Route path="/golden-ball" element={<GoldenBall />} />
          <Route path="/live"    element={<LiveMatch />} />
          <Route path="/admin"   element={<Admin />} />
          <Route path="/team/:competition/:team"       element={<Team />} />
          <Route path="/player/:competition/:playerId" element={<Player />} />
          <Route path="/series/:seriesId" element={<Series />} />
          <Route path="/match/:matchId"   element={<Match />} />
          <Route path="/matches" element={<MatchHistory />} />
          <Route path="/scorer"  element={<Scorer />} />
        </Routes>
      </div>
    </div>
  );
}