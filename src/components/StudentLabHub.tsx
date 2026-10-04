import React, { useState } from 'react';
import { 
  Code2, 
  Download, 
  Copy, 
  Check, 
  Laptop, 
  FileCode 
} from 'lucide-react';
import { STUDENT_SCRIPTS, StudentScript } from '../data/studentScripts';

export const StudentLabHub: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<StudentScript>(STUDENT_SCRIPTS[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([selectedScript.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = selectedScript.filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Top Banner: Local PC Execution Guide */}
      <div className="p-4 border border-black bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-black" />
            <div>
              <h2 className="font-bold text-black text-sm uppercase tracking-wide">
                Local PC Deployment & Ready-to-Run Codebase
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Runs directly on a personal laptop (Linux, macOS, or Windows WSL2) in Docker without cluster hardware.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-600">RAM Limit:</span>
            <span className="font-bold border border-black px-2 py-0.5 bg-black text-white">
              4 GB - 6 GB RAM
            </span>
          </div>
        </div>

        {/* 6-Step Execution Roadmap */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs font-mono">
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">1. Docker</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">docker compose up -d</p>
          </div>
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">2. HDFS Init</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">hdfs dfs -mkdir /traffic</p>
          </div>
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">3. Packet Sniffer</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">python3 packet_capture.py</p>
          </div>
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">4. HDFS Uploader</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">python3 hdfs_uploader.py</p>
          </div>
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">5. Spark Streaming</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">spark-submit detector.py</p>
          </div>
          <div className="p-2 border border-neutral-300 bg-neutral-50">
            <span className="font-bold uppercase block text-black">6. Hive & MR</span>
            <p className="text-[10px] text-neutral-600 mt-0.5">hive -f analytics.sql</p>
          </div>
        </div>
      </div>

      {/* Script Selector Sidebar + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scripts List */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-black block">
            Project Code Files ({STUDENT_SCRIPTS.length})
          </span>
          <div className="space-y-1.5">
            {STUDENT_SCRIPTS.map(script => (
              <button
                key={script.id}
                onClick={() => setSelectedScript(script)}
                className={`w-full text-left p-3 border transition-all cursor-pointer ${
                  selectedScript.id === script.id
                    ? 'border-2 border-black bg-neutral-100 text-black font-bold'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-black'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold truncate">{script.filename}</span>
                  <span className="text-[10px] border border-black px-1 uppercase">{script.language}</span>
                </div>
                <div className="text-[11px] text-neutral-600 line-clamp-1">{script.name}</div>
                <div className="text-[10px] text-black font-semibold mt-1 font-mono">{script.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Code Viewer & Terminal Command */}
        <div className="lg:col-span-2 p-4 border border-black bg-white space-y-3 font-mono text-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-black" />
                <span className="font-bold text-black text-sm uppercase">{selectedScript.filename}</span>
              </div>
              <p className="text-[11px] text-neutral-600 font-sans mt-0.5">
                {selectedScript.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 border border-black bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleDownloadFile}
                className="px-3 py-1.5 border border-black bg-black text-white hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          {/* Terminal Command */}
          <div className="p-2.5 border border-neutral-300 bg-neutral-50 text-xs">
            <span className="font-bold block mb-1 uppercase text-black">Terminal Run Command:</span>
            <code className="text-black font-mono text-[11px] select-all font-bold">
              {selectedScript.command}
            </code>
          </div>

          {/* Code Box */}
          <div className="flex-1 max-h-[480px] overflow-y-auto bg-neutral-50 p-4 border border-neutral-300">
            <pre className="text-black text-[11px] whitespace-pre font-mono leading-relaxed">
              {selectedScript.code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
