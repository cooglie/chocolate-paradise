import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Upgrade = {
  id: string;
  name: (tier: number) => string;
  emoji: string;
  baseCost: number;
  costGrowth: number;
  baseCps: number;
  cpsGrowth: number;
};

const UPGRADES: Upgrade[] = [
  { id: "finger", name: (t) => `Zuckerfinger Mk ${t}`, emoji: "👆", baseCost: 15, costGrowth: 1.15, baseCps: 0.1, cpsGrowth: 1.6 },
  { id: "cursor", name: (t) => `Auto-Löffel Mk ${t}`, emoji: "🥄", baseCost: 100, costGrowth: 1.15, baseCps: 1, cpsGrowth: 1.6 },
  { id: "oma", name: (t) => `Schoko-Oma Mk ${t}`, emoji: "👵", baseCost: 1_100, costGrowth: 1.15, baseCps: 8, cpsGrowth: 1.6 },
  { id: "farm", name: (t) => `Kakaofarm Mk ${t}`, emoji: "🌱", baseCost: 12_000, costGrowth: 1.15, baseCps: 47, cpsGrowth: 1.6 },
  { id: "mine", name: (t) => `Kakaomine Mk ${t}`, emoji: "⛏️", baseCost: 130_000, costGrowth: 1.15, baseCps: 260, cpsGrowth: 1.6 },
  { id: "factory", name: (t) => `Schokofabrik Mk ${t}`, emoji: "🏭", baseCost: 1_400_000, costGrowth: 1.15, baseCps: 1_400, cpsGrowth: 1.6 },
  { id: "bank", name: (t) => `Schokobank Mk ${t}`, emoji: "🏦", baseCost: 20_000_000, costGrowth: 1.15, baseCps: 7_800, cpsGrowth: 1.6 },
  { id: "temple", name: (t) => `Kakao-Tempel Mk ${t}`, emoji: "🛕", baseCost: 330_000_000, costGrowth: 1.15, baseCps: 44_000, cpsGrowth: 1.6 },
  { id: "wizard", name: (t) => `Schoko-Magier Mk ${t}`, emoji: "🧙", baseCost: 5_100_000_000, costGrowth: 1.15, baseCps: 260_000, cpsGrowth: 1.6 },
  { id: "ship", name: (t) => `Kakao-Raumschiff Mk ${t}`, emoji: "🚀", baseCost: 75_000_000_000, costGrowth: 1.15, baseCps: 1_600_000, cpsGrowth: 1.6 },
  { id: "time", name: (t) => `Zeitmaschine Mk ${t}`, emoji: "⏳", baseCost: 1_000_000_000_000, costGrowth: 1.15, baseCps: 10_000_000, cpsGrowth: 1.6 },
  { id: "portal", name: (t) => `Dimensionsportal Mk ${t}`, emoji: "🌀", baseCost: 14_000_000_000_000, costGrowth: 1.15, baseCps: 65_000_000, cpsGrowth: 1.6 },
];

function costFor(u: Upgrade, owned: number) {
  const tier = Math.floor(owned / 25);
  const tierMult = Math.pow(u.cpsGrowth, tier);
  return Math.ceil(u.baseCost * tierMult * Math.pow(u.costGrowth, owned));
}
function cpsFor(u: Upgrade, owned: number) {
  let total = 0;
  for (let i = 0; i < owned; i++) {
    const tier = Math.floor(i / 25);
    total += u.baseCps * Math.pow(u.cpsGrowth, tier);
  }
  return total;
}

function fmt(n: number) {
  if (!isFinite(n)) return "∞";
  if (n < 1000) return n.toFixed(n < 10 ? 1 : 0);
  const units = ["k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  let i = -1;
  let v = n;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return v.toFixed(2) + units[i];
}

type Pop = { id: number; x: number; y: number; v: number };

function Index() {
  const [choc, setChoc] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [clickPower, setClickPower] = useState(1);
  const [clickLevel, setClickLevel] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [pulse, setPulse] = useState(false);
  const [autoBuy, setAutoBuy] = useState(false);
  const popId = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chocsave");
      if (raw) {
        const s = JSON.parse(raw);
        setChoc(s.choc ?? 0);
        setOwned(s.owned ?? {});
        setClickPower(s.clickPower ?? 1);
        setClickLevel(s.clickLevel ?? 0);
        setTotalClicks(s.totalClicks ?? 0);
        setAutoBuy(s.autoBuy ?? false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      localStorage.setItem(
        "chocsave",
        JSON.stringify({ choc, owned, clickPower, clickLevel, totalClicks, autoBuy }),
      );
    }, 3000);
    return () => clearInterval(id);
  }, [choc, owned, clickPower, clickLevel, totalClicks, autoBuy]);

  // Auto-buy: repeatedly buys the cheapest affordable upgrade
  const chocRef = useRef(choc);
  const ownedRef = useRef(owned);
  chocRef.current = choc;
  ownedRef.current = owned;
  useEffect(() => {
    if (!autoBuy) return;
    const id = setInterval(() => {
      const prevOwned = ownedRef.current;
      let bestId: string | null = null;
      let bestCost = Infinity;
      for (const u of UPGRADES) {
        const c = costFor(u, prevOwned[u.id] ?? 0);
        if (c < bestCost) {
          bestCost = c;
          bestId = u.id;
        }
      }
      if (!bestId || chocRef.current < bestCost) return;
      const next = { ...prevOwned, [bestId]: (prevOwned[bestId] ?? 0) + 1 };
      chocRef.current -= bestCost;
      ownedRef.current = next;
      setChoc((c) => c - bestCost);
      setOwned(next);
    }, 300);
    return () => clearInterval(id);
  }, [autoBuy]);

  const cps = useMemo(() => {
    let sum = 0;
    for (const u of UPGRADES) sum += cpsFor(u, owned[u.id] ?? 0);
    return sum;
  }, [owned]);

  useEffect(() => {
    if (cps <= 0) return;
    const id = setInterval(() => setChoc((c) => c + cps / 10), 100);
    return () => clearInterval(id);
  }, [cps]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    setChoc((c) => c + clickPower);
    setTotalClicks((t) => t + 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 120);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++popId.current;
    setPops((p) => [...p, { id, x, y, v: clickPower }]);
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== id)), 900);
  }

  function buy(u: Upgrade) {
    const o = owned[u.id] ?? 0;
    const c = costFor(u, o);
    if (choc < c) return;
    setChoc((v) => v - c);
    setOwned((prev) => ({ ...prev, [u.id]: o + 1 }));
  }

  const clickCost = Math.ceil(50 * Math.pow(2.2, clickLevel));
  function buyClick() {
    if (choc < clickCost) return;
    setChoc((c) => c - clickCost);
    setClickPower((p) => p + Math.max(1, Math.floor(p * 0.5)));
    setClickLevel((l) => l + 1);
  }

  function reset() {
    if (!confirm("Alles zurücksetzen?")) return;
    localStorage.removeItem("chocsave");
    setChoc(0);
    setOwned({});
    setClickPower(1);
    setClickLevel(0);
    setTotalClicks(0);
    setAutoBuy(false);
  }

  return (
    <main
      className="min-h-screen text-foreground"
      style={{
        background:
          "radial-gradient(1200px 600px at 20% -10%, oklch(0.35 0.09 45) 0%, transparent 60%), radial-gradient(900px 500px at 100% 10%, oklch(0.3 0.08 30) 0%, transparent 55%), linear-gradient(180deg, oklch(0.22 0.05 40) 0%, oklch(0.16 0.04 35) 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl md:text-5xl font-black tracking-tight"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              🍫 Schokoladen Clicker
            </h1>
            <p className="text-sm md:text-base opacity-70 mt-1">
              Klicke, sammle, upgrade – unendlich.
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs opacity-60 hover:opacity-100 underline underline-offset-4"
          >
            Zurücksetzen
          </button>
        </header>

        <section className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
          <div
            className="rounded-3xl p-6 md:p-8 backdrop-blur-sm border"
            style={{
              background: "oklch(0.28 0.06 40 / 0.5)",
              borderColor: "oklch(0.5 0.1 45 / 0.35)",
            }}
          >
            <div className="text-center">
              <div className="text-sm uppercase tracking-widest opacity-70">
                Schokolade
              </div>
              <div
                className="text-5xl md:text-6xl font-black mt-1"
                style={{ color: "oklch(0.9 0.1 70)" }}
              >
                {fmt(choc)}
              </div>
              <div className="text-sm opacity-70 mt-1">
                {fmt(cps)} / Sek · +{fmt(clickPower)} pro Klick
              </div>
            </div>

            <div className="relative mt-6 flex justify-center select-none">
              <button
                onClick={handleClick}
                className="relative outline-none"
                style={{
                  transition: "transform 80ms ease",
                  transform: pulse ? "scale(0.94)" : "scale(1)",
                }}
                aria-label="Schokolade klicken"
              >
                <div
                  className="w-56 h-56 md:w-72 md:h-72 rounded-3xl grid place-items-center text-[7rem] md:text-[9rem]"
                  style={{
                    background:
                      "linear-gradient(145deg, oklch(0.42 0.11 45), oklch(0.28 0.08 35))",
                    boxShadow:
                      "inset 0 -14px 30px oklch(0.15 0.05 30 / 0.7), inset 0 14px 30px oklch(0.6 0.12 55 / 0.35), 0 20px 60px oklch(0 0 0 / 0.5)",
                    border: "2px solid oklch(0.55 0.1 45 / 0.5)",
                  }}
                >
                  🍫
                </div>
                {pops.map((p) => (
                  <span
                    key={p.id}
                    className="pointer-events-none absolute font-bold text-xl"
                    style={{
                      left: p.x,
                      top: p.y,
                      color: "oklch(0.95 0.12 75)",
                      textShadow: "0 2px 6px rgba(0,0,0,.6)",
                      animation: "chocPop 900ms ease-out forwards",
                    }}
                  >
                    +{fmt(p.v)}
                  </span>
                ))}
              </button>
            </div>

            <div
              className="mt-6 rounded-2xl p-4 border flex items-center justify-between gap-3"
              style={{
                background: "oklch(0.2 0.04 35 / 0.6)",
                borderColor: "oklch(0.5 0.1 45 / 0.3)",
              }}
            >
              <div>
                <div className="font-semibold">💪 Klick-Kraft verstärken</div>
                <div className="text-xs opacity-70">
                  Stufe {clickLevel} · aktuell +{fmt(clickPower)}
                </div>
              </div>
              <button
                onClick={buyClick}
                disabled={choc < clickCost}
                className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(180deg, oklch(0.75 0.15 70), oklch(0.55 0.14 55))",
                  color: "oklch(0.15 0.05 30)",
                  boxShadow: "0 6px 16px oklch(0 0 0 / 0.4)",
                }}
              >
                {fmt(clickCost)} 🍫
              </button>
            </div>

            <div className="mt-4 text-xs opacity-60 text-center">
              Klicks insgesamt: {totalClicks.toLocaleString("de-DE")}
            </div>
          </div>

          <div
            className="rounded-3xl p-4 md:p-6 border"
            style={{
              background: "oklch(0.24 0.05 38 / 0.5)",
              borderColor: "oklch(0.5 0.1 45 / 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-3 px-1 gap-2">
              <h2 className="text-xl font-bold">Shop</h2>
              <button
                onClick={() => setAutoBuy((v) => !v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={{
                  background: autoBuy
                    ? "linear-gradient(180deg, oklch(0.75 0.15 70), oklch(0.55 0.14 55))"
                    : "oklch(0.2 0.04 35 / 0.6)",
                  color: autoBuy ? "oklch(0.15 0.05 30)" : "oklch(0.9 0.05 60)",
                  borderColor: autoBuy
                    ? "oklch(0.7 0.14 70 / 0.6)"
                    : "oklch(0.5 0.1 45 / 0.4)",
                }}
                aria-pressed={autoBuy}
              >
                🤖 Auto-Kauf: {autoBuy ? "AN" : "AUS"}
              </button>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {UPGRADES.map((u) => {
                const o = owned[u.id] ?? 0;
                const cost = costFor(u, o);
                const tier = Math.floor(o / 25) + 1;
                const each = u.baseCps * Math.pow(u.cpsGrowth, Math.floor(o / 25));
                const affordable = choc >= cost;
                const unlocked = choc >= cost / 3 || o > 0;
                return (
                  <button
                    key={u.id}
                    onClick={() => buy(u)}
                    disabled={!affordable}
                    className="w-full text-left rounded-2xl p-3 flex items-center gap-3 border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-0.5"
                    style={{
                      background: affordable
                        ? "linear-gradient(180deg, oklch(0.32 0.08 45 / 0.9), oklch(0.24 0.06 35 / 0.9))"
                        : "oklch(0.22 0.04 35 / 0.7)",
                      borderColor: affordable
                        ? "oklch(0.7 0.14 70 / 0.5)"
                        : "oklch(0.4 0.05 40 / 0.4)",
                    }}
                  >
                    <div className="text-3xl w-12 text-center">
                      {unlocked ? u.emoji : "❓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {unlocked ? u.name(tier) : "???"}
                      </div>
                      <div className="text-xs opacity-70">
                        {fmt(each)} 🍫/s · Besitz: {o}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="font-bold"
                        style={{ color: "oklch(0.9 0.12 75)" }}
                      >
                        {fmt(cost)}
                      </div>
                      <div className="text-[10px] opacity-60">🍫</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] opacity-60 mt-3 px-1">
              Alle 25 Käufe: neuer Mk-Level mit stärkerer Produktion. Preise
              wachsen exponentiell – unendlich viele Upgrades möglich.
            </p>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes chocPop {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -80px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </main>
  );
}