import { NetworkPacket, Protocol, AnomalyType, TrafficMetrics } from '../types/network';

// Calculation for Shannon Entropy (used in DNS tunneling detection)
export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const map: Record<string, number> = {};
  for (const char of str) {
    map[char] = (map[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(map)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(3));
}

const COMMON_PORTS = [80, 443, 53, 22, 8080, 3306, 8443, 25, 123, 445];
const COMMON_EXTERNAL_IPS = [
  '142.250.190.46', // Google
  '157.240.22.35',  // Meta
  '13.107.42.14',   // Microsoft
  '151.101.65.140', // Reddit / Fastly
  '104.244.42.1',   // Twitter / X
  '185.199.108.153',// GitHub CDN
  '1.1.1.1',        // Cloudflare DNS
  '8.8.8.8',        // Google DNS
];

const LOCAL_IPS = [
  '192.168.1.105', // Student host computer
  '192.168.1.1',   // Gateway router
  '192.168.1.120', // Local test machine
  '10.0.0.45',     // Virtual LAN
];

let packetCounter = 1000;
let portScanPortPointer = 20;

export class TrafficSimulator {
  private activeScenario: AnomalyType | 'NONE' = 'NONE';
  private packets: NetworkPacket[] = [];
  private maxRetainedPackets = 1000;
  private isCapturing = true;
  private captureSpeed = 1; // Multiplier

  public setScenario(scenario: AnomalyType | 'NONE') {
    this.activeScenario = scenario;
    if (scenario === 'PORT_SCAN') {
      portScanPortPointer = 20;
    }
  }

  public getScenario(): AnomalyType | 'NONE' {
    return this.activeScenario;
  }

  public toggleCapture(running?: boolean) {
    this.isCapturing = running !== undefined ? running : !this.isCapturing;
    return this.isCapturing;
  }

  public getIsCapturing(): boolean {
    return this.isCapturing;
  }

  public setCaptureSpeed(speed: number) {
    this.captureSpeed = speed;
  }

  public generateNextPacket(): NetworkPacket {
    packetCounter++;
    const now = Date.now();
    const id = `pkt-${packetCounter}-${now.toString(36)}`;
    const nowIso = new Date(now).toISOString();

    if (this.activeScenario === 'SYN_FLOOD') {
      // Massive SYN flood targeting student server
      const spoofedIp = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
      const srcPort = Math.floor(Math.random() * 60000) + 1024;
      const targetPort = Math.random() > 0.3 ? 80 : 443;
      const packet: NetworkPacket = {
        id,
        timestamp: now,
        timestampIso: nowIso,
        srcIp: spoofedIp,
        srcPort,
        dstIp: '192.168.1.105',
        dstPort: targetPort,
        protocol: 'TCP',
        packetSize: 64, // Typical small SYN probe
        tcpFlags: {
          syn: true,
          ack: false,
          fin: false,
          rst: false,
          psh: false,
          urg: false,
        },
        ttl: 48 + Math.floor(Math.random() * 16),
        windowSize: 1024,
        payloadSummary: `[SYN] Seq=0 Win=1024 Len=0 MSS=1460 (SYN Flood Attack Packet #${packetCounter})`,
        hexPreview: `00 50 56 c0 00 08 c0 a8 01 69 c6 33 64 ${Math.floor(Math.random() * 255).toString(16).padStart(2, '0')} 08 00 45 00 00 28 54 62 40 00 40 06`,
        flowId: `${spoofedIp}:${srcPort}->192.168.1.105:${targetPort}:TCP`,
        isAnomaly: true,
        anomalyType: 'SYN_FLOOD',
      };
      this.storePacket(packet);
      return packet;
    }

    if (this.activeScenario === 'PORT_SCAN') {
      const attackerIp = '198.51.100.77';
      const targetPort = portScanPortPointer++;
      if (portScanPortPointer > 1050) portScanPortPointer = 20;

      const packet: NetworkPacket = {
        id,
        timestamp: now,
        timestampIso: nowIso,
        srcIp: attackerIp,
        srcPort: 45210,
        dstIp: '192.168.1.105',
        dstPort: targetPort,
        protocol: 'TCP',
        packetSize: 60,
        tcpFlags: {
          syn: true,
          ack: false,
          fin: false,
          rst: false,
          psh: false,
          urg: false,
        },
        ttl: 52,
        windowSize: 2048,
        payloadSummary: `[SYN Scan] Recon port ${targetPort} / TCP`,
        hexPreview: `00 0c 29 e4 b2 a1 c0 a8 01 01 08 00 45 00 00 3c b1 c2 40 00 34 06 91 a3`,
        flowId: `${attackerIp}:45210->192.168.1.105:${targetPort}:TCP`,
        isAnomaly: true,
        anomalyType: 'PORT_SCAN',
      };
      this.storePacket(packet);
      return packet;
    }

    if (this.activeScenario === 'DNS_TUNNELING') {
      const internalVictim = '192.168.1.105';
      const hexPayload = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const fakeDnsQuery = `exfil_${hexPayload}.tunnel.c2-darknode.io`;
      const entropy = calculateShannonEntropy(fakeDnsQuery);

      const packet: NetworkPacket = {
        id,
        timestamp: now,
        timestampIso: nowIso,
        srcIp: internalVictim,
        srcPort: 53120,
        dstIp: '8.8.8.8',
        dstPort: 53,
        protocol: 'DNS',
        packetSize: 180 + Math.floor(Math.random() * 80),
        tcpFlags: { syn: false, ack: false, fin: false, rst: false, psh: false, urg: false },
        ttl: 64,
        windowSize: 0,
        dnsQuery: fakeDnsQuery,
        dnsEntropy: entropy,
        payloadSummary: `Standard query 0x${Math.floor(Math.random() * 65535).toString(16)} TXT ${fakeDnsQuery}`,
        hexPreview: `00 1a 4a 12 b3 4c 08 00 45 00 00 78 1a 2b 00 00 40 11 7a 9e 08 08 08 08`,
        flowId: `${internalVictim}:53120->8.8.8.8:53:UDP`,
        isAnomaly: true,
        anomalyType: 'DNS_TUNNELING',
      };
      this.storePacket(packet);
      return packet;
    }

    if (this.activeScenario === 'VOLUMETRIC_DOS') {
      const src = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
      const packet: NetworkPacket = {
        id,
        timestamp: now,
        timestampIso: nowIso,
        srcIp: src,
        srcPort: Math.floor(Math.random() * 60000) + 1024,
        dstIp: '192.168.1.105',
        dstPort: 5001,
        protocol: 'UDP',
        packetSize: 1472, // Jumbo packet
        tcpFlags: { syn: false, ack: false, fin: false, rst: false, psh: false, urg: false },
        ttl: 32,
        windowSize: 0,
        payloadSummary: `UDP Flood Payload (${1472} bytes) Bandwidth Exhaustion`,
        hexPreview: `45 00 05 dc a1 2b 00 00 20 11 c4 e8 cb 00 71 22 c0 a8 01 69 13 89 13 89`,
        flowId: `${src}:random->192.168.1.105:5001:UDP`,
        isAnomaly: true,
        anomalyType: 'VOLUMETRIC_DOS',
      };
      this.storePacket(packet);
      return packet;
    }

    // NORMAL TRAFFIC GENERATION
    const isOutbound = Math.random() > 0.45;
    const srcIp = isOutbound ? '192.168.1.105' : COMMON_EXTERNAL_IPS[Math.floor(Math.random() * COMMON_EXTERNAL_IPS.length)];
    const dstIp = isOutbound ? COMMON_EXTERNAL_IPS[Math.floor(Math.random() * COMMON_EXTERNAL_IPS.length)] : '192.168.1.105';
    
    const protoRoll = Math.random();
    let protocol: Protocol = 'TCP';
    let dstPort = 443;
    let srcPort = Math.floor(Math.random() * 40000) + 20000;
    let size = 64;
    let dnsQuery: string | undefined = undefined;
    let dnsEntropy: number | undefined = undefined;
    let summary = '';
    const flags = { syn: false, ack: true, fin: false, rst: false, psh: false, urg: false };

    if (protoRoll < 0.55) {
      // HTTPS / TLS Traffic
      protocol = 'HTTPS';
      dstPort = 443;
      size = Math.floor(Math.random() * 1200) + 120;
      flags.psh = Math.random() > 0.7;
      summary = flags.psh 
        ? `TLSv1.3 Application Data [Encrypted Record, Len=${size - 54}]` 
        : `[ACK] Seq=${Math.floor(Math.random() * 10000)} Ack=${Math.floor(Math.random() * 10000)} Win=64240`;
    } else if (protoRoll < 0.75) {
      // HTTP API
      protocol = 'HTTP';
      dstPort = 80;
      size = Math.floor(Math.random() * 800) + 250;
      flags.psh = true;
      summary = isOutbound ? 'GET /api/v1/metrics HTTP/1.1 (Host: telemetry.service.org)' : 'HTTP/1.1 200 OK (application/json, gzip)';
    } else if (protoRoll < 0.90) {
      // DNS Request / Response
      protocol = 'DNS';
      dstPort = 53;
      size = Math.floor(Math.random() * 120) + 60;
      const domains = ['api.github.com', 'registry.npmjs.org', 'update.googleapis.com', 'time.cloudflare.com'];
      dnsQuery = domains[Math.floor(Math.random() * domains.length)];
      dnsEntropy = calculateShannonEntropy(dnsQuery);
      summary = `Standard query A ${dnsQuery} -> IN A`;
    } else if (protoRoll < 0.97) {
      // General TCP handshake
      protocol = 'TCP';
      dstPort = COMMON_PORTS[Math.floor(Math.random() * COMMON_PORTS.length)];
      size = 64;
      flags.syn = Math.random() > 0.6;
      flags.ack = true;
      summary = flags.syn ? `[SYN, ACK] Seq=0 Ack=1 Win=65535 MSS=1460` : `[ACK] Connection keepalive`;
    } else {
      // ICMP Ping
      protocol = 'ICMP';
      dstPort = 0;
      srcPort = 0;
      size = 84;
      summary = 'Echo (ping) request id=0x182a, seq=1/256, ttl=64';
    }

    const packet: NetworkPacket = {
      id,
      timestamp: now,
      timestampIso: nowIso,
      srcIp,
      srcPort,
      dstIp,
      dstPort,
      protocol,
      packetSize: size,
      tcpFlags: flags,
      ttl: 64,
      windowSize: 65535,
      dnsQuery,
      dnsEntropy,
      payloadSummary: summary,
      hexPreview: `00 15 5d 8a ${Math.floor(Math.random() * 255).toString(16).padStart(2, '0')} 1c 08 00 45 00 00 ${size.toString(16).padStart(2, '0')} 4a 1b 40 00 40 06 c1`,
      flowId: `${srcIp}:${srcPort}->${dstIp}:${dstPort}:${protocol}`,
      isAnomaly: false,
    };

    this.storePacket(packet);
    return packet;
  }

  private storePacket(pkt: NetworkPacket) {
    this.packets.unshift(pkt);
    if (this.packets.length > this.maxRetainedPackets) {
      this.packets.pop();
    }
  }

  public getRecentPackets(limit = 100): NetworkPacket[] {
    return this.packets.slice(0, limit);
  }

  public clearPackets() {
    this.packets = [];
  }

  public calculateMetrics(windowMs = 5000): TrafficMetrics {
    const now = Date.now();
    const windowPackets = this.packets.filter(p => now - p.timestamp <= windowMs);
    const windowSeconds = Math.max(1, windowMs / 1000);

    const protocolCounts: Record<Protocol, number> = {
      TCP: 0,
      UDP: 0,
      ICMP: 0,
      DNS: 0,
      HTTP: 0,
      HTTPS: 0,
      TLS: 0,
    };

    let totalBytesInWindow = 0;
    let synCount = 0;
    let ackCount = 0;
    let anomalyCount = 0;
    const srcMap: Record<string, { bytes: number; packets: number }> = {};
    const dstMap: Record<string, { bytes: number; packets: number }> = {};

    for (const p of this.packets) {
      if (protocolCounts[p.protocol] !== undefined) {
        protocolCounts[p.protocol]++;
      }
      if (p.tcpFlags.syn) synCount++;
      if (p.tcpFlags.ack) ackCount++;
      if (p.isAnomaly) anomalyCount++;

      if (srcMap[p.srcIp]) {
        srcMap[p.srcIp].bytes += p.packetSize;
        srcMap[p.srcIp].packets += 1;
      } else {
        srcMap[p.srcIp] = { bytes: p.packetSize, packets: 1 };
      }

      if (dstMap[p.dstIp]) {
        dstMap[p.dstIp].bytes += p.packetSize;
        dstMap[p.dstIp].packets += 1;
      } else {
        dstMap[p.dstIp] = { bytes: p.packetSize, packets: 1 };
      }
    }

    for (const p of windowPackets) {
      totalBytesInWindow += p.packetSize;
    }

    const topSources = Object.entries(srcMap)
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);

    const topDestinations = Object.entries(dstMap)
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);

    const currentPps = Math.round(windowPackets.length / windowSeconds);
    const currentBps = Math.round(totalBytesInWindow / windowSeconds);

    const totalBytesAll = this.packets.reduce((sum, p) => sum + p.packetSize, 0);

    return {
      totalPackets: this.packets.length,
      totalBytes: totalBytesAll,
      currentPps,
      currentBps,
      synCount,
      ackCount,
      anomalyCount,
      protocolCounts,
      topSources,
      topDestinations,
    };
  }

  public exportAsCsv(): string {
    const headers = ['timestamp_iso', 'src_ip', 'src_port', 'dst_ip', 'dst_port', 'protocol', 'packet_size', 'syn', 'ack', 'dns_query', 'anomaly'];
    const rows = this.packets.slice(0, 500).map(p => [
      p.timestampIso,
      p.srcIp,
      p.srcPort,
      p.dstIp,
      p.dstPort,
      p.protocol,
      p.packetSize,
      p.tcpFlags.syn ? 1 : 0,
      p.tcpFlags.ack ? 1 : 0,
      `"${p.dnsQuery || ''}"`,
      p.isAnomaly ? 1 : 0,
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }
}

export const globalTrafficSimulator = new TrafficSimulator();
