export interface VivaQuestion {
  id: string;
  topic: 'Hadoop & HDFS' | 'MapReduce Mechanics' | 'Apache Hive' | 'Apache Spark' | 'System Architecture' | 'Anomaly Detection';
  question: string;
  shortAnswer: string;
  deepExplanation: string;
  curriculumKeyPoint: string;
}

export const VIVA_QUESTIONS: VivaQuestion[] = [
  {
    id: 'viva-1',
    topic: 'System Architecture',
    question: 'Why does this project use both Hadoop MapReduce and Spark Structured Streaming instead of just Hadoop?',
    shortAnswer: 'Hadoop MapReduce is fundamentally a high-throughput batch processing engine with high latency due to disk I/O, whereas Spark Structured Streaming is designed for near-real-time micro-batch stream processing.',
    deepExplanation: `Hadoop MapReduce persists all intermediate state to local disk between Map and Reduce phases. A typical MapReduce job takes at least 15-30 seconds just to negotiate YARN containers, launch JVMs, and write spill files to disk. Network packet arrival is a continuous, sub-second stream. 
In our architecture:
1. Speed Layer (Spark Structured Streaming): Ingests micro-batches every 2-5 seconds in memory, watermarks late packets, and flags immediate attacks (like active SYN floods) with sub-second latency.
2. Batch Layer (Hadoop HDFS + MapReduce + Hive): Aggregates gigabytes/terabytes of historical network logs across days/months, running comprehensive audit jobs, baseline profiling, and deep aggregations where high throughput and fault tolerance matter more than latency.`,
    curriculumKeyPoint: 'Lambda Architecture: Speed Layer (Spark Streaming) + Batch Layer (Hadoop MapReduce/Hive) + Serving Layer (Dashboard).',
  },
  {
    id: 'viva-2',
    topic: 'Hadoop & HDFS',
    question: 'Why does HDFS use a default block size of 128 MB or 256 MB, unlike standard OS file systems with 4 KB blocks?',
    shortAnswer: 'To minimize disk seek time relative to transfer rate, and to prevent the NameNode memory from being exhausted by block metadata.',
    deepExplanation: `In traditional filesystems (ext4, NTFS), 4 KB blocks are ideal for small files. But in Big Data:
1. Disk Seek Time Optimization: Hard drive seek times average ~10ms, while transfer rates reach ~100MB/s. Setting block size to 128MB makes seek time only ~0.8% of transfer time, achieving 99% I/O throughput efficiency.
2. NameNode Memory Bottleneck: The HDFS NameNode holds all filesystem metadata in memory (RAM). Every file, directory, and block takes approximately 150 bytes of RAM. If a 1 TB dataset were stored in 4 KB blocks, it would require 250,000,000 blocks (~37.5 GB of NameNode RAM!). Storing it in 128 MB blocks requires only 8,000 blocks (~1.2 MB of RAM).`,
    curriculumKeyPoint: 'Seek-time-to-transfer ratio minimization & NameNode metadata scalability in RAM.',
  },
  {
    id: 'viva-3',
    topic: 'MapReduce Mechanics',
    question: 'Describe what happens during the MapReduce Shuffle and Sort phase. What is the role of the Partitioner and Combiner?',
    shortAnswer: 'Shuffle transfers map output data over the network to the assigned reducers based on the Partitioner, while Sort merges and groups values by key.',
    deepExplanation: `1. Combiner (Mini-Reducer): Runs locally on the Mapper node. It aggregates intermediate key-value pairs in memory before spilling to disk, drastically reducing network transmission bandwidth.
2. Partitioner: Determines which Reducer receives which key. Default is HashPartitioner: \`partition = (key.hashCode() & Integer.MAX_VALUE) % numReduceTasks\`. All identical keys are guaranteed to reach the same Reducer.
3. Shuffle: Reducers fetch their respective partition segments from all Mapper nodes across the network via HTTP.
4. Sort/Merge: The Reducer merges sorted runs from multiple mappers into an iterator of values for each unique key before calling reduce().`,
    curriculumKeyPoint: 'Map Output Buffer (100MB default, 80% spill threshold), HashPartitioner, and Sort-Merge phases.',
  },
  {
    id: 'viva-4',
    topic: 'Apache Hive',
    question: 'What is the fundamental difference between Schema-on-Read in Hive and Schema-on-Write in traditional RDBMS?',
    shortAnswer: 'RDBMS validates and indexes data upon insertion (Schema-on-Write). Hive stores raw files directly and only applies schema when parsing queries (Schema-on-Read).',
    deepExplanation: `1. Traditional RDBMS (Schema-on-Write): When you execute INSERT, the database checks column data types, null constraints, indexes, and writes into internal page formats. This makes ingestion slow for massive real-time network streams.
2. Apache Hive (Schema-on-Read): Network packets can be dumped directly into HDFS as raw CSV or Parquet files instantly (\`hdfs dfs -put\`). Hive simply reads the table schema from its Metastore when a HiveQL SELECT query is executed, parsing the text using the configured SerDe (Serializer/Deserializer).
3. External vs Managed: In our project, \`raw_network_traffic\` is an EXTERNAL table (dropping it does not delete HDFS files), whereas \`traffic_parquet\` is a MANAGED table stored in the Hive warehouse directory.`,
    curriculumKeyPoint: 'Schema-on-Read flexibility for raw data ingestion; SerDe architecture; External vs Managed Tables.',
  },
  {
    id: 'viva-5',
    topic: 'Apache Spark',
    question: 'How does Spark Structured Streaming handle late-arriving packets? Explain Watermarking.',
    shortAnswer: 'Watermarking establishes a moving threshold based on event-time, instructing the engine how late data can arrive before being discarded to bound state store size.',
    deepExplanation: `In network traffic analysis, packets may arrive out of order due to router jitter or buffer queues.
If we aggregate traffic in a 10-second window:
\`df.withWatermark("event_time", "5 seconds").groupBy(window("event_time", "10 seconds")).count()\`
Spark tracks the max event time seen so far. If max event time is \`12:00:15\`, the watermark is \`12:00:10\`.
Any packet with an event timestamp older than \`12:00:10\` is considered dropped.
Crucially, watermarking allows Spark to safely clear expired window aggregates from in-memory state stores, preventing OutOfMemory (OOM) crashes in long-running streaming apps.`,
    curriculumKeyPoint: 'Event-Time Processing vs Processing-Time; Bounded State Store Management via Watermarks.',
  },
  {
    id: 'viva-6',
    topic: 'Anomaly Detection',
    question: 'How are SYN Floods and DNS Tunneling algorithmically identified from packet features?',
    shortAnswer: 'SYN Flood is detected via TCP SYN-to-ACK asymmetry ratio (> 3.0:1), and DNS Tunneling is detected via query character length (> 35) and high Shannon entropy (> 3.6).',
    deepExplanation: `1. SYN Flood Detection: In a legitimate TCP 3-way handshake, every SYN is accompanied by a SYN-ACK or ACK. During a denial-of-service attack, an adversary spams half-open SYN packets from spoofed IPs. By aggregating counts over a sliding window, when \`COUNT(SYN) / COUNT(ACK) > 3.0\` with elevated volume, it indicates half-open socket exhaustion.
2. DNS Tunneling Detection: Attack tools like Iodine or DNSCat encode exfiltrated file chunks or C2 commands into DNS subdomain labels (e.g. \`7f8a9b1c.tunnel.attacker.com\`). Legitimate domain names have natural language redundancy and lower entropy (< 3.0). Encrypted/Base64 payloads produce high Shannon Entropy ($H = -\\sum p(x) \\log_2 p(x) \\ge 3.6$) and abnormally long labels (> 35 characters).`,
    curriculumKeyPoint: 'Statistical and heuristic feature engineering applied to distributed stream pipelines.',
  },
];
