import React from 'react';
import { Server, Laptop, Globe, ShieldAlert, Wifi } from 'lucide-react';
import { AnomalyType } from '../types/network';

interface NetworkTopologyVisualizerProps {
  activeScenario: AnomalyType | 'NONE';
  currentPps: number;
}

export const NetworkTopologyVisualizer: React.FC<NetworkTopologyVisualizerProps> = ({
  activeScenario,
  currentPps,
}) => {
  const isAttack = activeScenario !== 'NONE';

  return (
    <div className="space-y-3 bg-white text-black">
      {/* SVG Network Graph Canvas */}
      <div className="relative w-full h-44 bg-white border border-black overflow-hidden flex items-center justify-between px-6 md:px-12">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px]"></div>

        {/* SVG Flow lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Attacker to Host line (if attack) */}
          {isAttack && (
            <path
              d="M 120 36 Q 220 70 330 88"
              fill="none"
              stroke="#000000"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Host to Gateway line */}
          <line
            x1="22%"
            y1="50%"
            x2="50%"
            y2="50%"
            stroke="#000000"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Gateway to Internet line */}
          <line
            x1="50%"
            y1="50%"
            x2="78%"
            y2="50%"
            stroke="#000000"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>

        {/* Node 1: Attacker (Top left if attack) */}
        {isAttack ? (
          <div className="absolute top-2 left-6 z-10 px-2.5 py-1.5 border-2 border-black bg-white text-black text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-black" />
            <div>
              <div className="font-bold text-[11px]">198.51.100.77</div>
              <div className="text-[9px] uppercase font-bold text-black">Attacker Node</div>
            </div>
          </div>
        ) : (
          <div className="absolute top-2 left-6 z-10 text-[10px] font-mono text-neutral-500">
            [Attacker Idle]
          </div>
        )}

        {/* Node 2: Student Host Computer */}
        <div className="relative z-10 px-3 py-2.5 bg-white border border-black text-black font-mono text-xs">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-black" />
            <div>
              <div className="font-bold text-black">192.168.1.105</div>
              <div className="text-[10px] text-neutral-600 font-sans">Host Computer</div>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-neutral-300 text-[10px] text-black flex items-center justify-between">
            <span>eth0</span>
            <span className="font-bold">{currentPps} pps</span>
          </div>
        </div>

        {/* Node 3: Local Gateway Router */}
        <div className="relative z-10 px-3 py-2.5 bg-white border border-black text-black font-mono text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-black" />
            <div>
              <div className="font-bold text-black">192.168.1.1</div>
              <div className="text-[10px] text-neutral-600 font-sans">Gateway Router</div>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-neutral-300 text-[10px] text-black flex items-center justify-between">
            <span>NAT</span>
            <span>0.8ms</span>
          </div>
        </div>

        {/* Node 4: External Web / Cloud Services */}
        <div className="relative z-10 px-3 py-2.5 bg-white border border-black text-black font-mono text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-black" />
            <div>
              <div className="font-bold text-black">WAN / Internet</div>
              <div className="text-[10px] text-neutral-600 font-sans">8.8.8.8 · 142.250.x.x</div>
            </div>
          </div>
          <div className="mt-1.5 pt-1 border-t border-neutral-300 text-[10px] text-black flex items-center justify-between">
            <span>HTTPS / DNS</span>
            <span>12ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
