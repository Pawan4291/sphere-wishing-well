'use client';

interface HeaderProps {
  nametag?: string;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  totalWishes: number;
  totalVotes: number;
}

export default function Header({
  nametag, isConnected, isConnecting, onConnect, onDisconnect, totalWishes, totalVotes
}: HeaderProps) {
  return (
    <header className="
sticky top-0 z-50
border-b border-white/5
bg-black/30
backdrop-blur-2xl
">
      <div className="
max-w-7xl mx-auto
px-6 py-4
flex items-center justify-between
gap-6
">
        {/* Logo */}
        <div className="flex items-center gap-3">
         <div className="
w-12 h-12
rounded-2xl
bg-gradient-to-br
from-amber-400
to-orange-600
flex items-center justify-center
shadow-lg shadow-orange-500/20
text-black text-xl font-black
">
✦
</div>
          <div>
           <h1 className="
text-white
font-black
text-2xl
leading-none
tracking-tight
">Wishing Well</h1>
            <p className="
text-sm
text-slate-400
leading-none
mt-1
">on Unicity Sphere</p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
          <span><span className="text-amber-400 font-bold">{totalWishes}</span> wishes</span>
          <span><span className="text-amber-400 font-bold">{totalVotes}</span> votes</span>
        </div>

        {/* Wallet */}
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">
                @{nametag || 'connected'}
              </span>
            </div>
            <button
              onClick={onDisconnect}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="px-4 py-2 rounded-full text-sm font-bold bg-amber-500 text-black
              hover:bg-amber-400 disabled:opacity-50 transition-all duration-200
              shadow-lg shadow-amber-500/20"
          >
            {isConnecting ? '⏳ Connecting...' : '🔗 Connect Wallet'}
          </button>
        )}
      </div>
    </header>
  );
}
