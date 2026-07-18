export default function BackgroundEffects() {
  return (
    // fixed instead of absolute so it doesn't scroll with content
    // pointer-events-none on every child explicitly for mobile safety
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">

      {/* Top Center Glow */}
      <div className="pointer-events-none absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-500/8 blur-[180px]" />

      {/* Left Blue Glow */}
      <div className="pointer-events-none absolute top-[20%] left-[-250px] w-[500px] h-[500px] rounded-full bg-blue-500/6 blur-[160px]" />

      {/* Right Gold Glow */}
      <div className="pointer-events-none absolute top-[30%] right-[-250px] w-[500px] h-[500px] rounded-full bg-amber-400/6 blur-[160px]" />

      {/* Fine Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Vignette — reduced opacity so edges aren't too dark on mobile */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />

    </div>
  );
}