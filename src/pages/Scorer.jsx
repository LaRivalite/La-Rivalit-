import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ScoreHeader from "../components/scorer/ScoreHeader";
import ActionGrid from "../components/scorer/ActionGrid";
import BottomSheet from "../components/scorer/BottomSheet";
import CurrentOver from "../components/scorer/timeline/CurrentOver";
import OverHistory from "../components/scorer/timeline/OverHistory";
import WicketSheet from "../components/scorer/sheets/WicketSheet";
import WideSheet from "../components/scorer/sheets/WideSheet";
import NoBallSheet from "../components/scorer/sheets/NoBallSheet";
import ByeSheet from "../components/scorer/sheets/ByeSheet";
import SelectionGrid from "../components/scorer/shared/SelectionGrid";
import SheetFooter from "../components/scorer/shared/SheetFooter";
import MatchSetup from "../components/scorer/MatchSetup";
import InningsBreak from "../components/scorer/InningsBreak";
import MatchResult from "../components/scorer/MatchResult";
import { useSheet } from "../context/SheetContext";
import { useMatch } from "../context/MatchContext";
import { availableBowlers } from "../engine/availableBatters";
import { onQueueChange } from "../lib/writeQueue";
import { abandonMatchInDB } from "../lib/matchApi";

function getScreen(match, innings1, matchResult) {
  if (!match)      return "setup";
  if (matchResult) return "result";
  if (innings1 && match.innings === 1) return "innings_break";
  return "scoring";
}

const ADMIN_AUTH_KEY = "la-rivalite-admin-auth";

export default function Scorer() {
  const navigateTo = useNavigate();
  const { sheet, openSheet, closeSheet } = useSheet();
  const { match, setMatch, undoLastBall, endMatch, saveInnings1, matchResult, innings1, clearMatchSession, recoveryMatch, dismissRecovery } = useMatch();

  // Auth check — must be admin to score
  const isAuthed = (() => {
    try { return localStorage.getItem(ADMIN_AUTH_KEY) === "true"; } catch { return false; }
  })();

  // Recovery screen — localStorage was cleared but live match exists in DB
  if (!match && recoveryMatch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h1 className="text-2xl font-black mb-2">Match In Progress</h1>
        <p className="text-zinc-400 mb-2">
          A live match was found in the database but local scoring data is missing
          (browser storage may have been cleared).
        </p>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-8 text-left max-w-sm">
          <p className="text-amber-400 font-semibold text-sm">
            {recoveryMatch.batting_first} vs {recoveryMatch.fielding_first}
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            Started {new Date(recoveryMatch.created_at).toLocaleString()}
          </p>
        </div>
        <p className="text-zinc-500 text-sm mb-6">
          You cannot resume scoring from this device without the local state.
          You can abandon the match and start fresh, or dismiss this if scoring
          is continuing on another device.
        </p>
        <div className="flex gap-3">
          <button
            onClick={dismissRecovery}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 font-bold text-sm"
          >
            Dismiss
          </button>
          <button
            onClick={async () => {
              const { abandonMatchInDB } = await import("../lib/matchApi");
              await abandonMatchInDB(recoveryMatch.id);
              dismissRecovery();
            }}
            className="rounded-2xl bg-red-600 px-6 py-3 font-bold text-sm"
          >
            Abandon Match
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-2xl font-black mb-2">Scorer Access Only</h1>
        <p className="text-zinc-500 mb-8">You need admin access to score a match.</p>
        <button
          onClick={() => navigateTo("/admin")}
          className="rounded-2xl bg-green-600 px-6 py-3 font-bold active:scale-95 transition"
        >
          Go to Admin Login
        </button>
      </div>
    );
  }

  const [bowlerSheetOpen, setBowlerSheetOpen]   = useState(false);
  const [selectedBowlerId, setSelectedBowlerId] = useState(null);
  const [bowlerRequired, setBowlerRequired]     = useState(false);
  const [pendingWrites, setPendingWrites]       = useState(0);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // ── Hooks before any early return ───────────────────
  useEffect(() => {
    if (match?.overJustCompleted) {
      setMatch(prev => ({ ...prev, overJustCompleted: false }));
      setSelectedBowlerId(null);
      setBowlerSheetOpen(true);
      setBowlerRequired(true);
    }
  }, [match?.overJustCompleted]);

  useEffect(() => {
    if (match?.inningsJustEnded) {
      if (match.innings === 1) saveInnings1();
      else endMatch(match);
    }
  }, [match?.inningsJustEnded]);

  // Track pending offline writes for the sync indicator
  useEffect(() => {
    const unsubscribe = onQueueChange(setPendingWrites);
    return unsubscribe;
  }, []);

  // ── Screen routing ───────────────────────────────────
  const screen = getScreen(match, innings1, matchResult);
  if (screen === "setup")         return <MatchSetup />;
  if (screen === "innings_break") return <InningsBreak />;
  if (screen === "result")        return <MatchResult />;

  // ── Handlers ─────────────────────────────────────────
  function handleSwap() {
    setMatch(prev => ({ ...prev, striker: prev.nonStriker, nonStriker: prev.striker }));
  }

  function handleEndOver() {
    setSelectedBowlerId(null);
    setBowlerSheetOpen(true);
    setBowlerRequired(true);
  }

  function confirmNewBowler() {
    if (!selectedBowlerId) return;
    const player = match.fieldingPlayers?.find(p => p.id === selectedBowlerId);
    if (!player) return;
    setMatch(prev => ({
      ...prev,
      bowler: { id: player.id, name: player.name, overs: 0, balls: 0, runs: 0, wickets: 0 },
    }));
    setBowlerSheetOpen(false);
    setBowlerRequired(false);
  }

  async function handleAbandon() {
    if (match.matchId) {
      await abandonMatchInDB(match.matchId);
    }
    clearMatchSession();
  }

  const nextBowlers = availableBowlers(match);
  const isInnings2  = match.innings === 2;
  const ballsLeft   = (20 - match.over) * 6 - match.ball;

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-10">

      <ScoreHeader />

      {/* Sync status bar */}
      <div className="max-w-md mx-auto px-4 mt-3 flex items-center justify-between">
        {pendingWrites > 0 ? (
          <span className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            {pendingWrites} ball{pendingWrites !== 1 ? "s" : ""} syncing...
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Synced
          </span>
        )}

        <button
          onClick={() => setShowAbandonConfirm(true)}
          className="text-xs text-zinc-600 hover:text-red-400 transition"
        >
          Abandon Match
        </button>
      </div>

      {/* Innings 2 target bar */}
      {isInnings2 && match.target && (
        <div className="max-w-md mx-auto px-4 mt-3">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex justify-between items-center">
            <span className="text-amber-400 text-sm font-semibold">
              {match.battingTeam} need {Math.max(match.target - match.score, 0)} more
            </span>
            <span className="text-zinc-400 text-sm">from {ballsLeft} balls</span>
          </div>
        </div>
      )}

      {bowlerRequired && !bowlerSheetOpen && (
        <div className="max-w-md mx-auto px-4 mt-3">
          <button
            onClick={() => setBowlerSheetOpen(true)}
            className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm font-semibold text-center"
          >
            ⚠️ Select new bowler to continue
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-4 space-y-3">

        <PlayerCard icon="🏏" title="Striker"     player={match.striker}    isBatter />
        <PlayerCard icon="🏏" title="Non-Striker" player={match.nonStriker} isBatter />
        <PlayerCard icon="🎯" title="Bowler"      player={match.bowler}     isBatter={false} />

        <div className={`mt-2 transition ${bowlerRequired ? "opacity-30 pointer-events-none" : ""}`}>
          <ActionGrid />
        </div>

        <CurrentOver />
        <OverHistory />

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button onClick={handleSwap}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-bold active:scale-95 transition">
            🔄 Swap
          </button>
          <button onClick={undoLastBall} disabled={match.history.length === 0}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-bold active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
            ↩ Undo
          </button>
          <button onClick={() => openSheet("wicket")}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-bold active:scale-95 transition">
            🩹 Retired
          </button>
          <button onClick={handleEndOver}
            className="h-14 rounded-2xl bg-green-600 font-bold active:scale-95 transition">
            End Over
          </button>
        </div>

      </div>

      <BottomSheet open={sheet.open} onClose={closeSheet}>
        {renderSheet(sheet.type)}
      </BottomSheet>

      <BottomSheet
        open={bowlerSheetOpen}
        onClose={bowlerRequired ? null : () => setBowlerSheetOpen(false)}
      >
        <h2 className="text-xl font-bold mb-1">New Bowler</h2>
        <p className="text-sm text-zinc-400 mb-5">
          {bowlerRequired ? "Over complete — must select next bowler" : "Who bowls next?"}
        </p>
        {nextBowlers.length === 0
          ? <p className="text-zinc-500 text-center py-6">No eligible bowlers.</p>
          : <SelectionGrid items={nextBowlers} selected={selectedBowlerId} onSelect={setSelectedBowlerId} />
        }
        <SheetFooter text="Confirm Bowler" disabled={!selectedBowlerId} onClick={confirmNewBowler} />
      </BottomSheet>

      {/* Abandon confirmation */}
      <BottomSheet open={showAbandonConfirm} onClose={() => setShowAbandonConfirm(false)}>
        <h2 className="text-xl font-bold mb-2">Abandon Match?</h2>
        <p className="text-sm text-zinc-400 mb-6">
          This will end the match permanently. All recorded data stays saved, but the match
          will be marked as abandoned and removed from the live screen. This cannot be undone.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAbandonConfirm(false)}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleAbandon}
            className="h-14 rounded-2xl bg-red-600 font-bold"
          >
            Abandon
          </button>
        </div>
      </BottomSheet>

    </div>
  );
}

function PlayerCard({ icon, title, player, isBatter }) {
  const stats = isBatter
    ? `${player.runs} (${player.balls})`
    : `${player.overs ?? "0.0"} ov • ${player.runs}r • ${player.wickets}w`;
    if (title=="Non-Striker") {
      return (
        <div className="flex justify-between items-center rounded-md border border-white/10 bg-white/[0.03] px-4 py-4">
          <div>
            <p className="text-xs text-zinc-500">{title}</p>
            <p className="font-bold mt-1">{icon} {player.name}</p>
          </div>
          <p className="font-semibold text-sm">{stats}</p>
        </div>
      );}
      if (title=="Striker") { return (
        <div className="flex justify-between items-center rounded-md border border-green-400/40 bg-white/[0.03] px-4 py-4">
          <div>
            <p className="text-xs text-zinc-500">{title}</p>
            <p className="font-bold mt-1">{icon} {player.name}</p>
          </div>
          <p className="font-semibold text-sm">{stats}</p>
        </div>
      );}
      return (
        <div className="flex justify-between items-center rounded-md border border-blue-400/40 bg-white/[0.03] px-4 py-4">
          <div>
            <p className="text-xs text-zinc-500">{title}</p>
            <p className="font-bold mt-1">{icon} {player.name}</p>
          </div>
          <p className="font-semibold text-sm">{stats}</p>
        </div>
      );
}

function renderSheet(type) {
  switch (type) {
    case "wicket": return <WicketSheet />;
    case "wide":   return <WideSheet />;
    case "noball": return <NoBallSheet />;
    case "bye":    return <ByeSheet />;
    default:       return null;
  }
}