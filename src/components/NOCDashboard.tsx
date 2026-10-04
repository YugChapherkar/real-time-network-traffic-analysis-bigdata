import React, { useState } from 'react';
import { 
  Activity, 
  ArrowUpRight, 
  Database, 
  Zap, 
  ShieldAlert, 
  HardDrive, 
  TrendingUp, 
  Wifi,
  BarChart2
} from 'lucide-react';
import { TrafficMetrics, AnomalyAlert, Protocol, AnomalyType } from '../types/network';
import { ThroughputChart } from './ThroughputChart';
import { NetworkTopologyVisualizer } from './NetworkTopologyVisualizer';

interface NOCDashboardProps {
  metrics: TrafficMetrics;
  recentAlerts: AnomalyAlert[];
  onNavigateToTab: (tab: any) => void;
  activeScenario: AnomalyType | 'NONE';
}

export const NOCDashboard: React.FC<NOCDashboardProps> = ({
  metrics,
  recentAlerts,
  onNavigateToTab,
  activeScenario,
}) => {
  const [visualizerMode, setVisualizerMode] = useState<'chart' | 'topology'>('chart');

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const protocolList: Protocol[] = ['HTTPS', 'HTTP', 'TCP', 'UDP', 'DNS', 'ICMP'];
  const maxProtoCount = Math.max(...protocolList.map(p => metrics.protocolCounts[p] || 0), 1);

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Active Attack / Threat Banner if present */}
      {recentAlerts.length > 0 && (
        <div className="p-4 border-2 border-black rounded-md bg-neutral-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-black shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 border border-black rounded-md bg-white text-black mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-black text-sm uppercase tracking-wide">{recentAlerts[0].title}</span>
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 border border-black bg-black text-white rounded">
                  {recentAlerts[0].severity}
                </span>
              </div>
              <p className="text-xs text-neutral-700 mt-1">{recentAlerts[0].description}</p>
              <div className="flex items-center gap-3 text-xs font-mono text-neutral-600 mt-1">
                <span>Target: {recentAlerts[0].dstIp}:{recentAlerts[0].targetPort}</span>
                <span aria-hidden="true">·</span>
                <span>Source: {recentAlerts[0].srcIp}</span>
                <span aria-hidden="true">·</span>
                <span className="font-bold text-black">{recentAlerts[0].metricValue}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('anomalies')}
            className="px-3.5 py-1.5 border border-black rounded-md bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            View Firewall Rule
          </button>
        </div>
      )}

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Ingestion Rate */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span className="font-bold uppercase tracking-wider text-black">Ingestion Rate</span>
            <Activity className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-bold font-mono text-black">
            {metrics.currentPps.toLocaleString()}{' '}
            <span className="text-xs font-normal text-neutral-600">pkts/s</span>
          </div>
          <div className="text-[11px] text-neutral-700 mt-1 flex items-center gap-1 font-mono">
            <span>Throughput:</span>
            <span className="text-black font-bold">{formatBytes(metrics.currentBps)}/s</span>
          </div>
        </div>

        {/* Metric 2: Total Data Stored */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span className="font-bold uppercase tracking-wider text-black">HDFS Landed Volume</span>
            <HardDrive className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-bold font-mono text-black">
            {formatBytes(metrics.totalBytes)}
          </div>
          <div className="text-[11px] text-neutral-700 mt-1 flex items-center gap-1 font-mono">
            <span>Total Captured:</span>
            <span className="text-black font-bold">{metrics.totalPackets.toLocaleString()} frames</span>
          </div>
        </div>

        {/* Metric 3: TCP Flag State */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span className="font-bold uppercase tracking-wider text-black">TCP SYN vs ACK</span>
            <TrendingUp className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-bold font-mono text-black">
            {metrics.ackCount === 0 ? metrics.synCount : (metrics.synCount / metrics.ackCount).toFixed(2)}
            <span className="text-xs font-normal text-neutral-600"> : 1</span>
          </div>
          <div className="text-[11px] text-neutral-700 mt-1 flex items-center gap-2 font-mono">
            <span>SYNs: {metrics.synCount}</span>
            <span aria-hidden="true">·</span>
            <span>ACKs: {metrics.ackCount}</span>
          </div>
        </div>

        {/* Metric 4: Anomalies */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span className="font-bold uppercase tracking-wider text-black">Threat Anomalies</span>
            <ShieldAlert className="w-4 h-4 text-black" />
          </div>
          <div className="text-2xl font-bold font-mono text-black">
            {metrics.anomalyCount}
          </div>
          <div className="text-[11px] text-neutral-700 mt-1 flex items-center gap-1 font-mono">
            <span className="font-bold text-black">{recentAlerts.length} Active Incidents</span>
          </div>
        </div>
      </div>

      {/* Visualizer Card with Segmented Toggle */}
      <div className="p-4 border border-neutral-300 rounded-md bg-white space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-black">Live Telemetry Monitor</span>
            <span className="text-neutral-400 font-mono text-xs">·</span>
            <span className="text-xs text-neutral-600 font-mono">2.0s Ingestion Batch</span>
          </div>

          {/* Segmented Mode Selector */}
          <div className="flex items-center border border-neutral-300 bg-white p-0.5 rounded-md text-xs font-medium">
            <button
              onClick={() => setVisualizerMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                visualizerMode === 'chart'
                  ? 'bg-black text-white font-bold'
                  : 'text-black hover:bg-neutral-100'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Waveform (30s)</span>
            </button>
            <button
              onClick={() => setVisualizerMode('topology')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                visualizerMode === 'topology'
                  ? 'bg-black text-white font-bold'
                  : 'text-black hover:bg-neutral-100'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Topology & Vectors</span>
            </button>
          </div>
        </div>

        {visualizerMode === 'chart' ? (
          <ThroughputChart
            currentPps={metrics.currentPps}
            currentBps={metrics.currentBps}
            hasAnomaly={recentAlerts.length > 0}
          />
        ) : (
          <NetworkTopologyVisualizer
            activeScenario={activeScenario}
            currentPps={metrics.currentPps}
          />
        )}
      </div>

      {/* Dual-Path Architecture Comparison */}
      <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-200 pb-2.5">
          <div>
            <h2 className="text-xs font-bold text-black uppercase tracking-wider">
              BDA Dual-Path Big Data Architecture Pipeline
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5 font-sans">
              Near-Real-Time Stream Processing (Spark) vs. Distributed Batch Warehouse (Hadoop HDFS)
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-black border border-neutral-300 bg-neutral-100 px-2 py-0.5 rounded">
            Micro-Batch: 2.0s
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Path A: Real-Time Stream */}
          <div className="p-3.5 border border-neutral-300 rounded-md bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="text-xs font-bold text-black uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-black" />
                PATH A: Near-Real-Time Stream (Speed Layer)
              </span>
              <span className="text-[10px] font-mono text-neutral-600">Sub-second Latency</span>
            </div>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">1. Ingestion:</span>
                  <span className="text-neutral-800">TShark / Scapy Packet Sniffer</span>
                </div>
                <span className="text-[10px] text-neutral-500">Socket Stream</span>
              </div>

              <div className="text-center text-neutral-500 text-[10px]">↓ 2s Micro-Batches</div>

              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">2. Engine:</span>
                  <span className="text-neutral-800">Spark Structured Streaming</span>
                </div>
                <span className="text-[10px] font-bold text-black">Watermark: 5s</span>
              </div>

              <div className="text-center text-neutral-500 text-[10px]">↓ Sliding Windows</div>

              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">3. Analytics:</span>
                  <span className="text-neutral-800">SYN Flood & Port Scan Detection</span>
                </div>
                <span className="text-[10px] font-bold text-black">Stateful Rule</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => onNavigateToTab('spark')}
                className="text-xs font-bold text-black underline hover:no-underline flex items-center gap-1 cursor-pointer"
              >
                Inspect Spark Streaming <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Path B: Batch / Historical */}
          <div className="p-3.5 border border-neutral-300 rounded-md bg-neutral-50 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="text-xs font-bold text-black uppercase tracking-wide flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-black" />
                PATH B: Distributed Batch & Warehouse (Batch Layer)
              </span>
              <span className="text-[10px] font-mono text-neutral-600">High Throughput</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">1. Storage:</span>
                  <span className="text-neutral-800">Hadoop HDFS (128MB Blocks)</span>
                </div>
                <span className="text-[10px] text-neutral-500">Replica x3</span>
              </div>

              <div className="text-center text-neutral-500 text-[10px]">↓ Shuffle-Sort Partitioning</div>

              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">2. Compute:</span>
                  <span className="text-neutral-800">MapReduce & Apache Hive</span>
                </div>
                <span className="text-[10px] font-bold text-black">YARN Tasks</span>
              </div>

              <div className="text-center text-neutral-500 text-[10px]">↓ Columnar Parquet Queries</div>

              <div className="p-2 border border-neutral-200 bg-white rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">3. Insights:</span>
                  <span className="text-neutral-800">Top Talkers & Forensic Audit</span>
                </div>
                <span className="text-[10px] font-bold text-black">Schema-on-Read</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-between">
              <button
                onClick={() => onNavigateToTab('mapreduce')}
                className="text-xs font-bold text-black underline hover:no-underline flex items-center gap-1 cursor-pointer"
              >
                MapReduce Studio <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateToTab('hive')}
                className="text-xs font-bold text-black underline hover:no-underline flex items-center gap-1 cursor-pointer"
              >
                Hive Studio <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Protocol Share & Top Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Protocol Distribution */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Protocol Distribution
            </span>
            <span className="text-xs font-mono text-neutral-600">
              Total: {metrics.totalPackets} frames
            </span>
          </div>

          <div className="space-y-2.5">
            {protocolList.map(proto => {
              const count = metrics.protocolCounts[proto] || 0;
              const percent = metrics.totalPackets > 0 
                ? ((count / metrics.totalPackets) * 100).toFixed(1) 
                : '0.0';
              const barWidth = Math.round((count / maxProtoCount) * 100);

              return (
                <div key={proto} className="text-xs">
                  <div className="flex justify-between font-mono mb-1 text-black text-[11px]">
                    <span className="font-bold">{proto}</span>
                    <span className="text-neutral-700">{count.toLocaleString()} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-neutral-100 border border-neutral-300 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Bandwidth Consumers (Source IP Analysis) */}
        <div className="p-4 border border-neutral-300 rounded-md bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-black">
              Top Bandwidth Endpoints (Source IPs)
            </span>
            <button
              onClick={() => onNavigateToTab('hive')}
              className="text-xs font-mono font-bold text-black underline hover:no-underline flex items-center gap-1 cursor-pointer"
            >
              Run Hive Query <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-neutral-300 text-neutral-700 pb-1 text-[11px]">
                  <th className="pb-1.5 font-bold uppercase">Source IP</th>
                  <th className="pb-1.5 font-bold uppercase">Packets</th>
                  <th className="pb-1.5 font-bold uppercase">Bytes</th>
                  <th className="pb-1.5 font-bold uppercase text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {metrics.topSources.map((item, idx) => {
                  const isAttacker = item.ip === '198.51.100.77';
                  const isHost = item.ip === '192.168.1.105';
                  return (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-2 text-black flex items-center gap-1.5">
                        <span className="text-neutral-500">{idx + 1}.</span>
                        <span className="font-bold">{item.ip}</span>
                      </td>
                      <td className="py-2 text-black">{item.packets.toLocaleString()}</td>
                      <td className="py-2 text-black">{formatBytes(item.bytes)}</td>
                      <td className="py-2 text-right text-[11px]">
                        {isAttacker ? (
                          <span className="font-bold border border-black px-1.5 py-0.5 rounded bg-black text-white">ATTACKER</span>
                        ) : isHost ? (
                          <span className="font-bold border border-neutral-400 px-1.5 py-0.5 rounded bg-white text-black">HOST PC</span>
                        ) : (
                          <span className="text-neutral-600">REMOTE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
