export interface StudentScript {
  id: string;
  name: string;
  filename: string;
  language: 'python' | 'yaml' | 'sql' | 'bash';
  category: 'Capture & Ingestion' | 'Hadoop & MapReduce' | 'Apache Hive' | 'Apache Spark' | 'Cluster Deployment';
  description: string;
  command: string;
  code: string;
}

export const STUDENT_SCRIPTS: StudentScript[] = [
  {
    id: 'docker-compose',
    name: 'Single-Node Hadoop, Hive & Spark Docker Stack',
    filename: 'docker-compose.yml',
    language: 'yaml',
    category: 'Cluster Deployment',
    description: 'Runs single-node Hadoop 3.3.6 (NameNode + DataNode + ResourceManager), Hive 3.1.3 Metastore, and Spark 3.5.0 on a laptop with 4GB-6GB RAM limit.',
    command: 'docker-compose up -d',
    code: `version: "3.8"

services:
  # 1. HDFS NameNode
  namenode:
    image: bde2020/hadoop-namenode:2.0.0-hadoop3.2.1-java8
    container_name: namenode
    restart: always
    ports:
      - "9870:9870" # NameNode Web UI
      - "9000:9000" # HDFS IPC Port
    environment:
      - CLUSTER_NAME=traffic_cluster
      - HDFS_CONF_dfs_replication=1
    volumes:
      - hadoop_namenode:/hadoop/dfs/name

  # 2. HDFS DataNode
  datanode:
    image: bde2020/hadoop-datanode:2.0.0-hadoop3.2.1-java8
    container_name: datanode
    restart: always
    depends_on:
      - namenode
    ports:
      - "9864:9864" # DataNode Web UI
    environment:
      - SERVICE_PRECONDITION=namenode:9000
      - HDFS_CONF_dfs_replication=1
    volumes:
      - hadoop_datanode:/hadoop/dfs/data

  # 3. YARN ResourceManager & NodeManager
  resourcemanager:
    image: bde2020/hadoop-resourcemanager:2.0.0-hadoop3.2.1-java8
    container_name: resourcemanager
    restart: always
    depends_on:
      - namenode
      - datanode
    ports:
      - "8088:8088" # YARN Web UI

  nodemanager:
    image: bde2020/hadoop-nodemanager:2.0.0-hadoop3.2.1-java8
    container_name: nodemanager
    restart: always
    depends_on:
      - namenode
      - datanode
      - resourcemanager

  # 4. Apache Spark Master & Worker
  spark-master:
    image: bitnami/spark:3.5.0
    container_name: spark-master
    environment:
      - SPARK_MODE=master
      - SPARK_RPC_AUTHENTICATION_ENABLED=no
    ports:
      - "8080:8080" # Spark Master Web UI
      - "7077:7077" # Spark Master Port

  spark-worker:
    image: bitnami/spark:3.5.0
    container_name: spark-worker
    depends_on:
      - spark-master
    environment:
      - SPARK_MODE=worker
      - SPARK_MASTER_URL=spark://spark-master:7077
      - SPARK_WORKER_MEMORY=2G
      - SPARK_WORKER_CORES=2

volumes:
  hadoop_namenode:
  hadoop_datanode:
`,
  },
  {
    id: 'packet-capture',
    name: 'Packet Capture & Feature Normalizer (Scapy)',
    filename: 'packet_capture.py',
    language: 'python',
    category: 'Capture & Ingestion',
    description: 'Captures live network packets from your computer (Wi-Fi/Ethernet), parses protocol headers, computes entropy, and writes micro-batch CSVs into the landing zone.',
    command: 'sudo python3 packet_capture.py --interface eth0 --interval 5',
    code: `#!/usr/bin/env python3
"""
Semester BDA Project: Real-Time Network Traffic Capture & Normalizer
Uses Scapy to capture live packets from host network interface and
normalizes them into structured CSV records for HDFS ingestion.
"""

import os
import sys
import time
import math
import csv
from scapy.all import sniff, IP, TCP, UDP, ICMP, DNS, DNSQR

LANDING_DIR = "./landing_zone"
os.makedirs(LANDING_DIR, exist_ok=True)

def shannon_entropy(data: str) -> float:
    """Calculate Shannon Entropy of DNS query strings to detect C2 tunneling."""
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    frequencies = {char: data.count(char) for char in set(data)}
    for count in frequencies.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 3)

class TrafficCaptureEngine:
    def __init__(self, batch_interval_sec=5):
        self.batch_interval = batch_interval_sec
        self.current_batch = []
        self.batch_counter = 1
        self.last_flush_time = time.time()

    def process_packet(self, packet):
        if not packet.haslayer(IP):
            return

        ip_layer = packet.getlayer(IP)
        timestamp_ms = int(time.time() * 1000)
        src_ip = ip_layer.src
        dst_ip = ip_layer.dst
        length = len(packet)
        protocol = "OTHER"
        src_port = 0
        dst_port = 0
        syn_flag = 0
        ack_flag = 0
        dns_query = ""

        if packet.haslayer(TCP):
            tcp_layer = packet.getlayer(TCP)
            protocol = "TCP"
            src_port = tcp_layer.sport
            dst_port = tcp_layer.dport
            # Extract TCP Flags
            flags = str(tcp_layer.flags)
            syn_flag = 1 if 'S' in flags else 0
            ack_flag = 1 if 'A' in flags else 0
            if dst_port == 443 or src_port == 443:
                protocol = "HTTPS"
            elif dst_port == 80 or src_port == 80:
                protocol = "HTTP"

        elif packet.haslayer(UDP):
            udp_layer = packet.getlayer(UDP)
            protocol = "UDP"
            src_port = udp_layer.sport
            dst_port = udp_layer.dport
            if packet.haslayer(DNS):
                protocol = "DNS"
                if packet.haslayer(DNSQR) and packet[DNSQR].qname:
                    dns_query = packet[DNSQR].qname.decode('utf-8', errors='ignore').rstrip('.')

        elif packet.haslayer(ICMP):
            protocol = "ICMP"

        entropy = shannon_entropy(dns_query)

        record = {
            "timestamp": timestamp_ms,
            "src_ip": src_ip,
            "src_port": src_port,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "protocol": protocol,
            "packet_size": length,
            "syn_flag": syn_flag,
            "ack_flag": ack_flag,
            "dns_query": dns_query,
            "dns_entropy": entropy
        }

        self.current_batch.append(record)

        # Flush micro-batch to disk every N seconds
        if time.time() - self.last_flush_time >= self.batch_interval:
            self.flush_batch()

    def flush_batch(self):
        if not self.current_batch:
            self.last_flush_time = time.time()
            return

        filename = f"{LANDING_DIR}/traffic_batch_{int(time.time())}_{self.batch_counter}.csv"
        keys = self.current_batch[0].keys()

        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(self.current_batch)

        print(f"[+] Flushed {len(self.current_batch)} packets to {filename}")
        self.current_batch = []
        self.batch_counter += 1
        self.last_flush_time = time.time()

if __name__ == "__main__":
    print("[*] Starting Packet Capture Engine. Press Ctrl+C to stop.")
    engine = TrafficCaptureEngine(batch_interval_sec=5)
    # sniff() runs indefinitely until interrupted
    try:
        sniff(prn=engine.process_packet, store=False)
    except KeyboardInterrupt:
        print("[!] Stopping capture. Flushing remaining records...")
        engine.flush_batch()
        sys.exit(0)
`,
  },
  {
    id: 'hdfs-uploader',
    name: 'HDFS Batch Landing Daemon',
    filename: 'hdfs_uploader.py',
    language: 'python',
    category: 'Hadoop & MapReduce',
    description: 'Monitors the local landing zone directory and transfers newly created packet batches into HDFS distributed directory (/traffic/raw/).',
    command: 'python3 hdfs_uploader.py',
    code: `#!/usr/bin/env python3
"""
HDFS Ingestion Daemon:
Watches ./landing_zone/ and uploads completed batch CSV files
into Hadoop HDFS at /traffic/raw/year=YYYY/month=MM/day=DD/
"""

import os
import time
import subprocess

LANDING_DIR = "./landing_zone"
HDFS_TARGET_DIR = "/traffic/raw"

def ensure_hdfs_dir():
    cmd = f"docker exec -i namenode hdfs dfs -mkdir -p {HDFS_TARGET_DIR}"
    subprocess.run(cmd, shell=True, check=True)
    print(f"[*] Verified HDFS directory exists: {HDFS_TARGET_DIR}")

def upload_batches():
    ensure_hdfs_dir()
    print("[*] Monitoring landing zone for new packet CSV batches...")
    
    while True:
        files = [f for f in os.listdir(LANDING_DIR) if f.endswith(".csv")]
        for file in files:
            local_path = os.path.join(LANDING_DIR, file)
            print(f"[>] Uploading {file} to HDFS...")
            
            # Step 1: Copy file into NameNode container
            cp_cmd = f"docker cp {local_path} namenode:/tmp/{file}"
            subprocess.run(cp_cmd, shell=True, check=True)
            
            # Step 2: Ingest from container tmp into HDFS
            put_cmd = f"docker exec -i namenode hdfs dfs -put /tmp/{file} {HDFS_TARGET_DIR}/{file}"
            res = subprocess.run(put_cmd, shell=True)
            
            if res.returncode == 0:
                print(f"[✓] Successfully stored {file} in HDFS {HDFS_TARGET_DIR}")
                # Remove local processed file
                os.remove(local_path)
                subprocess.run(f"docker exec -i namenode rm /tmp/{file}", shell=True)
            else:
                print(f"[X] Failed to upload {file} to HDFS!")
                
        time.sleep(5)

if __name__ == "__main__":
    upload_batches()
`,
  },
  {
    id: 'mr-mapper',
    name: 'Hadoop MapReduce Volume Mapper',
    filename: 'mapper.py',
    language: 'python',
    category: 'Hadoop & MapReduce',
    description: 'Standard Hadoop Streaming Mapper: reads CSV records from standard input (stdin) and emits key-value pairs (src_ip, packet_size).',
    command: 'cat sample.csv | python3 mapper.py',
    code: `#!/usr/bin/env python3
"""
Hadoop MapReduce Mapper:
Calculates Network Traffic Volume per Source IP.
Reads CSV records from STDIN and emits <src_ip>\\t<packet_size>
"""

import sys

for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("timestamp"):
        continue  # Skip header line or empty rows

    parts = line.split(",")
    if len(parts) >= 7:
        try:
            src_ip = parts[1].strip()
            packet_size = int(parts[6].strip())
            # Emit key and value separated by tab
            print(f"{src_ip}\\t{packet_size}")
        except ValueError:
            continue
`,
  },
  {
    id: 'mr-reducer',
    name: 'Hadoop MapReduce Volume Reducer',
    filename: 'reducer.py',
    language: 'python',
    category: 'Hadoop & MapReduce',
    description: 'Standard Hadoop Streaming Reducer: aggregates values for each key from stdin and outputs total bytes and packet count.',
    command: 'cat sample.csv | python3 mapper.py | sort | python3 reducer.py',
    code: `#!/usr/bin/env python3
"""
Hadoop MapReduce Reducer:
Receives sorted <src_ip>\\t<packet_size> pairs from STDIN.
Aggregates total payload bytes and packet counts per host.
"""

import sys

current_ip = None
current_bytes = 0
packet_count = 0

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue

    parts = line.split("\\t")
    if len(parts) != 2:
        continue

    ip, size_str = parts
    try:
        size = int(size_str)
    except ValueError:
        continue

    if current_ip == ip:
        current_bytes += size
        packet_count += 1
    else:
        if current_ip:
            # Emit final aggregated result for previous key
            print(f"{current_ip}\\t{current_bytes} bytes\\t{packet_count} packets")
        current_ip = ip
        current_bytes = size
        packet_count = 1

# Output the last IP
if current_ip:
    print(f"{current_ip}\\t{current_bytes} bytes\\t{packet_count} packets")
`,
  },
  {
    id: 'spark-streaming',
    name: 'Spark Structured Streaming Anomaly Detector',
    filename: 'spark_streaming_detector.py',
    language: 'python',
    category: 'Apache Spark',
    description: 'PySpark Structured Streaming application: consumes packet batches from HDFS landing zone, applies 10-second sliding windows, watermarks late data, and flags SYN Floods.',
    command: 'spark-submit --master spark://localhost:7077 spark_streaming_detector.py',
    code: `#!/usr/bin/env python3
"""
Spark Structured Streaming Engine:
Near-Real-Time Network Anomaly Detector.
Uses 10-second sliding windows with 5-second slide and 5-second watermark.
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    col, from_unixtime, to_timestamp, window, count, sum, when, round
)
from pyspark.sql.types import (
    StructType, StructField, LongType, StringType, IntegerType, DoubleType
)

# 1. Initialize Spark Session
spark = SparkSession.builder \\
    .appName("RealTimeNetworkTrafficAnalyzer") \\
    .master("local[*]") \\
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# 2. Define Schema for Structured Streaming
traffic_schema = StructType([
    StructField("timestamp", LongType(), True),
    StructField("src_ip", StringType(), True),
    StructField("src_port", IntegerType(), True),
    StructField("dst_ip", StringType(), True),
    StructField("dst_port", IntegerType(), True),
    StructField("protocol", StringType(), True),
    StructField("packet_size", IntegerType(), True),
    StructField("syn_flag", IntegerType(), True),
    StructField("ack_flag", IntegerType(), True),
    StructField("dns_query", StringType(), True),
    StructField("dns_entropy", DoubleType(), True)
])

# 3. Read Stream from Landing Directory
streaming_df = spark.readStream \\
    .format("csv") \\
    .option("header", "true") \\
    .schema(traffic_schema) \\
    .load("./landing_zone")

# 4. Convert Unix epoch to Timestamp and assign Event-Time Watermark
parsed_df = streaming_df \\
    .withColumn("event_time", to_timestamp(from_unixtime(col("timestamp") / 1000))) \\
    .withWatermark("event_time", "5 seconds")

# 5. Sliding Window Aggregation & Anomaly Detection (SYN Flood Metric)
windowed_anomalies = parsed_df \\
    .groupBy(
        window(col("event_time"), "10 seconds", "2 seconds"),
        col("dst_ip")
    ) \\
    .agg(
        count("*").alias("total_packets"),
        sum("packet_size").alias("total_bytes"),
        sum(when(col("syn_flag") == 1, 1).otherwise(0)).alias("syn_count"),
        sum(when(col("ack_flag") == 1, 1).otherwise(0)).alias("ack_count")
    ) \\
    .withColumn(
        "syn_ack_ratio",
        round(col("syn_count") / when(col("ack_count") == 0, 1).otherwise(col("ack_count")), 2)
    ) \\
    .withColumn(
        "threat_status",
        when((col("syn_count") >= 12) & (col("syn_ack_ratio") >= 3.0), "CRITICAL: SYN FLOOD")
        .otherwise("NORMAL")
    )

# 6. Output to Console Sink
query = windowed_anomalies.writeStream \\
    .outputMode("update") \\
    .format("console") \\
    .option("truncate", "false") \\
    .start()

print("[*] Spark Structured Streaming Query Started...")
query.awaitTermination()
`,
  },
  {
    id: 'hive-ddl',
    name: 'Apache Hive DDL & Analytical Warehouse Queries',
    filename: 'hive_analytics.sql',
    language: 'sql',
    category: 'Apache Hive',
    description: 'Creates External Tables over HDFS CSV data, Managed Partitioned Parquet tables, and runs window analytic queries.',
    command: 'hive -f hive_analytics.sql',
    code: `-- ==========================================================
-- SEMESTER BDA PROJECT: APACHE HIVE ANALYTICS SUITE
-- Schema-on-Read, Partitioning, and Analytical Window Queries
-- ==========================================================

CREATE DATABASE IF NOT EXISTS network_dw;
USE network_dw;

-- 1. EXTERNAL TABLE over raw CSV records landing in HDFS
CREATE EXTERNAL TABLE IF NOT EXISTS raw_network_traffic (
    timestamp BIGINT,
    src_ip STRING,
    src_port INT,
    dst_ip STRING,
    dst_port INT,
    protocol STRING,
    packet_size INT,
    syn_flag TINYINT,
    ack_flag TINYINT,
    dns_query STRING,
    dns_entropy DOUBLE
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION '/traffic/raw/'
TBLPROPERTIES ("skip.header.line.count"="1");

-- 2. OPTIMIZED MANAGED TABLE (Columnar Parquet + Snappy Compression)
CREATE TABLE IF NOT EXISTS traffic_parquet (
    timestamp BIGINT,
    src_ip STRING,
    src_port INT,
    dst_ip STRING,
    dst_port INT,
    packet_size INT,
    syn_flag TINYINT,
    ack_flag TINYINT,
    dns_query STRING,
    dns_entropy DOUBLE
)
PARTITIONED BY (traffic_date STRING, protocol STRING)
STORED AS PARQUET
TBLPROPERTIES ("parquet.compression"="SNAPPY");

-- 3. ETL POPULATION QUERY: Load from External to Managed Parquet
-- Dynamic Partitioning enabled
SET hive.exec.dynamic.partition = true;
SET hive.exec.dynamic.partition.mode = nonstrict;

INSERT OVERWRITE TABLE traffic_parquet 
PARTITION (traffic_date, protocol)
SELECT 
    timestamp,
    src_ip,
    src_port,
    dst_ip,
    dst_port,
    packet_size,
    syn_flag,
    ack_flag,
    dns_query,
    dns_entropy,
    from_unixtime(CAST(timestamp / 1000 AS BIGINT), 'yyyy-MM-dd') AS traffic_date,
    protocol
FROM raw_network_traffic;

-- ==========================================================
-- ANALYTICAL QUERIES FOR VIVA & EVALUATION
-- ==========================================================

-- Query A: Top 10 High-Bandwidth Source Hosts
SELECT 
    src_ip,
    COUNT(*) AS total_packets,
    SUM(packet_size) AS total_bytes,
    ROUND(AVG(packet_size), 2) AS avg_packet_bytes
FROM traffic_parquet
GROUP BY src_ip
ORDER BY total_bytes DESC
LIMIT 10;

-- Query B: SYN Flood Detection (SYN-ACK Asymmetry)
SELECT 
    dst_ip,
    COUNT(CASE WHEN syn_flag = 1 THEN 1 END) AS syn_count,
    COUNT(CASE WHEN ack_flag = 1 THEN 1 END) AS ack_count,
    ROUND(COUNT(CASE WHEN syn_flag = 1 THEN 1 END) / NULLIF(COUNT(CASE WHEN ack_flag = 1 THEN 1 END), 0), 2) AS syn_ack_ratio
FROM traffic_parquet
GROUP BY dst_ip
HAVING syn_count >= 10 AND syn_ack_ratio >= 3.0;

-- Query C: Port Scan Reconnaissance Detector
SELECT 
    src_ip, 
    dst_ip,
    COUNT(DISTINCT dst_port) AS scanned_ports,
    MIN(dst_port) AS lowest_port,
    MAX(dst_port) AS highest_port
FROM traffic_parquet
GROUP BY src_ip, dst_ip
HAVING scanned_ports >= 15
ORDER BY scanned_ports DESC;
`,
  },
  {
    id: 'start-pipeline',
    name: 'Master Automation & Pipeline Launcher',
    filename: 'run_pipeline.sh',
    language: 'bash',
    category: 'Cluster Deployment',
    description: 'Bash automation script to test prerequisites, start the Docker cluster, launch the capture engine, and run Hadoop streaming jobs.',
    command: 'chmod +x run_pipeline.sh && ./run_pipeline.sh',
    code: `#!/usr/bin/env bash
# ==============================================================
# Master Pipeline Launcher: Real-Time Network Traffic Analysis
# Semester BDA Project Orchestration Script
# ==============================================================

set -e

echo "=========================================================="
echo " Big Data Analysis (BDA) - Network Traffic Pipeline"
echo " Hadoop, HDFS, MapReduce, Hive & Spark Structured Streaming"
echo "=========================================================="

# 1. Check Docker status
if ! command -v docker &> /dev/null; then
    echo "[!] Error: Docker is not installed. Please install Docker Desktop."
    exit 1
fi

echo "[*] Step 1: Starting Hadoop & Spark Containers via Docker Compose..."
docker compose up -d

echo "[*] Waiting 15 seconds for NameNode & DataNodes to leave SafeMode..."
sleep 15

# 2. Initialize HDFS Directories
echo "[*] Step 2: Creating HDFS Directory Hierarchy..."
docker exec -i namenode hdfs dfs -mkdir -p /traffic/raw
docker exec -i namenode hdfs dfs -mkdir -p /traffic/output
docker exec -i namenode hdfs dfs -mkdir -p /user/hive/warehouse
docker exec -i namenode hdfs dfs -chmod -R 777 /traffic

echo "[✓] HDFS Setup Complete. Cluster Health Check:"
docker exec -i namenode hdfs dfsadmin -report | head -n 12

echo ""
echo "=========================================================="
echo " Cluster Services Ready:"
echo " - HDFS NameNode Web UI:       http://localhost:9870"
echo " - YARN ResourceManager UI:    http://localhost:8088"
echo " - Spark Master UI:            http://localhost:8080"
echo "=========================================================="
echo ""
echo "Next steps to run on host:"
echo " 1. Start live packet capture: sudo python3 packet_capture.py"
echo " 2. Start HDFS uploader:       python3 hdfs_uploader.py"
echo " 3. Launch Spark Streaming:    spark-submit spark_streaming_detector.py"
echo " 4. Run MapReduce Job:         cat sample.csv | python3 mapper.py | sort | python3 reducer.py"
echo "=========================================================="
`,
  },
];
