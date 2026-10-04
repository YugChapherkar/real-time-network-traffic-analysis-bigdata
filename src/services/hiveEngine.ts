import { HiveQueryResult, HiveTable, NetworkPacket } from '../types/network';

export const HIVE_PRESET_TABLES: HiveTable[] = [
  {
    name: 'raw_network_traffic',
    database: 'network_dw',
    tableType: 'EXTERNAL_TABLE',
    location: 'hdfs://namenode:9000/traffic/raw/',
    fileFormat: 'CSV',
    columns: [
      { name: 'timestamp', type: 'BIGINT', comment: 'Unix epoch timestamp in milliseconds' },
      { name: 'src_ip', type: 'STRING', comment: 'Source IPv4/IPv6 address' },
      { name: 'src_port', type: 'INT', comment: 'Source transport layer port' },
      { name: 'dst_ip', type: 'STRING', comment: 'Destination IPv4/IPv6 address' },
      { name: 'dst_port', type: 'INT', comment: 'Destination transport layer port' },
      { name: 'protocol', type: 'STRING', comment: 'L4/L7 protocol: TCP, UDP, DNS, HTTPS, ICMP' },
      { name: 'packet_size', type: 'INT', comment: 'Ethernet frame wire length in bytes' },
      { name: 'syn_flag', type: 'TINYINT', comment: '1 if TCP SYN flag set, else 0' },
      { name: 'ack_flag', type: 'TINYINT', comment: '1 if TCP ACK flag set, else 0' },
      { name: 'dns_query', type: 'STRING', comment: 'DNS resolution domain name' },
      { name: 'is_anomaly', type: 'BOOLEAN', comment: 'True if classified as attack traffic' },
    ],
    rowCount: 245000,
    dataSizeBytes: 314572800,
  },
  {
    name: 'traffic_parquet',
    database: 'network_dw',
    tableType: 'MANAGED_TABLE',
    location: 'hdfs://namenode:9000/user/hive/warehouse/network_dw.db/traffic_parquet',
    fileFormat: 'PARQUET',
    columns: [
      { name: 'timestamp', type: 'BIGINT' },
      { name: 'src_ip', type: 'STRING' },
      { name: 'src_port', type: 'INT' },
      { name: 'dst_ip', type: 'STRING' },
      { name: 'dst_port', type: 'INT' },
      { name: 'packet_size', type: 'INT' },
      { name: 'syn_flag', type: 'TINYINT' },
      { name: 'ack_flag', type: 'TINYINT' },
      { name: 'dns_query', type: 'STRING' },
      { name: 'is_anomaly', type: 'BOOLEAN' },
    ],
    partitionColumns: [
      { name: 'traffic_date', type: 'STRING', comment: 'Partition key: YYYY-MM-DD' },
      { name: 'protocol', type: 'STRING', comment: 'Partition key: TCP, UDP, DNS, etc.' },
    ],
    rowCount: 245000,
    dataSizeBytes: 67108864, // Snappy compressed columnar
  },
  {
    name: 'security_anomalies',
    database: 'network_dw',
    tableType: 'MANAGED_TABLE',
    location: 'hdfs://namenode:9000/user/hive/warehouse/network_dw.db/security_anomalies',
    fileFormat: 'PARQUET',
    columns: [
      { name: 'alert_id', type: 'STRING' },
      { name: 'detected_at', type: 'TIMESTAMP' },
      { name: 'anomaly_type', type: 'STRING' },
      { name: 'severity', type: 'STRING' },
      { name: 'src_ip', type: 'STRING' },
      { name: 'dst_ip', type: 'STRING' },
      { name: 'target_port', type: 'INT' },
      { name: 'metric_detail', type: 'STRING' },
    ],
    rowCount: 142,
    dataSizeBytes: 1258291,
  },
];

export const PRESET_HIVE_QUERIES = [
  {
    title: 'Top 5 Bandwidth Consumers (Total Bytes & Packets)',
    query: `SELECT src_ip, 
       COUNT(*) AS total_packets, 
       SUM(packet_size) AS total_bytes,
       ROUND(AVG(packet_size), 1) AS avg_packet_bytes
FROM traffic_parquet
GROUP BY src_ip
ORDER BY total_bytes DESC
LIMIT 5;`,
    description: 'Aggregates total payload bandwidth consumed by each source host to pinpoint heavy network producers.',
  },
  {
    title: 'SYN Flood Anomaly Detection (SYN-to-ACK Ratio)',
    query: `SELECT dst_ip, 
       COUNT(CASE WHEN syn_flag = 1 THEN 1 END) AS syn_count, 
       COUNT(CASE WHEN ack_flag = 1 THEN 1 END) AS ack_count,
       ROUND(COUNT(CASE WHEN syn_flag = 1 THEN 1 END) / NULLIF(COUNT(CASE WHEN ack_flag = 1 THEN 1 END), 0), 2) AS syn_ack_ratio
FROM traffic_parquet
GROUP BY dst_ip
HAVING syn_count >= 10 AND syn_ack_ratio >= 3.0;`,
    description: 'Computes SYN vs ACK asymmetry to flag victim destination hosts undergoing half-open TCP SYN exhaustion.',
  },
  {
    title: 'Port Scan Reconnaissance Identification',
    query: `SELECT src_ip, dst_ip,
       COUNT(DISTINCT dst_port) AS scanned_ports,
       MIN(dst_port) AS min_port,
       MAX(dst_port) AS max_port
FROM traffic_parquet
GROUP BY src_ip, dst_ip
HAVING scanned_ports >= 10
ORDER BY scanned_ports DESC;`,
    description: 'Identifies attacker IPs initiating connections to numerous destination ports within the analysis batch.',
  },
  {
    title: 'Protocol Distribution & Percentage Share',
    query: `SELECT protocol, 
       COUNT(*) AS packet_count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage_share,
       SUM(packet_size) AS aggregate_bytes
FROM traffic_parquet
GROUP BY protocol
ORDER BY packet_count DESC;`,
    description: 'Uses Hive analytic window function (OVER()) to calculate exact protocol percentage shares across the network.',
  },
];

export class HiveQuerySimulator {
  public executeQuery(query: string, currentPackets: NetworkPacket[]): HiveQueryResult {
    const queryId = `hive_query_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const lower = query.toLowerCase().trim();

    // Determine query type and execute
    if (lower.includes('syn_ack_ratio') || lower.includes('syn_flag')) {
      // SYN Flood query
      const dstStats: Record<string, { syn: number; ack: number }> = {};
      currentPackets.forEach(p => {
        if (!dstStats[p.dstIp]) dstStats[p.dstIp] = { syn: 0, ack: 0 };
        if (p.tcpFlags.syn) dstStats[p.dstIp].syn++;
        if (p.tcpFlags.ack) dstStats[p.dstIp].ack++;
      });

      // Inject demo row if table has small volume
      if (!dstStats['192.168.1.105'] || dstStats['192.168.1.105'].syn < 10) {
        dstStats['192.168.1.105'] = { syn: 42, ack: 3 };
      }

      const rows = Object.entries(dstStats)
        .map(([dst_ip, s]) => {
          const ratio = s.ack === 0 ? s.syn : Number((s.syn / s.ack).toFixed(2));
          return {
            dst_ip,
            syn_count: s.syn,
            ack_count: s.ack,
            syn_ack_ratio: ratio,
            status: ratio >= 3.0 && s.syn >= 10 ? '🚨 ATTACK DETECTED' : '✅ NORMAL',
          };
        })
        .filter(r => r.syn_count >= 5);

      return {
        queryId,
        query,
        executionTimeMs: 1420,
        stages: [
          { stageId: 'Stage-1', name: 'Map 1 (TableScan on traffic_parquet)', type: 'TEZ_DAG', progress: 100 },
          { stageId: 'Stage-2', name: 'Reducer 1 (GroupByOperator & HavingFilter)', type: 'TEZ_DAG', progress: 100 },
        ],
        columns: ['dst_ip', 'syn_count', 'ack_count', 'syn_ack_ratio', 'status'],
        rows,
        explainPlan: `STAGE DEPENDENCIES:
  Stage-1 is a root stage
  Stage-2 depends on Stage-1

STAGE PLANS:
  Stage: Stage-1
    Tez Map Operator:
      TableScan [traffic_parquet]
        Filter Operator: (syn_flag = 1 OR ack_flag = 1)
        Select Operator: dst_ip, syn_flag, ack_flag
        Group By Operator: aggregations: count(syn_flag), count(ack_flag) by dst_ip
  Stage: Stage-2
    Tez Reduce Operator:
      Group By Operator: finalize aggregations
      Filter Operator: (syn_count >= 10 AND syn_ack_ratio >= 3.0)
      File Output Operator: SerDe: LazySimpleSerDe`,
      };
    }

    if (lower.includes('distinct dst_port') || lower.includes('scanned_ports')) {
      // Port Scan query
      const scanMap: Record<string, { dstIp: string; ports: Set<number> }> = {};
      currentPackets.forEach(p => {
        const key = `${p.srcIp}->${p.dstIp}`;
        if (!scanMap[key]) scanMap[key] = { dstIp: p.dstIp, ports: new Set() };
        scanMap[key].ports.add(p.dstPort);
      });

      // Sample scanner if none
      if (!scanMap['198.51.100.77->192.168.1.105']) {
        const fakePorts = new Set([21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 8080]);
        scanMap['198.51.100.77->192.168.1.105'] = { dstIp: '192.168.1.105', ports: fakePorts };
      }

      const rows = Object.entries(scanMap).map(([key, data]) => {
        const srcIp = key.split('->')[0];
        const portArr = Array.from(data.ports);
        return {
          src_ip: srcIp,
          dst_ip: data.dstIp,
          scanned_ports: portArr.length,
          min_port: Math.min(...portArr),
          max_port: Math.max(...portArr),
          verdict: portArr.length >= 10 ? '🚨 SUSPECTED SCANNER' : '✅ BENIGN',
        };
      }).sort((a, b) => b.scanned_ports - a.scanned_ports);

      return {
        queryId,
        query,
        executionTimeMs: 1650,
        stages: [
          { stageId: 'Stage-1', name: 'Map 1 (PortScan Extract)', type: 'TEZ_DAG', progress: 100 },
          { stageId: 'Stage-2', name: 'Reducer 1 (Distinct Port Aggregation)', type: 'TEZ_DAG', progress: 100 },
        ],
        columns: ['src_ip', 'dst_ip', 'scanned_ports', 'min_port', 'max_port', 'verdict'],
        rows,
        explainPlan: `TEZ DAG PLAN:
  Vertices: Map 1 (3 tasks) -> Reduce 1 (2 tasks)
  Partitioner: HashPartitioner on (src_ip, dst_ip)
  Aggregations: count(DISTINCT dst_port), min(dst_port), max(dst_port)`,
      };
    }

    if (lower.includes('percentage_share') || lower.includes('over()')) {
      // Protocol share window function
      const protoCounts: Record<string, { count: number; bytes: number }> = {};
      let totalP = 0;
      currentPackets.forEach(p => {
        if (!protoCounts[p.protocol]) protoCounts[p.protocol] = { count: 0, bytes: 0 };
        protoCounts[p.protocol].count++;
        protoCounts[p.protocol].bytes += p.packetSize;
        totalP++;
      });

      if (totalP === 0) totalP = 1;
      const rows = Object.entries(protoCounts).map(([protocol, val]) => ({
        protocol,
        packet_count: val.count,
        percentage_share: Number(((val.count / totalP) * 100).toFixed(2)),
        aggregate_bytes: val.bytes,
      })).sort((a, b) => b.packet_count - a.packet_count);

      return {
        queryId,
        query,
        executionTimeMs: 1280,
        stages: [
          { stageId: 'Stage-1', name: 'Map 1 (Protocol TableScan)', type: 'TEZ_DAG', progress: 100 },
          { stageId: 'Stage-2', name: 'Reducer 1 (Group By Protocol)', type: 'TEZ_DAG', progress: 100 },
          { stageId: 'Stage-3', name: 'Reducer 2 (Window Analytic OVER())', type: 'TEZ_DAG', progress: 100 },
        ],
        columns: ['protocol', 'packet_count', 'percentage_share', 'aggregate_bytes'],
        rows,
        explainPlan: `WINDOW FUNCTION EXECUTION PLAN:
  Stage-1: Map 1 reads partitioned Parquet metadata
  Stage-2: GroupByOperator sums count & bytes
  Stage-3: WindowingOperator evaluates SUM(COUNT(*)) OVER() for global ratio`,
      };
    }

    // Default: Top Bandwidth Consumers
    const srcMap: Record<string, { packets: number; bytes: number }> = {};
    currentPackets.forEach(p => {
      if (!srcMap[p.srcIp]) srcMap[p.srcIp] = { packets: 0, bytes: 0 };
      srcMap[p.srcIp].packets++;
      srcMap[p.srcIp].bytes += p.packetSize;
    });

    // Fallback sample data if empty
    if (Object.keys(srcMap).length === 0) {
      srcMap['192.168.1.105'] = { packets: 120, bytes: 142050 };
      srcMap['142.250.190.46'] = { packets: 85, bytes: 98400 };
      srcMap['198.51.100.77'] = { packets: 65, bytes: 4160 };
      srcMap['8.8.8.8'] = { packets: 34, bytes: 3240 };
    }

    const rows = Object.entries(srcMap)
      .map(([src_ip, data]) => ({
        src_ip,
        total_packets: data.packets,
        total_bytes: data.bytes,
        avg_packet_bytes: Number((data.bytes / data.packets).toFixed(1)),
      }))
      .sort((a, b) => b.total_bytes - a.total_bytes)
      .slice(0, 5);

    return {
      queryId,
      query,
      executionTimeMs: 1150,
      stages: [
        { stageId: 'Stage-1', name: 'Map 1 (TableScan traffic_parquet)', type: 'TEZ_DAG', progress: 100 },
        { stageId: 'Stage-2', name: 'Reducer 1 (Group By src_ip & Order By Limit)', type: 'TEZ_DAG', progress: 100 },
      ],
      columns: ['src_ip', 'total_packets', 'total_bytes', 'avg_packet_bytes'],
      rows,
      explainPlan: `STAGE DEPENDENCIES:
  Stage-1 is a root stage
  Stage-2 depends on Stage-1

STAGE PLANS:
  Stage: Stage-1
    Tez Map Operator:
      TableScan [traffic_parquet]
      Group By Operator: keys: src_ip, aggregations: count(1), sum(packet_size)
  Stage: Stage-2
    Tez Reduce Operator:
      Sort Limit Operator: order: total_bytes DESC, limit: 5`,
    };
  }
}

export const globalHiveSimulator = new HiveQuerySimulator();
