import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';
import { AnomalyAlert } from '../types/network';

interface AnomalyCenterProps {
  alerts: AnomalyAlert[];
  onClearAlerts: () => void;
}

export const AnomalyCenter: React.FC<AnomalyCenterProps> = ({
  alerts,
  onClearAlerts,
}) => {
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const handleCopyIptables = (rule: string, id: string) => {
    navigator.clipboard.writeText(rule);
    setCopiedRuleId(id);
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Top Banner */}
      <div className="p-4 border border-black bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-black" />
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">
              Network Threat & Anomaly Detection Center
            </h2>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">
            Algorithmic detection of SYN Floods, Port Sweeps, and DNS Tunneling with MITRE ATT&CK mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filters */}
          <div className="flex items-center border border-black p-0.5 text-xs">
            {['ALL', 'CRITICAL', 'HIGH'].map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-0.5 transition-colors text-xs font-mono cursor-pointer ${
                  filterSeverity === sev
                    ? 'bg-black text-white font-bold'
                    : 'text-black hover:bg-neutral-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={onClearAlerts}
            className="flex items-center gap-1 px-3 py-1 border border-black bg-white text-black hover:bg-black hover:text-white text-xs font-mono transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Detection Algorithms Explainer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 border border-black bg-white space-y-1.5">
          <div className="font-bold uppercase text-black flex items-center justify-between">
            <span>1. SYN Flood Detector</span>
            <span className="text-[10px] font-mono border border-black px-1">T1498.001</span>
          </div>
          <p className="text-neutral-700 text-[11px]">
            Tracks TCP SYN-to-ACK asymmetry ratio. Flags when SYN/ACK &gt; 4.0:1 with elevated half-open connection attempts.
          </p>
        </div>

        <div className="p-3.5 border border-black bg-white space-y-1.5">
          <div className="font-bold uppercase text-black flex items-center justify-between">
            <span>2. Port Scan Recon</span>
            <span className="text-[10px] font-mono border border-black px-1">T1046</span>
          </div>
          <p className="text-neutral-700 text-[11px]">
            Monitors distinct transport layer destination ports touched per source IP. Flags when &gt; 15 distinct ports probed in 8 seconds.
          </p>
        </div>

        <div className="p-3.5 border border-black bg-white space-y-1.5">
          <div className="font-bold uppercase text-black flex items-center justify-between">
            <span>3. DNS Tunneling</span>
            <span className="text-[10px] font-mono border border-black px-1">T1048.003</span>
          </div>
          <p className="text-neutral-700 text-[11px]">
            Computes Shannon Entropy on domain queries. Flags when domain length &ge; 35 chars AND Shannon entropy &ge; 3.6.
          </p>
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-600 font-mono">
          <span>Active Threat Feed ({filteredAlerts.length} incidents)</span>
          <span>Linux iptables firewall rules auto-generated</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center border border-black bg-white space-y-2">
            <ShieldCheck className="w-8 h-8 text-black mx-auto" />
            <div className="text-sm font-bold uppercase text-black">No Active Threats Detected</div>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto">
              Network traffic is clean. Use the top traffic dropdown to inject a SYN flood, port scan, or DNS tunneling attack.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className="p-4 border-2 border-black bg-white space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold border border-black bg-black text-white uppercase">
                    {alert.severity}
                  </span>
                  <span className="font-bold text-sm text-black uppercase">{alert.title}</span>
                </div>
                <div className="text-xs font-mono text-neutral-600">
                  {alert.timestampIso.split('T')[1].slice(0, 8)} UTC
                </div>
              </div>

              <div className="text-xs text-black">{alert.description}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 border border-neutral-300 bg-neutral-50 space-y-1">
                  <div>
                    <span className="text-neutral-500">Attacker Host:</span>{' '}
                    <span className="font-bold text-black">{alert.srcIp}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Target:</span>{' '}
                    <span className="font-bold text-black">{alert.dstIp}{alert.targetPort ? `:${alert.targetPort}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Observed Metric:</span>{' '}
                    <span className="font-bold text-black">{alert.metricValue}</span>
                  </div>
                </div>

                <div className="p-2.5 border border-neutral-300 bg-neutral-50 space-y-1">
                  <div>
                    <span className="text-neutral-500">MITRE Tactic:</span>{' '}
                    <span className="font-bold text-black">{alert.mitreTactic}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">MITRE Technique:</span>{' '}
                    <span className="font-bold text-black">{alert.mitreTechnique}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Trigger Threshold:</span>{' '}
                    <span className="text-neutral-700">{alert.threshold}</span>
                  </div>
                </div>
              </div>

              {/* Remediation & iptables Block Rule */}
              <div className="p-3 border border-black bg-neutral-50 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold uppercase text-black">
                    <Terminal className="w-3.5 h-3.5 text-black" />
                    <span>Recommended Linux Firewall Mitigation (iptables)</span>
                  </div>
                  <button
                    onClick={() => handleCopyIptables(alert.iptablesRule, alert.id)}
                    className="flex items-center gap-1 px-2.5 py-0.5 border border-black bg-white text-black hover:bg-black hover:text-white text-[11px] transition-colors cursor-pointer"
                  >
                    {copiedRuleId === alert.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRuleId === alert.id ? 'Copied' : 'Copy iptables'}</span>
                  </button>
                </div>
                <pre className="text-black text-[11px] bg-white p-2 border border-neutral-300 overflow-x-auto whitespace-pre-wrap font-mono">
                  {alert.iptablesRule}
                </pre>
                <div className="text-neutral-700 text-[11px] font-sans">
                  Action: {alert.recommendedAction}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
