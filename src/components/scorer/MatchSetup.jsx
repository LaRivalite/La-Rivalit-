import { useState, useEffect } from "react";
import { useMatch, DEFAULT_ROSTERS } from "../../context/MatchContext";
import { ensurePlayerInDB, fetchPlayersByTeam, dedupeName } from "../../lib/matchApi";
import { describeInningsAllowance } from "../../engine/inningsAllowance";

const STEPS = ["competition", "rosters", "toss", "openers"];

export default function MatchSetup() {
  const { startMatch } = useMatch();

  const [step, setStep]             = useState(0);
  const [competition, setCompetition] = useState(null);

  // Core players — added by default, but CAN be removed if someone isn't playing
  const [mavPlayers, setMavPlayers]   = useState([...DEFAULT_ROSTERS.mavericks]);
  const [sparPlayers, setSparPlayers] = useState([...DEFAULT_ROSTERS.spartans]);

  // Optional players from Supabase (previously added in past matches)
  const [optionalPool, setOptionalPool] = useState({ Mavericks: [], Spartans: [] });
  const [loadingPool, setLoadingPool]   = useState(true);

  const [newName, setNewName] = useState({ mavericks: "", spartans: "" });

  const [tossWinner, setTossWinner] = useState(null);
  const [batsFirst, setBatsFirst]   = useState(null);

  const [striker, setStriker]       = useState(null);
  const [nonStriker, setNonStriker] = useState(null);
  const [bowler, setBowler]         = useState(null);

  // Load optional players from Supabase
  useEffect(() => {
    async function load() {
      const grouped = await fetchPlayersByTeam();
      // Exclude core players
      const coreIds = new Set([
        ...DEFAULT_ROSTERS.mavericks,
        ...DEFAULT_ROSTERS.spartans,
      ].map(p => p.id));

      setOptionalPool({
        Mavericks: (grouped.Mavericks || []).filter(p => !coreIds.has(p.id)),
        Spartans:  (grouped.Spartans  || []).filter(p => !coreIds.has(p.id)),
      });
      setLoadingPool(false);
    }
    load();
  }, []);

  const battingRoster  = batsFirst === "mavericks" ? mavPlayers : sparPlayers;
  const fieldingRoster = batsFirst === "mavericks" ? sparPlayers : mavPlayers;
  const battingTeam    = batsFirst === "mavericks" ? "Mavericks" : "Spartans";
  const fieldingTeam   = batsFirst === "mavericks" ? "Spartans" : "Mavericks";

  function removePlayer(team, id) {
    if (team === "mavericks") setMavPlayers(p => p.filter(x => x.id !== id));
    else setSparPlayers(p => p.filter(x => x.id !== id));

    // Return removed player to optional pool if they were a non-core optional
    const coreIds = new Set(DEFAULT_ROSTERS[team].map(p => p.id));
    if (!coreIds.has(id)) {
      const roster = team === "mavericks" ? mavPlayers : sparPlayers;
      const player = roster.find(p => p.id === id);
      if (player) {
        const teamLabel = team === "mavericks" ? "Mavericks" : "Spartans";
        setOptionalPool(prev => ({
          ...prev,
          [teamLabel]: [...prev[teamLabel], player],
        }));
      }
    }
  }

  function addFromPool(team, player) {
    if (team === "mavericks") setMavPlayers(p => [...p, player]);
    else setSparPlayers(p => [...p, player]);
    const teamLabel = team === "mavericks" ? "Mavericks" : "Spartans";
    setOptionalPool(prev => ({
      ...prev,
      [teamLabel]: prev[teamLabel].filter(p => p.id !== player.id),
    }));
  }

  async function addNewPlayer(team) {
    const rawName = newName[team].trim();
    if (!rawName) return;

    const teamLabel = team === "mavericks" ? "Mavericks" : "Spartans";
    const currentRoster = team === "mavericks" ? mavPlayers : sparPlayers;
    const existingNames = currentRoster.map(p => p.name);
    const name = dedupeName(rawName, existingNames);
    const id = `${team[0]}${Date.now()}`;

    const newPlayer = { id, name };
    if (team === "mavericks") setMavPlayers(p => [...p, newPlayer]);
    else setSparPlayers(p => [...p, newPlayer]);
    setNewName(prev => ({ ...prev, [team]: "" }));

    await ensurePlayerInDB({ id, name, team: teamLabel });
  }

  function handleStart() {
    const s  = battingRoster.find(p => p.id === striker);
    const ns = battingRoster.find(p => p.id === nonStriker);
    const b  = fieldingRoster.find(p => p.id === bowler);

    startMatch({
      competition, battingTeam, fieldingTeam,
      battingRoster, fieldingRoster,
      striker: s, nonStriker: ns, bowler: b,
      tossWinner: tossWinner === "mavericks" ? "Mavericks" : "Spartans",
      tossChoice: batsFirst === tossWinner ? "bat" : "field",
    });
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white overflow-y-auto">
      <div className="max-w-md mx-auto px-4 pt-10 pb-16">

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-green-500" : i < step ? "w-2 bg-green-700" : "w-2 bg-zinc-700"
            }`} />
          ))}
        </div>

        {/* STEP 0: Competition */}
        {step === 0 && (
          <div>
            <h1 className="text-3xl font-black mb-2">New Match</h1>
            <p className="text-zinc-400 mb-8">Which competition?</p>
            <div className="space-y-3">
              <CompCard emoji="🥈" title="Silver Ball" subtitle="L'Argente • Indoor"
                selected={competition === "silver"} onClick={() => setCompetition("silver")} />
              <CompCard emoji="🥇" title="Golden Ball" subtitle="Hard Ball • Outdoor"
                selected={competition === "gold"} onClick={() => setCompetition("gold")} />
            </div>
            <div className="mt-6">
              <NextBtn disabled={!competition} onClick={() => setStep(1)} />
            </div>
          </div>
        )}

        {/* STEP 1: Rosters */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black mb-2">Set Rosters</h1>
            <p className="text-zinc-400 mb-6">
              Default players are pre-added. Remove anyone not playing today.
            </p>

            {[
              { team: "mavericks", label: "Mavericks", players: mavPlayers, poolKey: "Mavericks" },
              { team: "spartans",  label: "Spartans",  players: sparPlayers, poolKey: "Spartans"  },
            ].map(({ team, label, players, poolKey }) => {
              const inningsDesc = describeInningsAllowance(players.length);
              const pool = optionalPool[poolKey] || [];

              return (
                <div key={team} className="mb-8">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-bold text-lg">{label}</h2>
                    <span className="text-xs text-zinc-500">{players.length} players</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">{inningsDesc}</p>

                  <div className="space-y-2">
                    {players.map(p => (
                      <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <span className="font-medium">{p.name}</span>
                        <button onClick={() => removePlayer(team, p.id)}
                          className="text-zinc-500 hover:text-red-400 text-sm font-bold px-2 py-1 transition">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Previously added optional players */}
                  {!loadingPool && pool.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-500 mb-2">Previously added</p>
                      <div className="flex flex-wrap gap-2">
                        {pool.map(p => (
                          <button key={p.id} onClick={() => addFromPool(team, p)}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm hover:bg-white/[0.08] transition">
                            + {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add brand new player */}
                  <div className="flex gap-2 mt-3">
                    <input
                      value={newName[team]}
                      onChange={e => setNewName(prev => ({ ...prev, [team]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addNewPlayer(team)}
                      placeholder="New player name..."
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-white/30"
                    />
                    <button onClick={() => addNewPlayer(team)}
                      className="rounded-xl bg-white/10 px-5 font-bold text-lg">+</button>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-3 mt-6">
              <BackBtn onClick={() => setStep(0)} />
              <NextBtn flex disabled={mavPlayers.length < 2 || sparPlayers.length < 2} onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {/* STEP 2: Toss */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-black mb-2">Toss</h1>
            <p className="text-zinc-400 mb-8">Who won, and what did they choose?</p>

            <p className="text-sm text-zinc-400 mb-3">Toss won by</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {["mavericks", "spartans"].map(t => (
                <SelBtn key={t} selected={tossWinner === t}
                  onClick={() => { setTossWinner(t); setBatsFirst(null); }}>
                  {t === "mavericks" ? "Mavericks" : "Spartans"}
                </SelBtn>
              ))}
            </div>

            <p className="text-sm text-zinc-400 mb-3">Elected to</p>
            <div className="grid grid-cols-2 gap-3">
              {["bat", "field"].map(choice => {
                const bf = choice === "bat"
                  ? tossWinner
                  : tossWinner === "mavericks" ? "spartans" : "mavericks";
                return (
                  <SelBtn key={choice}
                    selected={batsFirst !== null && batsFirst === bf}
                    disabled={!tossWinner}
                    onClick={() => setBatsFirst(bf)}>
                    {choice === "bat" ? "🏏 Bat" : "🎯 Field"}
                  </SelBtn>
                );
              })}
            </div>

            {batsFirst && (
              <p className="mt-5 text-center text-green-400 font-semibold">
                {batsFirst === "mavericks" ? "Mavericks" : "Spartans"} bat first
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <BackBtn onClick={() => setStep(1)} />
              <NextBtn flex disabled={!batsFirst} onClick={() => setStep(3)} />
            </div>
          </div>
        )}

        {/* STEP 3: Openers */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-black mb-2">Openers</h1>
            <p className="text-zinc-400 mb-6">
              <span className="text-white font-semibold">{battingTeam}</span> bat first.
            </p>

            <Section title="Striker (faces first ball)">
              <div className="grid grid-cols-2 gap-2">
                {battingRoster.map(p => (
                  <SelBtn key={p.id} selected={striker === p.id} disabled={nonStriker === p.id}
                    onClick={() => setStriker(p.id)}>{p.name}</SelBtn>
                ))}
              </div>
            </Section>

            <Section title="Non-Striker">
              <div className="grid grid-cols-2 gap-2">
                {battingRoster.map(p => (
                  <SelBtn key={p.id} selected={nonStriker === p.id} disabled={striker === p.id}
                    onClick={() => setNonStriker(p.id)}>{p.name}</SelBtn>
                ))}
              </div>
            </Section>

            <Section title={`Opening Bowler — ${fieldingTeam}`}>
              <div className="grid grid-cols-2 gap-2">
                {fieldingRoster.map(p => (
                  <SelBtn key={p.id} selected={bowler === p.id}
                    onClick={() => setBowler(p.id)}>{p.name}</SelBtn>
                ))}
              </div>
            </Section>

            <div className="flex gap-3 mt-6">
              <BackBtn onClick={() => setStep(2)} />
              <button onClick={handleStart}
                disabled={!striker || !nonStriker || !bowler}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className="flex-1 h-14 rounded-2xl bg-green-600 font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed">
                Start Match 🏏
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function CompCard({ emoji, title, subtitle, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ WebkitTapHighlightColor: "transparent" }}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        selected ? "border-green-500 bg-green-500/10" : "border-white/10 bg-white/[0.03]"
      }`}>
      <span className="text-3xl">{emoji}</span>
      <p className="mt-3 font-bold text-lg">{title}</p>
      <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>
    </button>
  );
}

function SelBtn({ children, selected, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`rounded-xl border px-4 py-3 font-semibold text-sm transition ${
        selected
          ? "border-green-500 bg-green-500/20 text-white"
          : disabled
          ? "border-white/5 bg-white/[0.02] text-zinc-600 cursor-not-allowed"
          : "border-white/10 bg-white/[0.03]"
      }`}>
      {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-sm text-zinc-400 mb-3">{title}</p>
      {children}
    </div>
  );
}

function NextBtn({ onClick, disabled, flex = false }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={`${flex ? "flex-1" : "w-full"} h-14 rounded-2xl bg-green-600 font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed`}>
      Next →
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ WebkitTapHighlightColor: "transparent" }}
      className="h-14 px-6 rounded-2xl border border-white/10 bg-white/[0.03] font-bold flex items-center justify-center">
      ←
    </button>
  );
}