import { KeyValuePair, MapReduceJobConfig, MapReduceStepState, NetworkPacket } from '../types/network';

export const PRESET_MAPREDUCE_JOBS: MapReduceJobConfig[] = [
  {
    jobId: 'job_20261004_0001',
    jobName: 'TrafficVolumePerSourceIp',
    description: 'Calculates total payload bytes and packet counts for each distinct source IP address to find top network talkers.',
    mapperClass: 'org.apache.hadoop.traffic.VolumeMapper',
    reducerClass: 'org.apache.hadoop.traffic.VolumeReducer',
    combinerClass: 'org.apache.hadoop.traffic.VolumeCombiner',
    numReducers: 2,
    inputPath: '/traffic/raw/packets_stream_20261004.csv',
    outputPath: '/traffic/output/volume_per_ip',
  },
  {
    jobId: 'job_20261004_0002',
    jobName: 'ProtocolDistributionCount',
    description: 'Computes frequency counts and average payload bytes across all network protocols (TCP, UDP, ICMP, DNS, HTTP, TLS).',
    mapperClass: 'org.apache.hadoop.traffic.ProtocolMapper',
    reducerClass: 'org.apache.hadoop.traffic.ProtocolReducer',
    combinerClass: 'org.apache.hadoop.traffic.ProtocolCombiner',
    numReducers: 2,
    inputPath: '/traffic/raw/packets_stream_20261004.csv',
    outputPath: '/traffic/output/protocol_stats',
  },
  {
    jobId: 'job_20261004_0003',
    jobName: 'PortScanReconnaissanceDetector',
    description: 'MapReduce anomaly detector identifying IP addresses contacting an unusually high number of distinct destination ports.',
    mapperClass: 'org.apache.hadoop.traffic.PortScanMapper',
    reducerClass: 'org.apache.hadoop.traffic.PortScanReducer',
    numReducers: 2,
    inputPath: '/traffic/raw/packets_stream_20261004.csv',
    outputPath: '/traffic/output/port_scanners',
  },
  {
    jobId: 'job_20261004_0004',
    jobName: 'SynAckRatioFloodAnalyzer',
    description: 'Calculates the ratio of TCP SYN requests to TCP ACK responses per destination IP to flag DDoS victim hosts.',
    mapperClass: 'org.apache.hadoop.traffic.SynFloodMapper',
    reducerClass: 'org.apache.hadoop.traffic.SynFloodReducer',
    numReducers: 2,
    inputPath: '/traffic/raw/packets_stream_20261004.csv',
    outputPath: '/traffic/output/syn_flood_ratio',
  },
];

export class MapReduceSimulationEngine {
  public executeJob(job: MapReduceJobConfig, packets: NetworkPacket[]): MapReduceStepState {
    const activePackets = packets.length > 0 ? packets.slice(0, 60) : this.getSamplePackets();

    // 1. INPUT SPLITS (Split records into 3 virtual blocks)
    const splitSize = Math.ceil(activePackets.length / 3);
    const split1 = activePackets.slice(0, splitSize);
    const split2 = activePackets.slice(splitSize, splitSize * 2);
    const split3 = activePackets.slice(splitSize * 2);

    const inputSplits = [
      {
        id: 'split-0 (Block blk_1001 on DataNode-01)',
        recordCount: split1.length,
        sampleRecords: split1.slice(0, 3).map(p => `${p.timestampIso},${p.srcIp}:${p.srcPort}->${p.dstIp}:${p.dstPort},${p.protocol},${p.packetSize}B`),
      },
      {
        id: 'split-1 (Block blk_1002 on DataNode-02)',
        recordCount: split2.length,
        sampleRecords: split2.slice(0, 3).map(p => `${p.timestampIso},${p.srcIp}:${p.srcPort}->${p.dstIp}:${p.dstPort},${p.protocol},${p.packetSize}B`),
      },
      {
        id: 'split-2 (Block blk_1003 on DataNode-03)',
        recordCount: split3.length,
        sampleRecords: split3.slice(0, 3).map(p => `${p.timestampIso},${p.srcIp}:${p.srcPort}->${p.dstIp}:${p.dstPort},${p.protocol},${p.packetSize}B`),
      },
    ];

    // 2. MAP STAGE
    const mapOutputs: { mapperId: string; pairs: KeyValuePair[] }[] = [];
    const mapperSplits = [
      { id: 'Mapper-01 (dn-01)', packets: split1 },
      { id: 'Mapper-02 (dn-02)', packets: split2 },
      { id: 'Mapper-03 (dn-03)', packets: split3 },
    ];

    mapperSplits.forEach(m => {
      const pairs: KeyValuePair[] = [];
      m.packets.forEach(p => {
        if (job.jobName === 'TrafficVolumePerSourceIp') {
          // Emit (srcIp, [packetSize, 1])
          pairs.push({ key: p.srcIp, value: { bytes: p.packetSize, count: 1 } });
        } else if (job.jobName === 'ProtocolDistributionCount') {
          pairs.push({ key: p.protocol, value: { bytes: p.packetSize, count: 1 } });
        } else if (job.jobName === 'PortScanReconnaissanceDetector') {
          pairs.push({ key: p.srcIp, value: p.dstPort });
        } else {
          // SynFlood
          pairs.push({
            key: p.dstIp,
            value: { syn: p.tcpFlags.syn ? 1 : 0, ack: p.tcpFlags.ack ? 1 : 0 },
          });
        }
      });
      mapOutputs.push({ mapperId: m.id, pairs });
    });

    // 3. COMBINER STAGE (Local reduction per mapper node)
    const combineOutputs: { mapperId: string; pairs: KeyValuePair[] }[] = [];
    mapOutputs.forEach(m => {
      const combinedMap: Record<string, any> = {};
      m.pairs.forEach(pair => {
        if (job.jobName === 'TrafficVolumePerSourceIp' || job.jobName === 'ProtocolDistributionCount') {
          if (!combinedMap[pair.key]) {
            combinedMap[pair.key] = { bytes: 0, count: 0 };
          }
          combinedMap[pair.key].bytes += pair.value.bytes;
          combinedMap[pair.key].count += pair.value.count;
        } else if (job.jobName === 'PortScanReconnaissanceDetector') {
          if (!combinedMap[pair.key]) combinedMap[pair.key] = new Set<number>();
          combinedMap[pair.key].add(pair.value);
        } else {
          if (!combinedMap[pair.key]) combinedMap[pair.key] = { syn: 0, ack: 0 };
          combinedMap[pair.key].syn += pair.value.syn;
          combinedMap[pair.key].ack += pair.value.ack;
        }
      });

      const pairs: KeyValuePair[] = Object.entries(combinedMap).map(([key, val]) => ({
        key,
        value: val instanceof Set ? Array.from(val) : val,
      }));
      combineOutputs.push({ mapperId: m.mapperId, pairs });
    });

    // 4. SHUFFLE & SORT (Hash Partitioner + Secondary Sort)
    // Partition by hash(key) % numReducers
    const numReducers = job.numReducers;
    const shuffleBuckets: Record<number, Record<string, any[]>> = {};
    for (let r = 0; r < numReducers; r++) shuffleBuckets[r] = {};

    const sourceOutputs = job.combinerClass ? combineOutputs : mapOutputs;

    sourceOutputs.forEach(output => {
      output.pairs.forEach(pair => {
        // Hash Partitioner
        let hash = 0;
        for (let i = 0; i < pair.key.length; i++) hash = (hash << 5) - hash + pair.key.charCodeAt(i);
        const partitionId = Math.abs(hash) % numReducers;

        if (!shuffleBuckets[partitionId][pair.key]) {
          shuffleBuckets[partitionId][pair.key] = [];
        }
        shuffleBuckets[partitionId][pair.key].push(pair.value);
      });
    });

    const shuffleOutputs: { partitionId: number; key: string; values: any[] }[] = [];
    Object.entries(shuffleBuckets).forEach(([pIdStr, keyMap]) => {
      const partitionId = Number(pIdStr);
      // Sort keys alphabetically
      const sortedKeys = Object.keys(keyMap).sort();
      sortedKeys.forEach(k => {
        shuffleOutputs.push({
          partitionId,
          key: k,
          values: keyMap[k],
        });
      });
    });

    // 5. REDUCE STAGE
    const reduceOutputs: { reducerId: string; pairs: KeyValuePair[] }[] = [];
    for (let r = 0; r < numReducers; r++) {
      const reducerId = `Reducer-0${r + 1}`;
      const pairs: KeyValuePair[] = [];
      const partitionKeys = shuffleOutputs.filter(s => s.partitionId === r);

      partitionKeys.forEach(item => {
        if (job.jobName === 'TrafficVolumePerSourceIp' || job.jobName === 'ProtocolDistributionCount') {
          let totalBytes = 0;
          let totalPackets = 0;
          item.values.forEach(v => {
            totalBytes += v.bytes || 0;
            totalPackets += v.count || 0;
          });
          pairs.push({
            key: item.key,
            value: `${totalBytes.toLocaleString()} Bytes (${totalPackets} packets)`,
          });
        } else if (job.jobName === 'PortScanReconnaissanceDetector') {
          const allPorts = new Set<number>();
          item.values.forEach(v => {
            if (Array.isArray(v)) v.forEach(p => allPorts.add(p));
            else allPorts.add(v);
          });
          const isScanning = allPorts.size >= 10;
          pairs.push({
            key: item.key,
            value: `${allPorts.size} distinct ports probed ${isScanning ? '[FLAGGED: PORT SCAN ATTACKER]' : '[NORMAL]'}`
          });
        } else {
          // SynFlood
          let totalSyn = 0;
          let totalAck = 0;
          item.values.forEach(v => {
            totalSyn += v.syn || 0;
            totalAck += v.ack || 0;
          });
          const ratio = totalAck === 0 ? totalSyn : Number((totalSyn / totalAck).toFixed(2));
          const isAttack = totalSyn >= 10 && ratio >= 3.0;
          pairs.push({
            key: item.key,
            value: `SYN=${totalSyn}, ACK=${totalAck}, Ratio=${ratio}:1 ${isAttack ? '[FLAGGED: SYN FLOOD VICTIM]' : '[HEALTHY]'}`
          });
        }
      });
      reduceOutputs.push({ reducerId, pairs });
    }

    // 6. FINAL OUTPUT FILES IN HDFS
    const finalOutputFiles = [
      {
        path: `${job.outputPath}/part-r-00000`,
        lines: reduceOutputs[0]?.pairs.map(p => `${p.key}\t${typeof p.value === 'string' ? p.value : JSON.stringify(p.value)}`) || [],
      },
      {
        path: `${job.outputPath}/part-r-00001`,
        lines: reduceOutputs[1]?.pairs.map(p => `${p.key}\t${typeof p.value === 'string' ? p.value : JSON.stringify(p.value)}`) || [],
      },
      {
        path: `${job.outputPath}/_SUCCESS`,
        lines: [''],
      },
    ];

    return {
      step: 'OUTPUT',
      inputSplits,
      mapOutputs,
      combineOutputs,
      shuffleOutputs,
      reduceOutputs,
      finalOutputFiles,
    };
  }

  private getSamplePackets(): NetworkPacket[] {
    return [
      {
        id: 's-1',
        timestamp: Date.now() - 5000,
        timestampIso: new Date().toISOString(),
        srcIp: '192.168.1.105',
        srcPort: 54120,
        dstIp: '142.250.190.46',
        dstPort: 443,
        protocol: 'HTTPS',
        packetSize: 1280,
        tcpFlags: { syn: false, ack: true, fin: false, rst: false, psh: false, urg: false },
        ttl: 64,
        windowSize: 65535,
        payloadSummary: 'TLS payload',
        hexPreview: '00',
        flowId: '1',
      },
      {
        id: 's-2',
        timestamp: Date.now() - 4000,
        timestampIso: new Date().toISOString(),
        srcIp: '198.51.100.77',
        srcPort: 45210,
        dstIp: '192.168.1.105',
        dstPort: 80,
        protocol: 'TCP',
        packetSize: 64,
        tcpFlags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        ttl: 52,
        windowSize: 1024,
        payloadSummary: 'SYN probe',
        hexPreview: '00',
        flowId: '2',
      },
    ];
  }
}

export const globalMapReduceEngine = new MapReduceSimulationEngine();
