export type Protocol = 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP' | 'HTTPS' | 'TLS';

export interface NetworkPacket {
  id: string;
  timestamp: number; // Unix timestamp ms
  timestampIso: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: Protocol;
  packetSize: number; // in bytes
  tcpFlags: {
    syn: boolean;
    ack: boolean;
    fin: boolean;
    rst: boolean;
    psh: boolean;
    urg: boolean;
  };
  ttl: number;
  windowSize: number;
  dnsQuery?: string;
  dnsEntropy?: number;
  payloadSummary: string;
  hexPreview: string;
  flowId: string;
  isAnomaly?: boolean;
  anomalyType?: AnomalyType;
}

export type AnomalyType = 
  | 'SYN_FLOOD'
  | 'PORT_SCAN'
  | 'DNS_TUNNELING'
  | 'VOLUMETRIC_DOS'
  | 'DATA_EXFILTRATION'
  | 'SLOWLORIS';

export interface AnomalyAlert {
  id: string;
  timestamp: number;
  timestampIso: string;
  type: AnomalyType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  srcIp: string;
  dstIp: string;
  targetPort?: number;
  title: string;
  description: string;
  metricValue: string;
  threshold: string;
  mitreTactic: string;
  mitreTechnique: string;
  recommendedAction: string;
  iptablesRule: string;
}

export interface TrafficMetrics {
  totalPackets: number;
  totalBytes: number;
  currentPps: number;
  currentBps: number;
  synCount: number;
  ackCount: number;
  anomalyCount: number;
  protocolCounts: Record<Protocol, number>;
  topSources: { ip: string; bytes: number; packets: number }[];
  topDestinations: { ip: string; bytes: number; packets: number }[];
}

// HDFS Models
export interface HDFSBlock {
  blockId: string;
  sizeBytes: number;
  replicaNodes: string[]; // DataNode IDs
  blockChecksum: string;
}

export interface HDFSFile {
  path: string;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
  replicationFactor: number;
  blockSizeBytes: number; // Default 128 MB (134217728)
  owner: string;
  group: string;
  permissions: string;
  modificationTime: string;
  blocks: HDFSBlock[];
  previewContent?: string;
}

export interface DataNodeInfo {
  id: string;
  name: string;
  rack: string;
  ip: string;
  status: 'HEALTHY' | 'WARNING' | 'DEAD';
  totalCapacityBytes: number;
  usedCapacityBytes: number;
  blockCount: number;
  lastHeartbeatSec: number;
}

export interface NameNodeStatus {
  status: 'ACTIVE' | 'STANDBY';
  safeMode: boolean;
  fsimageVersion: string;
  editsLogTransactionId: number;
  heapMemoryUsedMb: number;
  heapMemoryMaxMb: number;
  totalBlocks: number;
  totalFiles: number;
  missingBlocks: number;
  underReplicatedBlocks: number;
}

// MapReduce Models
export interface KeyValuePair<K = string, V = any> {
  key: K;
  value: V;
}

export interface MapReduceStepState {
  step: 'INPUT_SPLIT' | 'MAP' | 'COMBINE' | 'SHUFFLE_SORT' | 'REDUCE' | 'OUTPUT';
  inputSplits: { id: string; recordCount: number; sampleRecords: string[] }[];
  mapOutputs: { mapperId: string; pairs: KeyValuePair[] }[];
  combineOutputs: { mapperId: string; pairs: KeyValuePair[] }[];
  shuffleOutputs: { partitionId: number; key: string; values: any[] }[];
  reduceOutputs: { reducerId: string; pairs: KeyValuePair[] }[];
  finalOutputFiles: { path: string; lines: string[] }[];
}

export interface MapReduceJobConfig {
  jobId: string;
  jobName: string;
  description: string;
  mapperClass: string;
  reducerClass: string;
  combinerClass?: string;
  numReducers: number;
  inputPath: string;
  outputPath: string;
}

// Hive Models
export interface HiveColumn {
  name: string;
  type: string;
  comment?: string;
}

export interface HiveTable {
  name: string;
  database: string;
  tableType: 'MANAGED_TABLE' | 'EXTERNAL_TABLE';
  location: string;
  fileFormat: 'CSV' | 'PARQUET' | 'ORC';
  columns: HiveColumn[];
  partitionColumns?: HiveColumn[];
  rowCount: number;
  dataSizeBytes: number;
}

export interface HiveQueryResult {
  queryId: string;
  query: string;
  executionTimeMs: number;
  stages: { stageId: string; name: string; type: 'MAP_REDUCE' | 'TEZ_DAG' | 'FETCH'; progress: number }[];
  columns: string[];
  rows: Record<string, any>[];
  explainPlan: string;
}

// Spark Models
export interface SparkMicroBatch {
  batchId: number;
  timestamp: number;
  inputRows: number;
  processingTimeMs: number;
  watermark: string;
  windowAggregates: {
    windowStart: string;
    windowEnd: string;
    protocol: string;
    packetCount: number;
    byteCount: number;
    anomalyScore: number;
  }[];
}
