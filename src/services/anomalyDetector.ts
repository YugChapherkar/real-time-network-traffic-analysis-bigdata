import { NetworkPacket, AnomalyAlert, AnomalyType } from '../types/network';

export class AnomalyDetectionEngine {
  private alerts: AnomalyAlert[] = [];
  private maxAlerts = 200;
  
  // Tracking structures for stateful anomaly detection
  private synCountsByDst: Record<string, number> = {};
  private ackCountsByDst: Record<string, number> = {};
  private portsContactedBySrc: Record<string, Set<number>> = {};
  private lastWindowReset = Date.now();

  public analyzePacket(pkt: NetworkPacket): AnomalyAlert | null {
    const now = Date.now();

    // Reset sliding state windows every 8 seconds
    if (now - this.lastWindowReset > 8000) {
      this.synCountsByDst = {};
      this.ackCountsByDst = {};
      this.portsContactedBySrc = {};
      this.lastWindowReset = now;
    }

    // 1. SYN FLOOD DETECTION (SYN-ACK Asymmetry)
    if (pkt.protocol === 'TCP') {
      if (pkt.tcpFlags.syn && !pkt.tcpFlags.ack) {
        this.synCountsByDst[pkt.dstIp] = (this.synCountsByDst[pkt.dstIp] || 0) + 1;
      }
      if (pkt.tcpFlags.ack) {
        this.ackCountsByDst[pkt.dstIp] = (this.ackCountsByDst[pkt.dstIp] || 0) + 1;
      }

      const syns = this.synCountsByDst[pkt.dstIp] || 0;
      const acks = this.ackCountsByDst[pkt.dstIp] || 0;
      const ratio = acks === 0 ? syns : syns / acks;

      if (syns >= 12 && ratio >= 4.0) {
        const alert: AnomalyAlert = {
          id: `alt-syn-${now}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          timestampIso: new Date(now).toISOString(),
          type: 'SYN_FLOOD',
          severity: 'CRITICAL',
          srcIp: pkt.srcIp,
          dstIp: pkt.dstIp,
          targetPort: pkt.dstPort,
          title: 'TCP SYN Flood / Half-Open Connection Exhaustion',
          description: `Disproportionate SYN-to-ACK ratio (${ratio.toFixed(1)}:1) observed against ${pkt.dstIp}:${pkt.dstPort}. Receiver TCP backlog queues threatened.`,
          metricValue: `${syns} SYNs / ${acks} ACKs (Ratio: ${ratio.toFixed(1)})`,
          threshold: 'SYN/ACK Ratio > 4.0 with > 10 SYN requests',
          mitreTactic: 'Impact (TA0040)',
          mitreTechnique: 'Network Denial of Service: Direct Network Flood (T1498.001)',
          recommendedAction: 'Enable TCP SYN cookies in Linux kernel (`sysctl -w net.ipv4.tcp_syncookies=1`) and rate-limit SYNs via iptables.',
          iptablesRule: `iptables -A INPUT -p tcp --dport ${pkt.dstPort} --syn -m limit --limit 5/s --limit-burst 10 -j ACCEPT\niptables -A INPUT -p tcp --dport ${pkt.dstPort} --syn -j DROP`,
        };
        this.addAlert(alert);
        return alert;
      }
    }

    // 2. RECONNAISSANCE / PORT SCAN DETECTION
    if (pkt.protocol === 'TCP' || pkt.protocol === 'UDP') {
      if (!this.portsContactedBySrc[pkt.srcIp]) {
        this.portsContactedBySrc[pkt.srcIp] = new Set();
      }
      this.portsContactedBySrc[pkt.srcIp].add(pkt.dstPort);

      const scannedPortCount = this.portsContactedBySrc[pkt.srcIp].size;
      if (scannedPortCount >= 15) {
        const alert: AnomalyAlert = {
          id: `alt-scan-${now}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          timestampIso: new Date(now).toISOString(),
          type: 'PORT_SCAN',
          severity: 'HIGH',
          srcIp: pkt.srcIp,
          dstIp: pkt.dstIp,
          targetPort: pkt.dstPort,
          title: 'Horizontal/Vertical Port Sweep Reconnaissance',
          description: `Host ${pkt.srcIp} probed ${scannedPortCount} distinct ports on ${pkt.dstIp} in a rapid window, characteristic of Nmap/Masscan reconnaissance.`,
          metricValue: `${scannedPortCount} distinct destination ports touched`,
          threshold: '> 15 distinct ports within 8-second window',
          mitreTactic: 'Discovery (TA0007)',
          mitreTechnique: 'Network Service Discovery (T1046)',
          recommendedAction: 'Isolate source host in firewall access control list and inspect endpoint for rogue vulnerability scanners.',
          iptablesRule: `iptables -I INPUT -s ${pkt.srcIp} -j DROP`,
        };
        this.addAlert(alert);
        return alert;
      }
    }

    // 3. DNS TUNNELING / DATA EXFILTRATION
    if (pkt.protocol === 'DNS' && pkt.dnsQuery) {
      const qLen = pkt.dnsQuery.length;
      const entropy = pkt.dnsEntropy || 0;

      if (qLen >= 35 && entropy >= 3.6) {
        const alert: AnomalyAlert = {
          id: `alt-dns-${now}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: now,
          timestampIso: new Date(now).toISOString(),
          type: 'DNS_TUNNELING',
          severity: 'CRITICAL',
          srcIp: pkt.srcIp,
          dstIp: pkt.dstIp,
          targetPort: 53,
          title: 'DNS Tunneling & Covert Data Exfiltration',
          description: `High-entropy (${entropy}) long domain query (${pkt.dnsQuery}) detected. Corresponds to Iodine/DNSCat2 covert channel exfiltration.`,
          metricValue: `Entropy: ${entropy} (Query Length: ${qLen} chars)`,
          threshold: 'Query Length >= 35 chars AND Shannon Entropy >= 3.6',
          mitreTactic: 'Exfiltration (TA0010)',
          mitreTechnique: 'Exfiltration Over Alternative Protocol: DNS (T1048.003)',
          recommendedAction: 'Block recursive resolution for authoritative domain and inspect endpoint process initiating port 53 sockets.',
          iptablesRule: `iptables -A OUTPUT -p udp --dport 53 -m string --string "${pkt.dnsQuery.slice(-15)}" --algo bm -j DROP`,
        };
        this.addAlert(alert);
        return alert;
      }
    }

    // 4. VOLUMETRIC UDP/ICMP FLOOD
    if (pkt.anomalyType === 'VOLUMETRIC_DOS') {
      const alert: AnomalyAlert = {
        id: `alt-vol-${now}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        timestampIso: new Date(now).toISOString(),
        type: 'VOLUMETRIC_DOS',
        severity: 'HIGH',
        srcIp: pkt.srcIp,
        dstIp: pkt.dstIp,
        targetPort: pkt.dstPort,
        title: 'Volumetric Bandwidth Exhaustion (UDP Flood)',
        description: `Abnormal flood of maximum MTU datagrams (${pkt.packetSize} bytes) targeting port ${pkt.dstPort}, attempting link saturation.`,
        metricValue: `Packet payload: ${pkt.packetSize} bytes`,
        threshold: 'Sustained payload rate > 1200 bytes per datagram at elevated pps',
        mitreTactic: 'Impact (TA0040)',
        mitreTechnique: 'Endpoint Denial of Service: Service Exhaustion Flood (T1499.001)',
        recommendedAction: 'Apply upstream traffic policing or null-route victim port temporarily via BGP Flowspec.',
        iptablesRule: `iptables -A INPUT -p udp --dport ${pkt.dstPort} -m limit --limit 20/s -j ACCEPT\niptables -A INPUT -p udp --dport ${pkt.dstPort} -j DROP`,
      };
      this.addAlert(alert);
      return alert;
    }

    return null;
  }

  private addAlert(alert: AnomalyAlert) {
    // Avoid spamming duplicate alerts for the exact same src and type within 3 seconds
    const recentDuplicate = this.alerts.find(
      a => a.type === alert.type && a.srcIp === alert.srcIp && (alert.timestamp - a.timestamp) < 3000
    );
    if (!recentDuplicate) {
      this.alerts.unshift(alert);
      if (this.alerts.length > this.maxAlerts) {
        this.alerts.pop();
      }
    }
  }

  public getAlerts(): AnomalyAlert[] {
    return this.alerts;
  }

  public clearAlerts() {
    this.alerts = [];
  }
}

export const globalAnomalyDetector = new AnomalyDetectionEngine();
