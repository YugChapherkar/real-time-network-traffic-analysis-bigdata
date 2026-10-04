import React from 'react';
import { 
  Activity, 
  Database, 
  Terminal, 
  Cpu, 
  ShieldAlert, 
  BookOpen, 
  Code2, 
  Layers, 
  Play, 
  Pause, 
  Radio, 
  AlertTriangle,
  SkipForward,
  HelpCircle
} from 'lucide-react';
import { AnomalyType } from '../types/network';

export type ActiveTab = 
  | 'overview' 
  | 'packets' 
  | 'hdfs' 
  | 'mapreduce' 
  | 'hive' 
  | 'spark' 
  | 'anomalies' 
  | 'scripts';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCapturing: boolean;
  onToggleCapture: () => void;
  activeScenario: AnomalyType | 'NONE';
  onSelectScenario: (scenario: AnomalyType | 'NONE') => void;
  anomalyCount: number;
  captureSpeed: number;
  onSetCaptureSpeed: (speed: number) => void;
  onStepSinglePacket?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isCapturing,
  onToggleCapture,
  activeScenario,
  onSelectScenario,
  anomalyCount,
  captureSpeed,
  onSetCaptureSpeed,
  onStepSinglePacket,
}) => {
  const tabs = [
    { id: 'overview' as ActiveTab, label: 'NOC Telemetry', icon: Activity },
    { id: 'packets' as ActiveTab, label: 'Live Stream', icon: Radio },
    { id: 'hdfs' as ActiveTab, label: 'HDFS Storage', icon: Database },
    { id: 'mapreduce' as ActiveTab, label: 'MapReduce', icon: Layers },
    { id: 'hive' as ActiveTab, label: 'Hive Warehouse', icon: Terminal },
    { id: 'spark' as ActiveTab, label: 'Spark Streaming', icon: Cpu },
    { id: 'anomalies' as ActiveTab, label: 'Threat Alerts', icon: ShieldAlert, badge: anomalyCount },
    { id: 'scripts' as ActiveTab, label: 'Local Setup', icon: Code2 },
  ];

  return (
    <header className="border-b border-black bg-white sticky top-0 z-50">
      {/* Top Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Branding & Core Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 border border-black bg-white text-black font-bold text-sm">
            BD
          </div>
          <div>
            <span className="font-bold text-black tracking-tight text-sm uppercase">
              Real-Time Network Traffic Analysis
            </span>
          </div>
        </div>

        {/* Right: Clean White Mode Controls */}
        <div className="flex items-center gap-2.5">
          {/* Attack Scenario Injector */}
          <div className="flex items-center gap-1.5 bg-white border border-black px-2 py-1 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-black">Traffic:</span>
            <select
              value={activeScenario}
              onChange={(e) => onSelectScenario(e.target.value as AnomalyType | 'NONE')}
              className="bg-white text-xs text-black focus:outline-none cursor-pointer pr-1 font-medium"
            >
              <option value="NONE">Normal Traffic</option>
              <option value="SYN_FLOOD">SYN Flood Attack</option>
              <option value="PORT_SCAN">Port Scan Recon</option>
              <option value="DNS_TUNNELING">DNS Tunneling C2</option>
              <option value="VOLUMETRIC_DOS">Volumetric Flood</option>
            </select>
          </div>

          {/* Rate Multiplier */}
          <div className="hidden md:flex items-center bg-white border border-black p-0.5 text-xs font-mono">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetCaptureSpeed(spd)}
                className={`px-2 py-0.5 transition-colors text-[11px] cursor-pointer ${
                  captureSpeed === spd
                    ? 'bg-black text-white font-bold'
                    : 'text-black hover:bg-neutral-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Step Packet Button */}
          {onStepSinglePacket && (
            <button
              onClick={onStepSinglePacket}
              className="p-1.5 border border-black bg-white text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Step single packet frame"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Capture Toggle */}
          <button
            onClick={onToggleCapture}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border border-black ${
              isCapturing 
                ? 'bg-black text-white hover:bg-neutral-800' 
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {isCapturing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCapturing ? 'Sniffer Running' : 'Sniffer Paused'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar: Pure White with Solid Black Active Underline */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto text-xs font-medium border-t border-black bg-white">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-2.5 px-3 transition-colors relative whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-black font-bold'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-black" />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="font-mono text-[10px] text-black font-bold ml-0.5">
                  ({tab.badge})
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
