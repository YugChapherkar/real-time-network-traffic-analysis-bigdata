import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { NOCDashboard } from './components/NOCDashboard';
import { LivePacketInspector } from './components/LivePacketInspector';
import { HDFSVisualizer } from './components/HDFSVisualizer';
import { MapReduceStudio } from './components/MapReduceStudio';
import { HiveStudio } from './components/HiveStudio';
import { SparkStudio } from './components/SparkStudio';
import { AnomalyCenter } from './components/AnomalyCenter';
import { StudentLabHub } from './components/StudentLabHub';
import { globalTrafficSimulator } from './services/trafficGenerator';
import { globalAnomalyDetector } from './services/anomalyDetector';
import { globalSparkEngine } from './services/sparkEngine';
import { globalHDFSEngine } from './services/hdfsEngine';
import { NetworkPacket, AnomalyType, AnomalyAlert, TrafficMetrics, SparkMicroBatch } from './types/network';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isCapturing, setIsCapturing] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<AnomalyType | 'NONE'>('NONE');
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [metrics, setMetrics] = useState<TrafficMetrics>(() => globalTrafficSimulator.calculateMetrics());
  const [sparkBatches, setSparkBatches] = useState<SparkMicroBatch[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [captureSpeed, setCaptureSpeed] = useState<number>(1);

  // Micro-batch buffer for Spark Structured Streaming
  const microBatchBuffer = useRef<NetworkPacket[]>([]);
  const hdfsFlushCounter = useRef<number>(0);

  // Initial seeding on mount
  useEffect(() => {
    // Generate initial normal packets
    for (let i = 0; i < 40; i++) {
      const pkt = globalTrafficSimulator.generateNextPacket();
      microBatchBuffer.current.push(pkt);
    }
    const initialPackets = globalTrafficSimulator.getRecentPackets(100);
    setPackets(initialPackets);
    setMetrics(globalTrafficSimulator.calculateMetrics());

    // Generate initial Spark micro-batch
    const initBatch = globalSparkEngine.processMicroBatch(microBatchBuffer.current);
    setSparkBatches([initBatch]);
    microBatchBuffer.current = [];
  }, []);

  // Live Packet Ingestion Loop
  useEffect(() => {
    if (!isCapturing) return;

    const baseIntervalMs = activeScenario !== 'NONE' ? 300 : 600;
    const intervalMs = Math.max(100, Math.floor(baseIntervalMs / captureSpeed));
    const countPerTick = activeScenario === 'SYN_FLOOD' ? 5 : activeScenario === 'VOLUMETRIC_DOS' ? 8 : 2;

    const interval = setInterval(() => {
      const newPackets: NetworkPacket[] = [];
      for (let i = 0; i < countPerTick; i++) {
        const pkt = globalTrafficSimulator.generateNextPacket();
        newPackets.push(pkt);
        microBatchBuffer.current.push(pkt);

        // Run Anomaly Detection on incoming packet
        const alert = globalAnomalyDetector.analyzePacket(pkt);
        if (alert) {
          setAlerts(globalAnomalyDetector.getAlerts());
        }
      }

      setPackets(globalTrafficSimulator.getRecentPackets(120));
      setMetrics(globalTrafficSimulator.calculateMetrics());

      // Auto-flush batch to HDFS every ~25 ticks
      hdfsFlushCounter.current++;
      if (hdfsFlushCounter.current % 25 === 0) {
        const batchName = `packets_batch_${Date.now()}.csv`;
        const content = globalTrafficSimulator.exportAsCsv();
        globalHDFSEngine.addRawBatchFile(batchName, content, content.length);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isCapturing, activeScenario, captureSpeed]);

  const handleStepSinglePacket = () => {
    const pkt = globalTrafficSimulator.generateNextPacket();
    microBatchBuffer.current.push(pkt);
    const alert = globalAnomalyDetector.analyzePacket(pkt);
    if (alert) {
      setAlerts(globalAnomalyDetector.getAlerts());
    }
    setPackets(globalTrafficSimulator.getRecentPackets(120));
    setMetrics(globalTrafficSimulator.calculateMetrics());
  };

  // Spark Structured Streaming Micro-Batch Loop (Trigger every 2.5s)
  useEffect(() => {
    if (!isStreaming) return;

    const streamInterval = setInterval(() => {
      const buffered = [...microBatchBuffer.current];
      microBatchBuffer.current = [];

      if (buffered.length > 0) {
        globalSparkEngine.processMicroBatch(buffered);
        setSparkBatches([...globalSparkEngine.getBatches()]);
      }
    }, 2500);

    return () => clearInterval(streamInterval);
  }, [isStreaming]);

  const handleToggleCapture = () => {
    const running = globalTrafficSimulator.toggleCapture();
    setIsCapturing(running);
  };

  const handleSelectScenario = (scenario: AnomalyType | 'NONE') => {
    setActiveScenario(scenario);
    globalTrafficSimulator.setScenario(scenario);
  };

  const handleExportCsv = () => {
    const csvData = globalTrafficSimulator.exportAsCsv();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_traffic_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCapturing={isCapturing}
        onToggleCapture={handleToggleCapture}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        anomalyCount={alerts.length}
        captureSpeed={captureSpeed}
        onSetCaptureSpeed={setCaptureSpeed}
        onStepSinglePacket={handleStepSinglePacket}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <NOCDashboard
            metrics={metrics}
            recentAlerts={alerts}
            onNavigateToTab={setActiveTab}
            activeScenario={activeScenario}
          />
        )}

        {activeTab === 'packets' && (
          <LivePacketInspector
            packets={packets}
            isCapturing={isCapturing}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'hdfs' && (
          <HDFSVisualizer />
        )}

        {activeTab === 'mapreduce' && (
          <MapReduceStudio packets={packets} />
        )}

        {activeTab === 'hive' && (
          <HiveStudio packets={packets} />
        )}

        {activeTab === 'spark' && (
          <SparkStudio
            batches={sparkBatches}
            isStreaming={isStreaming}
            onToggleStreaming={() => setIsStreaming(!isStreaming)}
          />
        )}

        {activeTab === 'anomalies' && (
          <AnomalyCenter
            alerts={alerts}
            onClearAlerts={() => {
              globalAnomalyDetector.clearAlerts();
              setAlerts([]);
            }}
          />
        )}

        {activeTab === 'scripts' && (
          <StudentLabHub />
        )}
      </main>

      <footer className="border-t border-black bg-white py-3 text-center text-xs font-mono text-black">
        Real-Time Network Traffic Analysis · Hadoop HDFS, Hive, Spark & Scapy
      </footer>
    </div>
  );
}
