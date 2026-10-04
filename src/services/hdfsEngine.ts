import { DataNodeInfo, HDFSBlock, HDFSFile, NameNodeStatus } from '../types/network';

export class HDFSEngine {
  private nameNodeStatus: NameNodeStatus = {
    status: 'ACTIVE',
    safeMode: false,
    fsimageVersion: '2026-10-04-12.0.1-rev94',
    editsLogTransactionId: 10452,
    heapMemoryUsedMb: 1420,
    heapMemoryMaxMb: 4096,
    totalBlocks: 48,
    totalFiles: 14,
    missingBlocks: 0,
    underReplicatedBlocks: 0,
  };

  private dataNodes: DataNodeInfo[] = [
    {
      id: 'dn-01',
      name: 'datanode-01.hadoop.local',
      rack: '/rack-1',
      ip: '10.0.1.101',
      status: 'HEALTHY',
      totalCapacityBytes: 500 * 1024 * 1024 * 1024, // 500 GB
      usedCapacityBytes: 142 * 1024 * 1024 * 1024, // 142 GB
      blockCount: 48,
      lastHeartbeatSec: 2,
    },
    {
      id: 'dn-02',
      name: 'datanode-02.hadoop.local',
      rack: '/rack-1',
      ip: '10.0.1.102',
      status: 'HEALTHY',
      totalCapacityBytes: 500 * 1024 * 1024 * 1024,
      usedCapacityBytes: 139 * 1024 * 1024 * 1024,
      blockCount: 48,
      lastHeartbeatSec: 1,
    },
    {
      id: 'dn-03',
      name: 'datanode-03.hadoop.local',
      rack: '/rack-2',
      ip: '10.0.2.101',
      status: 'HEALTHY',
      totalCapacityBytes: 500 * 1024 * 1024 * 1024,
      usedCapacityBytes: 145 * 1024 * 1024 * 1024,
      blockCount: 48,
      lastHeartbeatSec: 3,
    },
  ];

  private files: Record<string, HDFSFile> = {
    '/': {
      path: '/',
      name: '/',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728, // 128 MB
      owner: 'hdfs',
      group: 'supergroup',
      permissions: 'drwxr-xr-x',
      modificationTime: '2026-10-04 09:00:00',
      blocks: [],
    },
    '/traffic': {
      path: '/traffic',
      name: 'traffic',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728,
      owner: 'bda_student',
      group: 'hadoop',
      permissions: 'drwxr-xr-x',
      modificationTime: '2026-10-04 09:05:00',
      blocks: [],
    },
    '/traffic/raw': {
      path: '/traffic/raw',
      name: 'raw',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728,
      owner: 'bda_student',
      group: 'hadoop',
      permissions: 'drwxr-xr-x',
      modificationTime: '2026-10-04 09:10:00',
      blocks: [],
    },
    '/traffic/raw/packets_stream_20261004.csv': {
      path: '/traffic/raw/packets_stream_20261004.csv',
      name: 'packets_stream_20261004.csv',
      isDirectory: false,
      sizeBytes: 314572800, // ~300 MB (Requires 3 blocks of 128MB)
      replicationFactor: 3,
      blockSizeBytes: 134217728, // 128 MB
      owner: 'bda_student',
      group: 'hadoop',
      permissions: '-rw-r--r--',
      modificationTime: '2026-10-04 09:45:12',
      blocks: [
        {
          blockId: 'blk_1073741825_1001',
          sizeBytes: 134217728,
          replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
          blockChecksum: 'sha256-8f4b1a3d',
        },
        {
          blockId: 'blk_1073741826_1002',
          sizeBytes: 134217728,
          replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
          blockChecksum: 'sha256-4c9e7b21',
        },
        {
          blockId: 'blk_1073741827_1003',
          sizeBytes: 46137344,
          replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
          blockChecksum: 'sha256-2e1a90f5',
        },
      ],
      previewContent: `timestamp,src_ip,src_port,dst_ip,dst_port,protocol,packet_size,syn_flag,ack_flag,payload
1764835200100,192.168.1.105,54120,142.250.190.46,443,HTTPS,1280,0,1,TLSv1.3 Application Data
1764835200105,198.51.100.77,45210,192.168.1.105,80,TCP,64,1,0,[SYN] Seq=0 Win=1024
1764835200110,198.51.100.77,45210,192.168.1.105,81,TCP,64,1,0,[SYN] Seq=0 Win=1024
1764835200115,192.168.1.105,53120,8.8.8.8,53,DNS,142,0,0,Standard query A registry.npmjs.org
1764835200120,192.168.1.105,59410,157.240.22.35,443,HTTPS,940,0,1,TLSv1.3 Encrypted Record`,
    },
    '/traffic/processed': {
      path: '/traffic/processed',
      name: 'processed',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728,
      owner: 'bda_student',
      group: 'hadoop',
      permissions: 'drwxr-xr-x',
      modificationTime: '2026-10-04 09:20:00',
      blocks: [],
    },
    '/traffic/processed/traffic_parquet': {
      path: '/traffic/processed/traffic_parquet',
      name: 'traffic_parquet',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728,
      owner: 'hive',
      group: 'hive',
      permissions: 'drwxrwxr-x',
      modificationTime: '2026-10-04 09:30:00',
      blocks: [],
    },
    '/traffic/processed/traffic_parquet/part-00000.snappy.parquet': {
      path: '/traffic/processed/traffic_parquet/part-00000.snappy.parquet',
      name: 'part-00000.snappy.parquet',
      isDirectory: false,
      sizeBytes: 67108864, // 64 MB Snappy compressed
      replicationFactor: 3,
      blockSizeBytes: 134217728,
      owner: 'hive',
      group: 'hive',
      permissions: '-rw-r--r--',
      modificationTime: '2026-10-04 09:32:00',
      blocks: [
        {
          blockId: 'blk_1073741830_1006',
          sizeBytes: 67108864,
          replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
          blockChecksum: 'sha256-parquet-772b',
        },
      ],
      previewContent: `[PARQUET BINARY METADATA: Snappy Compressed Columnar Store]
Schema:
  optional int64 timestamp;
  optional binary src_ip (STRING);
  optional int32 src_port;
  optional binary dst_ip (STRING);
  optional int32 dst_port;
  optional binary protocol (STRING);
  optional int32 packet_size;
  optional boolean is_anomaly;
Row Groups: 4 | Columns: 8 | Compression: SNAPPY (Ratio: 4.6x vs CSV)`,
    },
    '/traffic/anomalies': {
      path: '/traffic/anomalies',
      name: 'anomalies',
      isDirectory: true,
      sizeBytes: 0,
      replicationFactor: 0,
      blockSizeBytes: 134217728,
      owner: 'spark',
      group: 'hadoop',
      permissions: 'drwxrwxr-x',
      modificationTime: '2026-10-04 09:40:00',
      blocks: [],
    },
    '/traffic/anomalies/alerts.json': {
      path: '/traffic/anomalies/alerts.json',
      name: 'alerts.json',
      isDirectory: false,
      sizeBytes: 12582912, // 12 MB
      replicationFactor: 3,
      blockSizeBytes: 134217728,
      owner: 'spark',
      group: 'hadoop',
      permissions: '-rw-rw-r--',
      modificationTime: '2026-10-04 09:48:00',
      blocks: [
        {
          blockId: 'blk_1073741835_1011',
          sizeBytes: 12582912,
          replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
          blockChecksum: 'sha256-alert-049a',
        },
      ],
      previewContent: `{"timestamp":1764835200000,"type":"SYN_FLOOD","severity":"CRITICAL","src_ip":"198.51.100.77","dst_ip":"192.168.1.105","ratio":18.4}
{"timestamp":1764835201200,"type":"PORT_SCAN","severity":"HIGH","src_ip":"198.51.100.77","ports_scanned":45}
{"timestamp":1764835202400,"type":"DNS_TUNNELING","severity":"CRITICAL","query":"exfil_4a9b.c2.io","entropy":3.92}`,
    },
  };

  public getNameNodeStatus(): NameNodeStatus {
    return this.nameNodeStatus;
  }

  public getDataNodes(): DataNodeInfo[] {
    return this.dataNodes;
  }

  public getFiles(parentPath = '/'): HDFSFile[] {
    const parentNormalized = parentPath === '/' ? '/' : parentPath.replace(/\/$/, '');
    return Object.values(this.files).filter(file => {
      if (file.path === parentNormalized) return false;
      const fileDir = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
      return fileDir === parentNormalized;
    });
  }

  public getFile(path: string): HDFSFile | undefined {
    return this.files[path];
  }

  public addRawBatchFile(name: string, content: string, sizeBytes: number) {
    const path = `/traffic/raw/${name}`;
    const blockSize = 134217728; // 128 MB
    const numBlocks = Math.ceil(sizeBytes / blockSize) || 1;
    const blocks: HDFSBlock[] = [];

    for (let i = 0; i < numBlocks; i++) {
      const blockId = `blk_${Date.now()}_${i + 1}`;
      blocks.push({
        blockId,
        sizeBytes: Math.min(blockSize, sizeBytes - i * blockSize),
        replicaNodes: ['dn-01', 'dn-02', 'dn-03'],
        blockChecksum: `sha256-${Math.random().toString(36).substring(2, 8)}`,
      });
    }

    const newFile: HDFSFile = {
      path,
      name,
      isDirectory: false,
      sizeBytes,
      replicationFactor: 3,
      blockSizeBytes: blockSize,
      owner: 'bda_student',
      group: 'hadoop',
      permissions: '-rw-r--r--',
      modificationTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      blocks,
      previewContent: content,
    };

    this.files[path] = newFile;
    this.nameNodeStatus.totalFiles++;
    this.nameNodeStatus.totalBlocks += numBlocks;
    this.nameNodeStatus.editsLogTransactionId++;
    return newFile;
  }

  public executeCommand(cmd: string): { output: string; exitCode: number } {
    const trimmed = cmd.trim();
    if (!trimmed) return { output: '', exitCode: 0 };

    if (trimmed === 'hdfs dfsadmin -report') {
      let out = `Configured Capacity: 1.50 TB\n`;
      out += `Present Capacity: 1.50 TB\n`;
      out += `DFS Remaining: 1.07 TB (71.3%)\n`;
      out += `DFS Used: 426.00 GB (28.7%)\n`;
      out += `Under replicated blocks: 0\n`;
      out += `Blocks with corrupt replicas: 0\n`;
      out += `Missing blocks: 0\n\n`;
      out += `-------------------------------------------------\n`;
      out += `Live datanodes (3):\n\n`;
      this.dataNodes.forEach(dn => {
        out += `Name: ${dn.name} (${dn.ip})\n`;
        out += `Rack: ${dn.rack}\n`;
        out += `Status: ${dn.status} (Last heartbeat: ${dn.lastHeartbeatSec}s ago)\n`;
        out += `Capacity: 500.00 GB\n`;
        out += `DFS Used: ${(dn.usedCapacityBytes / (1024 ** 3)).toFixed(2)} GB\n`;
        out += `Blocks: ${dn.blockCount}\n\n`;
      });
      return { output: out, exitCode: 0 };
    }

    if (trimmed === 'hdfs fsck /') {
      return {
        output: `Connecting to NameNode at /0.0.0.0:9000
FSCK started by bda_student (auth:SIMPLE) from /127.0.0.1 for path / at ${new Date().toISOString()}

Status: HEALTHY
 Number of data-nodes: 3
 Number of racks: 2
 Total dirs: 5
 Total files: ${this.nameNodeStatus.totalFiles}
 Total symlinks: 0
 Total blocks (validated): ${this.nameNodeStatus.totalBlocks} (avg. block size 128MB)
 Minimally replicated blocks: ${this.nameNodeStatus.totalBlocks} (100.00 %)
 Over-replicated blocks: 0 (0.0 %)
 Under-replicated blocks: 0 (0.0 %)
 Mis-replicated blocks: 0 (0.0 %)
 Default replication factor: 3
 Average block replication: 3.0
 Missing blocks: 0
 Corrupt blocks: 0
 Missing replicas: 0 (0.0 %)

The filesystem under path '/' is HEALTHY`,
        exitCode: 0,
      };
    }

    if (trimmed.startsWith('hdfs dfs -ls')) {
      const parts = trimmed.split(/\s+/);
      const targetPath = parts[3] || '/';
      const files = this.getFiles(targetPath);
      if (files.length === 0 && !this.files[targetPath]) {
        return { output: `ls: '${targetPath}': No such file or directory`, exitCode: 1 };
      }
      let out = `Found ${files.length} items\n`;
      files.forEach(f => {
        const size = f.isDirectory ? '-' : f.sizeBytes;
        out += `${f.permissions}   ${f.isDirectory ? '-' : f.replicationFactor} ${f.owner.padEnd(10)} ${f.group.padEnd(10)} ${String(size).padStart(12)} ${f.modificationTime} ${f.path}\n`;
      });
      return { output: out, exitCode: 0 };
    }

    if (trimmed.startsWith('hdfs dfs -cat')) {
      const parts = trimmed.split(/\s+/);
      const targetPath = parts[3];
      const file = this.getFile(targetPath);
      if (!file) {
        return { output: `cat: '${targetPath}': No such file or directory`, exitCode: 1 };
      }
      if (file.isDirectory) {
        return { output: `cat: '${targetPath}': Is a directory`, exitCode: 1 };
      }
      return { output: file.previewContent || '[Binary or Parquet stream]', exitCode: 0 };
    }

    if (trimmed.startsWith('hdfs dfs -du -h')) {
      const parts = trimmed.split(/\s+/);
      const targetPath = parts[4] || '/';
      const files = this.getFiles(targetPath);
      let out = '';
      files.forEach(f => {
        const mb = (f.sizeBytes / (1024 * 1024)).toFixed(1);
        const replicatedMb = ((f.sizeBytes * (f.replicationFactor || 1)) / (1024 * 1024)).toFixed(1);
        out += `${mb} M  ${replicatedMb} M  ${f.path}\n`;
      });
      return { output: out || `0 M  0 M  ${targetPath}`, exitCode: 0 };
    }

    return {
      output: `Command executed: ${trimmed}\n(Supported simulator commands: 'hdfs dfsadmin -report', 'hdfs fsck /', 'hdfs dfs -ls <path>', 'hdfs dfs -cat <path>', 'hdfs dfs -du -h <path>')`,
      exitCode: 0,
    };
  }
}

export const globalHDFSEngine = new HDFSEngine();
