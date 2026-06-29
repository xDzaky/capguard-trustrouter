export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-lime rounded-full flex items-center justify-center font-bold text-brand-dark text-sm">
            C
          </div>
          <span className="font-bold text-xl text-brand-dark">CROO</span>
          <span className="text-gray-300 mx-1">/</span>
          <span className="text-gray-400 text-sm font-medium">CAPGUARD</span>
          <div className="ml-3 flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-brand-lime status-dot-glow"></span>
            TrustRouter
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a className="text-gray-500 hover:text-brand-dark transition-colors" href="/">
            Dashboard
          </a>
          <a
            className="text-gray-500 hover:text-brand-dark transition-colors flex items-center gap-1"
            href="/evidence"
          >
            Evidence
            <span className="text-[9px] font-bold bg-brand-lime text-brand-dark px-1.5 py-0.5 rounded-full uppercase">
              Judges
            </span>
          </a>
          <a
            className="text-gray-500 hover:text-brand-dark transition-colors"
            href="https://agent.croo.network"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agent Store
          </a>
        </nav>

      </div>

      <div className="flex items-center gap-4">
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-status-green bg-status-green-bg px-3 py-1.5 rounded-full uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-status-green rounded-full"></span>
          Live
        </div>

        {/* GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors border border-gray-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A0A0A">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
      </div>
    </header>
  );
}
