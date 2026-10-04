import React, { useState } from 'react';
import { 
  Layers, 
  Play, 
  RotateCcw, 
  Copy, 
  Check 
} from 'lucide-react';
import { 
  PRESET_MAPREDUCE_JOBS, 
  globalMapReduceEngine 
} from '../services/mapReduceEngine';
import { MapReduceJobConfig, MapReduceStepState, NetworkPacket } from '../types/network';

interface MapReduceStudioProps {
  packets: NetworkPacket[];
}

export const MapReduceStudio: React.FC<MapReduceStudioProps> = ({ packets }) => {
  const [selectedJob, setSelectedJob] = useState<MapReduceJobConfig>(PRESET_MAPREDUCE_JOBS[0]);
  const [activeStage, setActiveStage] = useState<'SPLIT' | 'MAP' | 'COMBINE' | 'SHUFFLE' | 'REDUCE' | 'OUTPUT'>('OUTPUT');
  const [executionResult, setExecutionResult] = useState<MapReduceStepState>(() => 
    globalMapReduceEngine.executeJob(PRESET_MAPREDUCE_JOBS[0], packets)
  );
  const [activeSubTab, setActiveSubTab] = useState<'visualizer' | 'code'>('visualizer');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const stageKeys: ('SPLIT' | 'MAP' | 'COMBINE' | 'SHUFFLE' | 'REDUCE' | 'OUTPUT')[] = [
    'SPLIT', 'MAP', 'COMBINE', 'SHUFFLE', 'REDUCE', 'OUTPUT'
  ];

  const handleStartAutoPlay = () => {
    setIsAutoPlaying(true);
    let currentIdx = 0;
    setActiveStage(stageKeys[0]);

    const timer = setInterval(() => {
      currentIdx++;
      if (currentIdx >= stageKeys.length) {
        clearInterval(timer);
        setIsAutoPlaying(false);
      } else {
        setActiveStage(stageKeys[currentIdx]);
      }
    }, 1400);
  };

  const handleRunJob = (job?: MapReduceJobConfig) => {
    const targetJob = job || selectedJob;
    const res = globalMapReduceEngine.executeJob(targetJob, packets);
    setExecutionResult(res);
    setActiveStage('OUTPUT');
  };

  const stages = [
    { key: 'SPLIT', label: '1. Input Splits', desc: '128MB HDFS block chunks' },
    { key: 'MAP', label: '2. Map Phase', desc: 'Mappers emit <key, value>' },
    { key: 'COMBINE', label: '3. Combiner', desc: 'Local in-memory reduction' },
    { key: 'SHUFFLE', label: '4. Shuffle & Sort', desc: 'HashPartitioner transfer' },
    { key: 'REDUCE', label: '5. Reducer Phase', desc: 'Global reduceByKey' },
    { key: 'OUTPUT', label: '6. HDFS Output', desc: 'part-r-00000 files' },
  ];

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Top Banner */}
      <div className="p-4 border border-black bg-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-black" />
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">
              Hadoop MapReduce Processing Studio
            </h2>
          </div>
          <p className="text-xs text-neutral-600 mt-0.5">
            Step-by-step visualizer for MapReduce key-value transitions and partitioner routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab switcher */}
          <div className="border border-black p-0.5 flex items-center text-xs">
            <button
              onClick={() => setActiveSubTab('visualizer')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                activeSubTab === 'visualizer' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              Execution Visualizer
            </button>
            <button
              onClick={() => setActiveSubTab('code')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                activeSubTab === 'code' ? 'bg-black text-white font-bold' : 'text-black hover:bg-neutral-100'
              }`}
            >
              Python Streaming Code
            </button>
          </div>

          <button
            onClick={handleStartAutoPlay}
            disabled={isAutoPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-black transition-colors cursor-pointer ${
              isAutoPlaying
                ? 'bg-neutral-200 text-black'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAutoPlaying ? 'animate-spin' : ''}`} />
            <span>{isAutoPlaying ? 'Stepping...' : 'Animate Stages'}</span>
          </button>

          <button
            onClick={() => handleRunJob()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold border border-black hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Job</span>
          </button>
        </div>
      </div>

      {/* Preset Job Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESET_MAPREDUCE_JOBS.map(job => (
          <div
            key={job.jobId}
            onClick={() => {
              setSelectedJob(job);
              handleRunJob(job);
            }}
            className={`p-3 border cursor-pointer transition-all ${
              selectedJob.jobId === job.jobId
                ? 'border-2 border-black bg-neutral-100'
                : 'border-neutral-300 bg-white hover:border-black'
            }`}
          >
            <div className="text-xs font-bold font-mono text-black truncate">
              {job.jobName}
            </div>
            <p className="text-[11px] text-neutral-600 mt-1 line-clamp-2">
              {job.description}
            </p>
            <div className="mt-2 text-[10px] font-mono text-neutral-500 flex items-center justify-between border-t border-neutral-200 pt-1">
              <span>Reducers: {job.numReducers}</span>
              <span>{job.combinerClass ? 'Has Combiner' : 'No Combiner'}</span>
            </div>
          </div>
        ))}
      </div>

      {activeSubTab === 'visualizer' ? (
        <div className="space-y-4">
          {/* Stage Progression Bar */}
          <div className="p-3 border border-black bg-white">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {stages.map((st) => (
                <button
                  key={st.key}
                  onClick={() => setActiveStage(st.key as any)}
                  className={`p-2 text-left transition-colors border cursor-pointer ${
                    activeStage === st.key
                      ? 'border-2 border-black bg-neutral-100 text-black font-bold'
                      : 'border-neutral-300 bg-white text-neutral-700 hover:border-black'
                  }`}
                >
                  <div className="text-xs font-mono">{st.label}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5 truncate">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stage Detail Display */}
          <div className="p-4 border border-black bg-white space-y-4">
            {activeStage === 'SPLIT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 1: Input Splits Generated by FileInputFormat
                  </span>
                  <span className="text-xs font-mono text-neutral-600">
                    Split Size: 128 MB (Default HDFS Block)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {executionResult.inputSplits.map(split => (
                    <div key={split.id} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                      <div className="font-bold text-black">{split.id}</div>
                      <div className="text-neutral-600 text-[11px]">Records: {split.recordCount} rows</div>
                      <div className="space-y-1 pt-1 border-t border-neutral-200">
                        <span className="text-neutral-500 text-[10px] block font-bold">Sample Raw Lines:</span>
                        {split.sampleRecords.map((line, i) => (
                          <div key={i} className="text-black text-[10px] truncate bg-neutral-100 p-1 border border-neutral-300">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStage === 'MAP' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 2: Map Task Output (Emitted Key-Value Pairs)
                  </span>
                  <span className="text-xs font-mono text-neutral-600">
                    Class: {selectedJob.mapperClass}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {executionResult.mapOutputs.map(mo => (
                    <div key={mo.mapperId} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                      <div className="font-bold text-black flex items-center justify-between">
                        <span>{mo.mapperId}</span>
                        <span className="text-neutral-500 text-[10px]">{mo.pairs.length} pairs</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {mo.pairs.slice(0, 10).map((pair, i) => (
                          <div key={i} className="flex justify-between p-1 bg-neutral-50 border border-neutral-200 text-[11px]">
                            <span className="font-bold truncate max-w-[120px]">{pair.key}</span>
                            <span>{JSON.stringify(pair.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStage === 'COMBINE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 3: Combiner (Local Pre-Aggregation on Mapper Node)
                  </span>
                  <span className="text-xs font-mono text-neutral-600">
                    Reduces network shuffle payload size
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {executionResult.combineOutputs.map(co => (
                    <div key={co.mapperId} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                      <div className="font-bold text-black flex items-center justify-between">
                        <span>{co.mapperId}</span>
                        <span className="text-neutral-500 text-[10px]">{co.pairs.length} distinct keys</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {co.pairs.map((pair, i) => (
                          <div key={i} className="flex justify-between p-1 bg-neutral-50 border border-neutral-200 text-[11px]">
                            <span className="font-bold truncate max-w-[120px]">{pair.key}</span>
                            <span>{JSON.stringify(pair.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStage === 'SHUFFLE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 4: Shuffle, HashPartitioner & Secondary Sort
                  </span>
                  <span className="text-xs font-mono text-neutral-600">
                    Formula: (hash(key) & Integer.MAX_VALUE) % {selectedJob.numReducers}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1].map(partitionId => {
                    const partitionItems = executionResult.shuffleOutputs.filter(s => s.partitionId === partitionId);
                    return (
                      <div key={partitionId} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                        <div className="font-bold text-black flex items-center justify-between">
                          <span>Partition #{partitionId} → Reducer-0{partitionId + 1}</span>
                          <span className="text-neutral-500 text-[10px]">{partitionItems.length} sorted keys</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1.5">
                          {partitionItems.map((item, i) => (
                            <div key={i} className="p-1.5 bg-neutral-50 border border-neutral-300 text-[11px] space-y-1">
                              <div className="font-bold text-black">{item.key}</div>
                              <div className="text-neutral-600 text-[10px] truncate">
                                Values: [{item.values.map(v => JSON.stringify(v)).join(', ')}]
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeStage === 'REDUCE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 5: Reducer Task Execution
                  </span>
                  <span className="text-xs font-mono text-neutral-600">
                    Class: {selectedJob.reducerClass}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executionResult.reduceOutputs.map(ro => (
                    <div key={ro.reducerId} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                      <div className="font-bold text-black flex items-center justify-between">
                        <span>{ro.reducerId}</span>
                        <span className="text-neutral-500 text-[10px]">{ro.pairs.length} aggregated entries</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {ro.pairs.map((pair, i) => (
                          <div key={i} className="flex justify-between p-1.5 bg-neutral-50 border border-neutral-300 text-[11px]">
                            <span className="font-bold">{pair.key}</span>
                            <span>{String(pair.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStage === 'OUTPUT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black pb-2">
                  <span className="font-bold text-xs uppercase text-black">
                    STAGE 6: Final HDFS Output Files
                  </span>
                  <span className="text-xs font-mono font-bold text-black">
                    Path: {selectedJob.outputPath}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executionResult.finalOutputFiles.map((file, i) => (
                    <div key={i} className="p-3 border border-black bg-white font-mono text-xs space-y-2">
                      <div className="font-bold text-black flex items-center justify-between border-b border-neutral-200 pb-1">
                        <span>{file.path.split('/').pop()}</span>
                        <span className="text-neutral-500 text-[10px]">{file.lines.length} lines</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto bg-neutral-50 p-2 text-[11px] text-black space-y-1 border border-neutral-200">
                        {file.lines.length === 0 || file.lines[0] === '' ? (
                          <span className="text-neutral-500 italic">Empty marker file (_SUCCESS)</span>
                        ) : (
                          file.lines.map((line, lIdx) => (
                            <div key={lIdx} className="hover:bg-neutral-200 px-1">
                              {line}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Python Streaming Code Tab */
        <div className="p-4 border border-black bg-white space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <div>
              <span className="font-bold text-black uppercase">Hadoop Streaming Python Scripts</span>
              <p className="text-neutral-600 text-[11px] font-sans mt-0.5">
                Run natively using Hadoop streaming jar on single-node cluster.
              </p>
            </div>
            <button
              onClick={() => {
                const fullCode = `# mapper.py\nimport sys\nfor line in sys.stdin:\n    p = line.strip().split(',')\n    if len(p) >= 7 and not line.startswith('timestamp'):\n        print(f"{p[1]}\\t{p[6]}")\n\n# reducer.py\nimport sys\ncurr_ip, curr_bytes = None, 0\nfor line in sys.stdin:\n    ip, b = line.strip().split('\\t')\n    if curr_ip == ip:\n        curr_bytes += int(b)\n    else:\n        if curr_ip: print(f"{curr_ip}\\t{curr_bytes}")\n        curr_ip, curr_bytes = ip, int(b)\nif curr_ip: print(f"{curr_ip}\\t{curr_bytes}")`;
                navigator.clipboard.writeText(fullCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="px-3 py-1 border border-black bg-white text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {copiedCode ? 'Copied' : 'Copy Python Code'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="font-bold text-black">mapper.py</span>
              <pre className="bg-neutral-50 p-3 border border-neutral-300 text-[11px] text-black overflow-x-auto">
{`#!/usr/bin/env python3
import sys

# Standard Hadoop Streaming Mapper
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith("timestamp"):
        continue
    
    parts = line.split(",")
    if len(parts) >= 7:
        src_ip = parts[1].strip()
        packet_size = parts[6].strip()
        # Emit <key>\\t<value>
        print(f"{src_ip}\\t{packet_size}")`}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-black">reducer.py</span>
              <pre className="bg-neutral-50 p-3 border border-neutral-300 text-[11px] text-black overflow-x-auto">
{`#!/usr/bin/env python3
import sys

current_ip = None
current_bytes = 0

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    
    ip, size_str = line.split("\\t")
    size = int(size_str)

    if current_ip == ip:
        current_bytes += size
    else:
        if current_ip:
            print(f"{current_ip}\\t{current_bytes}")
        current_ip = ip
        current_bytes = size

if current_ip:
    print(f"{current_ip}\\t{current_bytes}")`}
              </pre>
            </div>
          </div>

          <div className="p-3 border border-black bg-neutral-50">
            <span className="font-bold block mb-1 text-black">Execution Command:</span>
            <code className="text-black text-[11px] font-mono select-all">
              hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
              -input /traffic/raw/*.csv \
              -output /traffic/output/volume_per_ip \
              -mapper mapper.py \
              -reducer reducer.py \
              -file mapper.py \
              -file reducer.py
            </code>
          </div>
        </div>
      )}
    </div>
  );
};
