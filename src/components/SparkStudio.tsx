import React, { useState } from 'react';
import { 
  Cpu, 
  Zap, 
  Activity, 
  Layers, 
  Clock, 
  Copy, 
  Check 
} from 'lucide-react';
import { SparkMicroBatch } from '../types/network';

interface SparkStudioProps {
  batches: SparkMicroBatch[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
}

export const SparkStudio: React.FC<SparkStudioProps> = ({
  batches,
  isStreaming,
  onToggleStreaming,
}) => {
  const [activeTab, setActiveTab] = useState<'streaming' | 'rdd_catalyst' | 'code'>('streaming');
  const [copied, setCopied] = useState<boolean>(false);

  const latestBatch = batches[0];

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Top Banner */}
      <div className="p-4 border border-black bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-black" />
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">
              Apache Spark & PySpark Structured Streaming Engine
            </h2>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">
            Near-real-time micro-batch streaming engine with event-time sliding windows and late-arrival watermarking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-black p-0.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('streaming')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                activeTab === 'streaming' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              Structured Streaming
            </button>
            <button
              onClick={() => setActiveTab('rdd_catalyst')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                activeTab === 'rdd_catalyst' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              RDD Lineage & Catalyst
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                activeTab === 'code' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              PySpark Script
            </button>
          </div>

          <button
            onClick={onToggleStreaming}
            className={`px-3 py-1.5 text-xs font-bold font-mono border border-black transition-colors cursor-pointer ${
              isStreaming
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {isStreaming ? 'Stream Running (2s)' : 'Stream Paused'}
          </button>
        </div>
      </div>

      {activeTab === 'streaming' && (
        <div className="space-y-4">
          {/* Micro-Batch Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 border border-black bg-white font-mono text-xs">
              <div className="text-neutral-600 flex items-center justify-between">
                <span className="font-bold uppercase">Batch Trigger</span>
                <Clock className="w-4 h-4 text-black" />
              </div>
              <div className="text-xl font-bold text-black mt-1">
                2.0 <span className="text-xs font-normal text-neutral-600">seconds</span>
              </div>
              <span className="text-[10px] text-neutral-500">ProcessingTime trigger</span>
            </div>

            <div className="p-3.5 border border-black bg-white font-mono text-xs">
              <div className="text-neutral-600 flex items-center justify-between">
                <span className="font-bold uppercase">Watermark Delay</span>
                <Activity className="w-4 h-4 text-black" />
              </div>
              <div className="text-xl font-bold text-black mt-1">
                5.0 <span className="text-xs font-normal text-neutral-600">seconds</span>
              </div>
              <span className="text-[10px] text-neutral-500">Late packet boundary</span>
            </div>

            <div className="p-3.5 border border-black bg-white font-mono text-xs">
              <div className="text-neutral-600 flex items-center justify-between">
                <span className="font-bold uppercase">Batch Duration</span>
                <Zap className="w-4 h-4 text-black" />
              </div>
              <div className="text-xl font-bold text-black mt-1">
                {latestBatch?.processingTimeMs || 42} <span className="text-xs font-normal text-neutral-600">ms</span>
              </div>
              <span className="text-[10px] text-neutral-500">Sub-100ms micro-batch latency</span>
            </div>

            <div className="p-3.5 border border-black bg-white font-mono text-xs">
              <div className="text-neutral-600 flex items-center justify-between">
                <span className="font-bold uppercase">Micro-Batch ID</span>
                <Layers className="w-4 h-4 text-black" />
              </div>
              <div className="text-xl font-bold text-black mt-1">
                #{latestBatch?.batchId || 1}
              </div>
              <span className="text-[10px] text-neutral-500">{batches.length} retained in state</span>
            </div>
          </div>

          {/* Spark Pipeline Diagram */}
          <div className="p-4 border border-black bg-white space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-black block">
              Event-Time Structured Streaming Graph
            </span>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs font-mono text-center">
              <div className="p-2.5 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">1. Source</div>
                <div className="text-neutral-600 text-[11px] mt-1">CSV Landing / Socket</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">readStream</div>
              </div>
              <div className="p-2.5 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">2. Watermark</div>
                <div className="text-neutral-600 text-[11px] mt-1">5s Late Bound</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">withWatermark()</div>
              </div>
              <div className="p-2.5 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">3. Window Agg</div>
                <div className="text-neutral-600 text-[11px] mt-1">10s Win, 2s Slide</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">groupBy(window)</div>
              </div>
              <div className="p-2.5 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">4. State Store</div>
                <div className="text-neutral-600 text-[11px] mt-1">HDFS / Memory State</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">RocksDB / HDFS</div>
              </div>
              <div className="p-2.5 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">5. Sink</div>
                <div className="text-neutral-600 text-[11px] mt-1">Console / Dashboard</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">outputMode("update")</div>
              </div>
            </div>
          </div>

          {/* Micro-Batch Stream Feed */}
          <div className="p-4 border border-black bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <span className="font-bold text-xs uppercase text-black">
                Real-Time Sliding Window State (Micro-Batches)
              </span>
              <span className="text-xs font-mono font-bold text-black">
                Watermark: {latestBatch?.watermark || '00:00:00'}
              </span>
            </div>

            <div className="border border-black overflow-x-auto bg-white">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-neutral-100 text-black border-b border-black">
                  <tr>
                    <th className="py-2 px-3 font-bold uppercase">Batch ID</th>
                    <th className="py-2 px-3 font-bold uppercase">Window Range</th>
                    <th className="py-2 px-3 font-bold uppercase">Protocol</th>
                    <th className="py-2 px-3 font-bold uppercase">Packets</th>
                    <th className="py-2 px-3 font-bold uppercase">Bytes</th>
                    <th className="py-2 px-3 font-bold uppercase">Duration</th>
                    <th className="py-2 px-3 font-bold uppercase text-right">Anomaly Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {batches.map(b => (
                    b.windowAggregates.map((agg, idx) => (
                      <tr key={`${b.batchId}-${idx}`} className="hover:bg-neutral-50">
                        {idx === 0 && (
                          <td rowSpan={b.windowAggregates.length} className="py-2 px-3 font-bold text-black align-top border-r border-neutral-300">
                            #{b.batchId}
                          </td>
                        )}
                        <td className="py-2 px-3 text-neutral-700">
                          {agg.windowStart} - {agg.windowEnd}
                        </td>
                        <td className="py-2 px-3 text-black font-semibold">{agg.protocol}</td>
                        <td className="py-2 px-3 text-black">{agg.packetCount}</td>
                        <td className="py-2 px-3 text-black">{(agg.byteCount / 1024).toFixed(1)} KB</td>
                        <td className="py-2 px-3 font-bold text-black">{b.processingTimeMs} ms</td>
                        <td className="py-2 px-3 text-right">
                          {agg.anomalyScore > 0 ? (
                            <span className="font-bold border border-black px-1.5 py-0.5 bg-black text-white">
                              {(agg.anomalyScore * 100).toFixed(0)}% THREAT
                            </span>
                          ) : (
                            <span className="text-neutral-600">0.0 (CLEAN)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rdd_catalyst' && (
        <div className="space-y-4 font-mono text-xs">
          {/* RDD Lineage Graph */}
          <div className="p-4 border border-black bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <span className="font-bold uppercase text-black">
                PySpark RDD Lineage DAG (Directed Acyclic Graph)
              </span>
              <span className="text-[11px] font-bold text-black">Stage Boundaries</span>
            </div>

            <div className="p-3 border border-neutral-300 bg-neutral-50 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 border border-black bg-black text-white font-bold">Stage 0</span>
                <span className="text-black font-sans">
                  sc.textFile("hdfs://namenode:9000/traffic/raw/*.csv")
                </span>
                <span className="text-[10px] text-neutral-500">(Narrow Dependency)</span>
              </div>

              <div className="pl-6 border-l-2 border-black ml-4 space-y-2 py-1">
                <div className="text-black font-sans">
                  ↓ .filter(lambda line: not line.startswith("timestamp"))
                </div>
                <div className="text-black font-sans">
                  ↓ .map(lambda line: (line.split(',')[1], int(line.split(',')[6])))
                </div>
              </div>

              <div className="p-2 border border-black bg-white text-black font-bold text-[11px]">
                SHUFFLE BOUNDARY (Wide Dependency: Data repartitioned across cluster workers)
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="p-1 border border-black bg-black text-white font-bold">Stage 1</span>
                <span className="text-black font-sans">
                  ↓ .reduceByKey(lambda a, b: a + b)
                </span>
                <span className="text-[10px] text-neutral-500">(ShuffledRDD)</span>
              </div>
            </div>
          </div>

          {/* Catalyst Optimizer Phases */}
          <div className="p-4 border border-black bg-white space-y-3">
            <span className="font-bold uppercase text-black block border-b border-black pb-2">
              Spark SQL Catalyst Optimizer Phases
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">1. Parsed Logical</div>
                <div className="text-neutral-600 text-[11px] mt-1 font-sans">AST from DataFrame / SQL API</div>
              </div>
              <div className="p-3 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">2. Analyzed Logical</div>
                <div className="text-neutral-600 text-[11px] mt-1 font-sans">Resolves column names with Catalog</div>
              </div>
              <div className="p-3 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">3. Optimized Logical</div>
                <div className="text-neutral-600 text-[11px] mt-1 font-sans">Predicate Pushdown & Pruning</div>
              </div>
              <div className="p-3 border border-neutral-300 bg-neutral-50">
                <div className="font-bold text-black">4. Physical Plan</div>
                <div className="text-neutral-600 text-[11px] mt-1 font-sans">Whole-Stage Java Codegen</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'code' && (
        <div className="p-4 border border-black bg-white space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <span className="font-bold text-black uppercase">PySpark Structured Streaming Application</span>
            <button
              onClick={() => {
                const code = `from pyspark.sql import SparkSession\nfrom pyspark.sql.functions import col, window, count\nspark = SparkSession.builder.appName("Traffic").getOrCreate()\ndf = spark.readStream.format("csv").schema(...).load("./landing_zone")\nq = df.withWatermark("timestamp", "5 seconds").groupBy(window("timestamp", "10 seconds", "2 seconds"), "dst_ip").agg(count("*")).writeStream.outputMode("update").format("console").start()\nq.awaitTermination()`;
                navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-3 py-1 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy Python'}
            </button>
          </div>

          <pre className="bg-neutral-50 p-4 border border-neutral-300 text-black overflow-x-auto text-[11px]">
{`from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_unixtime, to_timestamp, window, count, sum, when, round

spark = SparkSession.builder \\
    .appName("RealTimeNetworkTrafficAnalyzer") \\
    .master("local[*]") \\
    .getOrCreate()

# 1. Ingest continuous micro-batches from HDFS landing directory
streaming_df = spark.readStream \\
    .format("csv") \\
    .option("header", "true") \\
    .schema(traffic_schema) \\
    .load("/traffic/raw/")

# 2. Watermark late arrivals and compute 10-second sliding windows
windowed = streaming_df \\
    .withColumn("event_time", to_timestamp(from_unixtime(col("timestamp") / 1000))) \\
    .withWatermark("event_time", "5 seconds") \\
    .groupBy(
        window(col("event_time"), "10 seconds", "2 seconds"),
        col("dst_ip")
    ) \\
    .agg(
        count("*").alias("pps"),
        sum(when(col("syn_flag") == 1, 1).otherwise(0)).alias("syn_count"),
        sum(when(col("ack_flag") == 1, 1).otherwise(0)).alias("ack_count")
    )

query = windowed.writeStream \\
    .outputMode("update") \\
    .format("console") \\
    .start()

query.awaitTermination()`}
          </pre>
        </div>
      )}
    </div>
  );
};
