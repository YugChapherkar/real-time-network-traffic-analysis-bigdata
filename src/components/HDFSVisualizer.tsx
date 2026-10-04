import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Folder, 
  FileText, 
  Terminal, 
  HardDrive
} from 'lucide-react';
import { globalHDFSEngine } from '../services/hdfsEngine';
import { HDFSFile } from '../types/network';

export const HDFSVisualizer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/traffic');
  const [selectedFile, setSelectedFile] = useState<HDFSFile | null>(null);
  const [terminalInput, setTerminalInput] = useState<string>('hdfs dfsadmin -report');
  const [terminalHistory, setTerminalHistory] = useState<{ cmd: string; output: string }[]>([
    {
      cmd: 'hdfs dfsadmin -report',
      output: globalHDFSEngine.executeCommand('hdfs dfsadmin -report').output,
    },
  ]);

  const nameNode = globalHDFSEngine.getNameNodeStatus();
  const dataNodes = globalHDFSEngine.getDataNodes();
  const filesInCurrentDir = globalHDFSEngine.getFiles(currentPath);

  const handleRunCommand = (cmdToRun?: string) => {
    const cmd = cmdToRun || terminalInput;
    if (!cmd.trim()) return;
    const res = globalHDFSEngine.executeCommand(cmd);
    setTerminalHistory(prev => [...prev.slice(-8), { cmd, output: res.output }]);
    setTerminalInput('');
  };

  return (
    <div className="space-y-6 bg-white text-black">
      {/* NameNode & Cluster Health Top Card */}
      <div className="p-4 border border-neutral-300 rounded-md bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-black" />
            <div>
              <span className="font-bold text-black text-sm uppercase tracking-wide">
                HDFS Cluster Architecture (Hadoop 3.3.6)
              </span>
              <div className="text-xs text-neutral-600 font-mono mt-0.5">
                NameNode: <span className="font-bold text-black">{nameNode.status}</span>
                <span className="mx-2 text-neutral-400">·</span>
                SafeMode: <span className="text-neutral-800">{nameNode.safeMode ? 'ON' : 'OFF (Normal Operation)'}</span>
                <span className="mx-2 text-neutral-400">·</span>
                Block Size: <span className="font-bold text-black">128 MB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="bg-neutral-100 border border-neutral-300 px-2.5 py-1 rounded">
              <span className="text-neutral-600">fsimage TxID:</span>{' '}
              <span className="font-bold text-black">{nameNode.editsLogTransactionId}</span>
            </div>
            <div className="bg-neutral-100 border border-neutral-300 px-2.5 py-1 rounded">
              <span className="text-neutral-600">Blocks:</span>{' '}
              <span className="font-bold text-black">{nameNode.totalBlocks}</span>
            </div>
          </div>
        </div>

        {/* DataNodes Topology Cards with Rack-Awareness */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {dataNodes.map(dn => {
            const usedGb = (dn.usedCapacityBytes / (1024 ** 3)).toFixed(1);
            const totalGb = (dn.totalCapacityBytes / (1024 ** 3)).toFixed(0);
            const pct = Math.round((dn.usedCapacityBytes / dn.totalCapacityBytes) * 100);

            return (
              <div key={dn.id} className="p-3.5 rounded-md bg-neutral-50 border border-neutral-300 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-black" />
                    <span className="font-bold text-black font-mono">{dn.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-neutral-800 border border-neutral-300">
                    {dn.rack}
                  </span>
                </div>

                <div className="text-xs font-mono text-neutral-700 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>IP / Port:</span>
                    <span className="font-medium text-black">{dn.ip}:9864</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heartbeat:</span>
                    <span className="font-medium text-black">{dn.lastHeartbeatSec}s ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Replicas:</span>
                    <span className="font-bold text-black">{dn.blockCount} blocks</span>
                  </div>
                </div>

                {/* Storage Bar */}
                <div className="pt-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-600 mb-1">
                    <span>DFS Used: {usedGb} GB</span>
                    <span className="font-semibold text-black">{pct}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-black h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HDFS File System Explorer & Block Allocator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* File Browser */}
        <div className="p-4 rounded-md border border-neutral-300 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-black" />
              <span className="font-bold text-xs uppercase tracking-wide text-black">
                HDFS File Hierarchy
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              {['/', '/traffic', '/traffic/raw'].map((p) => (
                <button
                  key={p}
                  onClick={() => { setCurrentPath(p); setSelectedFile(null); }}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer border ${
                    currentPath === p
                      ? 'bg-black text-white border-black font-bold'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 hover:text-black border-neutral-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-mono text-neutral-600 flex items-center gap-1">
            <span>Location:</span>
            <span className="font-bold text-black">{currentPath}</span>
          </div>

          <div className="border border-neutral-300 rounded-md bg-white divide-y divide-neutral-200 max-h-64 overflow-y-auto">
            {filesInCurrentDir.map(file => (
              <div
                key={file.path}
                onClick={() => {
                  if (file.isDirectory) {
                    setCurrentPath(file.path);
                    setSelectedFile(null);
                  } else {
                    setSelectedFile(file);
                  }
                }}
                className={`p-2.5 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                  selectedFile?.path === file.path 
                    ? 'bg-neutral-200 font-semibold text-black' 
                    : 'hover:bg-neutral-50 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {file.isDirectory ? (
                    <Folder className="w-4 h-4 text-neutral-700" />
                  ) : (
                    <FileText className="w-4 h-4 text-black" />
                  )}
                  <span>{file.name}</span>
                </div>
                <div className="flex items-center gap-4 text-neutral-500 text-[11px]">
                  <span>{file.isDirectory ? '<DIR>' : `${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}</span>
                  <span>r={file.replicationFactor || '-'}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedFile && (
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-300 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between font-bold text-black border-b border-neutral-200 pb-1">
                <span>Selected: {selectedFile.name}</span>
                <span>{(selectedFile.sizeBytes / (1024 * 1024)).toFixed(1)} MB (3x Replicated)</span>
              </div>
              <div className="text-neutral-600 text-[11px]">
                Permissions: {selectedFile.permissions} · Owner: {selectedFile.owner}:{selectedFile.group}
              </div>

              {/* Block List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-black font-bold uppercase text-[10px] block">
                  Distributed 128 MB Blocks:
                </span>
                {selectedFile.blocks.map((blk) => (
                  <div key={blk.blockId} className="p-2 rounded bg-white border border-neutral-300 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-bold text-black">{blk.blockId}</span>
                      <span className="text-neutral-500 ml-2">({(blk.sizeBytes / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                    <div className="text-neutral-700">
                      Replicas on: <span className="font-bold text-black">{blk.replicaNodes.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* HDFS CLI Shell Emulator */}
        <div className="p-4 rounded-md border border-neutral-300 bg-white space-y-3 flex flex-col shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-black" />
              <span className="font-bold text-xs uppercase tracking-wide text-black">
                HDFS Interactive Terminal
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">user: bda_student</span>
          </div>

          {/* Quick Command Presets */}
          <div className="flex flex-wrap gap-1 text-[11px] font-mono">
            {[
              'hdfs dfsadmin -report',
              'hdfs fsck /',
              'hdfs dfs -ls /traffic/raw',
              'hdfs dfs -du -h /traffic',
              'hdfs dfs -cat /traffic/raw/packets_stream_20261004.csv',
            ].map(cmd => (
              <button
                key={cmd}
                onClick={() => {
                  setTerminalInput(cmd);
                  handleRunCommand(cmd);
                }}
                className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-800 hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                {cmd.split(' ')[1] + ' ' + (cmd.split(' ')[2] || '')}
              </button>
            ))}
          </div>

          {/* Terminal Console Output */}
          <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto bg-neutral-50 p-3 rounded-md border border-neutral-300 font-mono text-xs text-neutral-900 space-y-3">
            {terminalHistory.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="font-bold text-black flex items-center gap-1.5">
                  <span className="text-neutral-500">$</span>
                  <span>{item.cmd}</span>
                </div>
                <pre className="text-neutral-800 text-[11px] whitespace-pre-wrap font-mono pl-3 border-l border-neutral-300">
                  {item.output}
                </pre>
              </div>
            ))}
          </div>

          {/* Command Input Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleRunCommand(); }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Enter HDFS command (e.g. hdfs dfs -ls /)"
                className="w-full bg-white border border-neutral-300 rounded-md pl-7 pr-3 py-1.5 text-xs font-mono text-black focus:outline-none focus:border-black"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md bg-black text-white hover:bg-neutral-800 text-xs font-bold font-mono border border-black cursor-pointer transition-colors"
            >
              Run
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
