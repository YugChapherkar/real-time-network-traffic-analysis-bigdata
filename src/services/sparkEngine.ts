import { NetworkPacket, SparkMicroBatch } from '../types/network';

export class SparkStreamingEngine {
  private isStreaming = true;
  private microBatchCounter = 1;
  private batches: SparkMicroBatch[] = [];
  private maxBatches = 20;

  public processMicroBatch(newPackets: NetworkPacket[]): SparkMicroBatch {
    const now = Date.now();
    const batchId = this.microBatchCounter++;
    const windowStart = new Date(now - 10000).toTimeString().split(' ')[0];
    const windowEnd = new Date(now).toTimeString().split(' ')[0];
    const watermarkTime = new Date(now - 5000).toTimeString().split(' ')[0];

    // Group packets by protocol for the microbatch window
    const protoGroups: Record<string, { count: number; bytes: number; anomalies: number }> = {};
    newPackets.forEach(p => {
      if (!protoGroups[p.protocol]) protoGroups[p.protocol] = { count: 0, bytes: 0, anomalies: 0 };
      protoGroups[p.protocol].count++;
      protoGroups[p.protocol].bytes += p.packetSize;
      if (p.isAnomaly) protoGroups[p.protocol].anomalies++;
    });

    const windowAggregates = Object.entries(protoGroups).map(([protocol, stats]) => ({
      windowStart,
      windowEnd,
      protocol,
      packetCount: stats.count,
      byteCount: stats.bytes,
      anomalyScore: stats.anomalies > 0 ? Number((stats.anomalies / stats.count).toFixed(2)) : 0,
    }));

    const processingTimeMs = Math.floor(Math.random() * 45) + 35; // Typical Spark micro-batch overhead 35-80ms

    const batch: SparkMicroBatch = {
      batchId,
      timestamp: now,
      inputRows: newPackets.length,
      processingTimeMs,
      watermark: watermarkTime,
      windowAggregates,
    };

    this.batches.unshift(batch);
    if (this.batches.length > this.maxBatches) {
      this.batches.pop();
    }

    return batch;
  }

  public getBatches(): SparkMicroBatch[] {
    return this.batches;
  }

  public toggleStreaming(enable?: boolean): boolean {
    this.isStreaming = enable !== undefined ? enable : !this.isStreaming;
    return this.isStreaming;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

export const globalSparkEngine = new SparkStreamingEngine();
