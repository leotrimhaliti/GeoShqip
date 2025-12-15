import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">

      {/* --- BACKGROUND LAYERS --- */}

      {/* 1. Animated Grid Floor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        {/* Radial fade to make the grid look like it's fading into darkness at edges */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_85%)]" />
      </div>

      {/* 2. Ambient Colorful Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[128px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[128px] pointer-events-none" />

      {/* --- HUD OVERLAYS --- */}
      {/* Top Left */}
      <div className="absolute top-6 left-6 z-40 hidden md:flex flex-col gap-1 opacity-60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">System Online</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">VER 2.0.4-BETA</span>
      </div>

      {/* Top Right */}
      <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        <span>Region: BALKANS</span>
        <span className="w-px h-3 bg-zinc-800" />
        <span>Server: EU-CENTRAL</span>
      </div>

      {/* Corner Brackets (Decor) */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-zinc-800/50 rounded-tl-3xl pointer-events-none m-4" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-zinc-800/50 rounded-tr-3xl pointer-events-none m-4" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-zinc-800/50 rounded-bl-3xl pointer-events-none m-4" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-zinc-800/50 rounded-br-3xl pointer-events-none m-4" />


      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 w-full max-w-7xl mx-auto">

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-6">

          {/* Badge / Status */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/10 border border-emerald-500/20 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <span className="text-xs font-bold tracking-[0.2em] text-emerald-400 uppercase">
              Season 1 Live
            </span>
          </div>

          {/* Main Title / Logo */}
          <div className="relative mb-2">
            <Image
              src="/logo.png"
              alt="GeoShqip Logo"
              width={600}
              height={250}
              className="w-full max-w-[280px] md:max-w-md h-auto select-none drop-shadow-2xl"
              priority
            />
            {/* Glow effect specific to logo */}
            <div className="absolute inset-0 z-[-1] blur-3xl opacity-30 bg-emerald-500/20 rounded-full scale-110" />
          </div>

          <p className="max-w-md text-zinc-400 font-medium text-lg uppercase tracking-wide">
            The ultimate geography challenge for <span className="text-zinc-100 font-bold">Kosovo</span> & <span className="text-zinc-100 font-bold">Albania</span>.
          </p>

          <div className="grid grid-cols-3 gap-px bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-800/50 mt-2">
            <div className="bg-zinc-900/80 px-4 py-2 flex flex-col items-center p-3">
              <span className="text-xl font-bold text-white">5</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Rounds</span>
            </div>
            <div className="bg-zinc-900/80 px-4 py-2 flex flex-col items-center p-3">
              <span className="text-xl font-bold text-white">25k</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Max Score</span>
            </div>
            <div className="bg-zinc-900/80 px-4 py-2 flex flex-col items-center p-3">
              <span className="text-xl font-bold text-emerald-400">∞</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Free</span>
            </div>
          </div>
        </div>

        {/* Action Menu (Game Cards) */}
        <div className="mt-10 flex flex-col md:flex-row gap-6 w-full max-w-2xl">

          {/* Card 1: Play */}
          <Link href="/play" className="group relative flex-1">
            <div className="absolute inset-0 bg-emerald-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative h-full bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-zinc-900/80">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-500">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black italic uppercase tracking-wider text-white">Start Game</h3>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Deploy to random location</p>
              </div>
            </div>
          </Link>

          {/* Card 2: History */}
          <Link href="/results" className="group relative flex-1">
            <div className="absolute inset-0 bg-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="relative h-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-zinc-900/80">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-indigo-500">
                  <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9zM15.75 12a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" clipRule="evenodd" />
                  <path d="M12 1.5a.75.75 0 01.75.75V3h-.25a9 9 0 00-9 9v.25H2.25a.75.75 0 010-1.5H3.5V10.5a7.5 7.5 0 017.5-7.5z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black italic uppercase tracking-wider text-white">Mission Log</h3>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">View past operations</p>
              </div>
            </div>
          </Link>

        </div>

      </main>
    </div>
  );
}
