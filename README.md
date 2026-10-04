# Real-Time Network Traffic Analysis Using Big Data

> **Semester Curriculum Project**  
> **Course:** Big Data Analysis (BDA)  
> **Target Platform:** Single-Node Laptop / Personal Computer (Linux, macOS, Windows WSL2)  
> **Core Technologies:** Apache Hadoop 3.3.6, HDFS, MapReduce, Apache Hive 3.1.3, Apache Spark 3.5.0, Python (Scapy, PySpark)

---

## 1. Project Overview

Modern computer networks generate continuous streams of high-velocity packets. Every website visit, file download, or API call creates network frames containing IP addresses, port numbers, flags, and payloads.

When network traffic is captured over days or months, log files grow into **tens of gigabytes (50 GB – 100 GB+)**. Traditional tools like Microsoft Excel, Python Pandas, or a single relational database (MySQL) freeze, run out of RAM, or crash when processing this volume of data.

This project implements a **Dual-Path Big Data Architecture** to solve this problem:
1. **Near-Real-Time Path (Speed Layer):** Uses **Apache Spark Structured Streaming** to inspect packet batches in memory every 2 seconds to immediately catch active attacks (like SYN Floods and Port Scans).
2. **Historical Batch Path (Batch Layer):** Uses **Hadoop HDFS, MapReduce, and Apache Hive** to store all traffic permanently in distributed blocks and run deep forensic queries on past traffic.

---

## 2. What is the Role of Hadoop in this Project?

### Why do we need Hadoop?
A standard laptop hard drive can easily fail, and a single CPU cannot process 50 GB of text records quickly. Hadoop solves both problems:

### Role 1: Distributed Storage (HDFS - Hadoop Distributed File System)
- **128 MB Block Allocation:** Instead of saving one massive 20 GB CSV file, HDFS cuts the file into standard 128 MB pieces (called blocks).
- **Fault Tolerance (Replication Factor = 3):** HDFS automatically makes 3 copies of every block and stores them on different DataNodes across different server racks. If a disk dies, no network traffic data is lost.
- **NameNode & DataNodes:** The **NameNode** acts as the directory bookkeeper (keeping track in RAM of where every block is located), while the **DataNodes** store the actual raw traffic bytes on disk.

### Role 2: Distributed Batch Processing (Hadoop MapReduce & Hive)
- **Moving Compute to Data:** Instead of copying 50 GB of network files over the network to your CPU, Hadoop sends small calculation code to where the data is already stored.
- **The Mapper:** Reads raw CSV lines from HDFS and emits key-value pairs:
  $$\text{Key} = \text{Source IP}, \quad \text{Value} = \text{Packet Size (Bytes)}$$
- **The Combiner:** Performs local mini-reduction on each mapper computer to minimize network shuffle bandwidth.
- **The Partitioner & Shuffle:** Distributes keys using $\text{hash}(\text{key}) \pmod{\text{numReducers}}$ so all records for the same IP address go to the exact same Reducer.
- **The Reducer:** Sums up the total bytes for each IP address to identify high-bandwidth consumers and rogue scanner IPs.
- **Apache Hive (Data Warehouse):** Uses **Schema-on-Read** to allow running standard SQL queries directly over raw HDFS files without writing complex Java MapReduce programs.

---

## 3. Crucial Architectural Rule: Hadoop vs. Spark

> **Important BDA Exam Point:**  
> **Do NOT claim that Hadoop MapReduce is used for real-time live alerts.**

| Feature | Hadoop MapReduce (Batch Layer) | Apache Spark Streaming (Speed Layer) |
| :--- | :--- | :--- |
| **Execution Model** | Disk-based batch processing | In-memory micro-batch streaming |
| **Typical Latency** | 15 seconds to 60+ seconds | 30 milliseconds to 2 seconds |
| **State Storage** | Intermediate spill files written to disk | In-memory RDD / DataFrame state stores |
| **Primary Project Role** | Permanent storage (HDFS), forensic audits, Hive queries | Near-real-time threat detection (SYN floods, port scans) |

---

## 4. Dual-Path Architecture Pipeline

```
                              ┌──────────────────────────────────────────────┐
                              │     Host Computer Network Interface          │
                              │       (Wi-Fi / Ethernet Adapter)             │
                              └──────────────────────┬───────────────────────┘
                                                     │
                                     [TShark / Scapy Packet Sniffer]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             │                                               │
               [PATH A: Near-Real-Time Stream]                [PATH B: Distributed Batch Storage]
                             │                                               │
                             ▼                                               ▼
             ┌───────────────────────────────┐               ┌───────────────────────────────┐
             │   Spark Structured Streaming  │               │   Hadoop HDFS Storage         │
             │   - 2.0s Micro-Batches        │               │   - 128 MB Block Splits       │
             │   - 5.0s Event-Time Watermark │               │   - Replication Factor = 3    │
             │   - Sliding Window Aggregates │               │   - NameNode & DataNodes      │
             └───────────────┬───────────────┘               └───────────────┬───────────────┘
                             │                                               │
                             ▼                                               ▼
             ┌───────────────────────────────┐               ┌───────────────────────────────┐
             │   Real-Time Anomaly Engine    │               │  MapReduce & Apache Hive      │
             │   - SYN-ACK Asymmetry Ratio   │               │   - Shuffle & Sort Partition  │
             │   - DNS Shannon Entropy       │               │   - Schema-on-Read            │
             │   - Rapid Port Sweep Detection│               │   - Columnar Snappy Parquet   │
             └───────────────┬───────────────┘               └───────────────┬───────────────┘
                             │                                               │
                             └───────────────────────┬───────────────────────┘
                                                     ▼
                                     ┌───────────────────────────────┐
                                     │     Interactive Dashboard     │
                                     │      (White/Black Telemetry)  │
                                     └───────────────────────────────┘
```

---

## 5. Repository Directory Layout

```
.
├── docker-compose.yml              # Single-node cluster (Hadoop 3.3.6 + Spark 3.5.0)
├── README.md                       # Master documentation & viva preparation guide
├── scripts/
│   ├── packet_capture.py           # Scapy live packet sniffer & CSV feature normalizer
│   ├── hdfs_uploader.py            # Automated HDFS batch landing daemon
│   ├── run_pipeline.sh             # Master launcher bash script
│   ├── mapreduce/
│   │   ├── mapper.py               # Hadoop Streaming Mapper (Volume per IP)
│   │   └── reducer.py              # Hadoop Streaming Reducer
│   ├── spark/
│   │   └── spark_streaming.py      # PySpark Structured Streaming anomaly detector
│   └── hive/
│       ├── create_tables.sql       # Schema-on-Read DDL (External CSV & Parquet)
│       └── analytical_queries.sql  # Benchmark analytical window queries
└── src/                            # Interactive BDA React Dashboard application
```

---

## 6. How to Run on Your Personal Computer

You do not need a multi-computer server cluster. This project runs on a standard laptop with **4 GB to 6 GB of RAM** using Docker containers.

### Step 1: Start the Hadoop & Spark Containers
```bash
docker compose up -d
```
Verify services are active:
- **HDFS NameNode UI:** [http://localhost:9870](http://localhost:9870)
- **YARN ResourceManager:** [http://localhost:8088](http://localhost:8088)
- **Spark Master UI:** [http://localhost:8080](http://localhost:8080)

### Step 2: Initialize HDFS Directories
```bash
docker exec -i namenode hdfs dfs -mkdir -p /traffic/raw
docker exec -i namenode hdfs dfs -mkdir -p /traffic/output
docker exec -i namenode hdfs dfs -mkdir -p /user/hive/warehouse
docker exec -i namenode hdfs dfs -chmod -R 777 /traffic
```

### Step 3: Run the Packet Sniffer (Python)
Captures raw packets from your network card (`eth0` or `wlan0`), extracts the 5-tuple, protocol flags, and writes micro-batch CSVs:
```bash
sudo python3 scripts/packet_capture.py
```

### Step 4: Run the HDFS Ingestion Daemon
Watches for completed CSV batches on your local drive and transfers them into HDFS `/traffic/raw/`:
```bash
python3 scripts/hdfs_uploader.py
```

### Step 5: Run the Spark Structured Streaming Detector
Applies 10-second sliding windows with a 5-second watermark delay to detect live attacks:
```bash
spark-submit scripts/spark/spark_streaming.py
```

### Step 6: Run Hadoop MapReduce Batch Jobs
Execute distributed batch processing using Hadoop Streaming:
```bash
cat sample_traffic.csv | python3 scripts/mapreduce/mapper.py | sort | python3 scripts/mapreduce/reducer.py
```
Or on the cluster:
```bash
docker exec -i resourcemanager hadoop jar \
  /opt/hadoop/share/hadoop/tools/lib/hadoop-streaming-*.jar \
  -input /traffic/raw/*.csv \
  -output /traffic/output/volume_per_ip \
  -mapper mapper.py \
  -reducer reducer.py
```

---

## 7. Anomaly Detection Algorithms

### 1. TCP SYN Flood (Denial of Service)
- **Technique:** MITRE ATT&CK T1498.001
- **Formula:** In legitimate traffic, every SYN is answered by an ACK. In an attack, attackers flood half-open SYNs from spoofed IPs.
$$\text{Ratio} = \frac{\text{Count}(\text{TCP SYN})}{\max(1, \text{Count}(\text{TCP ACK}))} \ge 3.0 \quad \text{and} \quad \text{Count}(\text{SYN}) \ge 12$$
- **Mitigation:**
```bash
iptables -A INPUT -p tcp --dport 80 --syn -m limit --limit 5/s --limit-burst 10 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 --syn -j DROP
```

### 2. Port Scan Reconnaissance (Nmap / Masscan)
- **Technique:** MITRE ATT&CK T1046
- **Algorithm:** Tracks unique destination ports contacted per source IP over a sliding 8-second window.
$$\text{Distinct}(\text{Destination Ports touched by Source IP}) \ge 15$$
- **Mitigation:**
```bash
iptables -I INPUT -s 198.51.100.77 -j DROP
```

### 3. DNS Tunneling & Covert Exfiltration
- **Technique:** MITRE ATT&CK T1048.003
- **Algorithm:** Calculates **Shannon Entropy** ($H$) on DNS domain query labels. Normal human-readable domains have low entropy ($< 3.0$). Encrypted or Base64 payloads have high randomness:
$$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i) \ge 3.6 \quad \text{and} \quad \text{Query Length} \ge 35 \text{ chars}$$

---

## 8. Apache Hive Analytics (Schema-on-Read)

### External Table Definition (Raw CSV in HDFS)
```sql
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
```

### Managed Table (Columnar Parquet + Snappy Compression)
```sql
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
```

### Top Bandwidth Talkers Query
```sql
SELECT 
    src_ip, 
    COUNT(*) AS total_packets, 
    SUM(packet_size) AS total_bytes,
    ROUND(AVG(packet_size), 2) AS avg_packet_bytes
FROM traffic_parquet
GROUP BY src_ip
ORDER BY total_bytes DESC
LIMIT 10;
```

---

## 9. Top 10 BDA Viva Questions & Model Answers

### Q1: What is the primary role of Hadoop in this project?
**Answer:** Hadoop provides two core functions: (1) **HDFS** acts as the distributed storage layer, dividing raw packet data into 128 MB blocks with 3x replication across nodes. (2) **MapReduce and Hive** act as the distributed batch computation layer, calculating traffic statistics and long-term bandwidth patterns.

### Q2: Why can't we use Hadoop MapReduce for real-time network attack alerts?
**Answer:** Hadoop MapReduce is fundamentally a batch processing engine. Between the Map and Reduce phases, it writes intermediate spill files to hard disks and requires 15 to 30 seconds to launch JVM containers. Network attacks happen in milliseconds. We use Apache Spark Structured Streaming for near-real-time 2-second in-memory detection, while Hadoop stores historical logs permanently.

### Q3: Why does HDFS use 128 MB blocks instead of the 4 KB blocks used by operating systems?
**Answer:** For two reasons: (1) **Disk seek time vs. transfer time:** Seeking on a hard disk takes ~10ms. A 128 MB block makes seek time less than 1% of the transfer time, giving 99% throughput. (2) **NameNode RAM memory limit:** Every file and block metadata takes ~150 bytes in NameNode RAM. Using 4 KB blocks would exhaust NameNode memory rapidly; 128 MB blocks keep metadata small.

### Q4: What is the difference between Schema-on-Read and Schema-on-Write?
**Answer:** Traditional databases (MySQL) use **Schema-on-Write**, checking column types and constraints during insertion, which slows down packet ingestion. Apache Hive uses **Schema-on-Read**, where raw packet CSVs are saved directly into HDFS instantly, and the schema is only applied when the user runs a SELECT query.

### Q5: What is the role of the Combiner in MapReduce?
**Answer:** The Combiner is a "mini-reducer" that runs locally on the Mapper computer before data is sent across the network. It aggregates intermediate pairs (such as summing bytes per IP locally), which drastically reduces network congestion during the Shuffle phase.

### Q6: What does the Partitioner do in MapReduce?
**Answer:** The Partitioner decides which Reducer gets which key. The default is `HashPartitioner`, which calculates $\text{hash}(\text{key}) \pmod{\text{number of reducers}}$. This guarantees that all packets for a specific IP address always arrive at the exact same Reducer.

### Q7: What is Watermarking in Spark Structured Streaming?
**Answer:** Watermarking defines how late data can arrive before being ignored. In network streaming, packets can arrive out of order due to router jitter. If we set a 5-second watermark, Spark keeps state in memory for 5 seconds after the window ends, then clears the state to prevent memory crashes (OutOfMemory errors).

### Q8: What is the difference between Managed Tables and External Tables in Hive?
**Answer:** Dropping an **External Table** deletes only the table metadata in the Metastore; the raw packet files in HDFS remain untouched. Dropping a **Managed Table** deletes both the metadata and the underlying HDFS files. In this project, `raw_network_traffic` is an External Table to safeguard captured packets.

### Q9: How does Parquet format improve query performance over CSV?
**Answer:** Parquet is a columnar storage format with Snappy compression. When a Hive query runs `SELECT src_ip, SUM(packet_size)`, Hive only reads the columns `src_ip` and `packet_size` from disk, skipping all other columns. This reduces disk I/O by up to 70%.

### Q10: What is the Lambda Architecture?
**Answer:** Lambda Architecture combines a **Speed Layer** (low latency, near-real-time stream processing with Spark) and a **Batch Layer** (high throughput, fault-tolerant batch storage with Hadoop HDFS and Hive) into a unified **Serving Layer** (interactive web dashboard).

---

## 10. License & Academic Attribution
This project was designed and built as a curriculum project for **Big Data Analysis (BDA)**, Department of Computer Engineering.
Released under the **MIT License**.
