import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  Database, 
  GitFork, 
  Copy, 
  Check, 
  HelpCircle 
} from 'lucide-react';
import { 
  HIVE_PRESET_TABLES, 
  PRESET_HIVE_QUERIES, 
  globalHiveSimulator 
} from '../services/hiveEngine';
import { HiveQueryResult, HiveTable, NetworkPacket } from '../types/network';

interface HiveStudioProps {
  packets: NetworkPacket[];
}

export const HiveStudio: React.FC<HiveStudioProps> = ({ packets }) => {
  const [selectedTable, setSelectedTable] = useState<HiveTable>(HIVE_PRESET_TABLES[1]);
  const [queryInput, setQueryInput] = useState<string>(PRESET_HIVE_QUERIES[0].query);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<HiveQueryResult>(() => 
    globalHiveSimulator.executeQuery(PRESET_HIVE_QUERIES[0].query, packets)
  );
  const [activeTab, setActiveTab] = useState<'results' | 'explain' | 'schema'>('results');
  const [copied, setCopied] = useState<boolean>(false);

  const handleRunQuery = (sqlToRun?: string) => {
    const q = sqlToRun || queryInput;
    setIsExecuting(true);
    setTimeout(() => {
      const res = globalHiveSimulator.executeQuery(q, packets);
      setQueryResult(res);
      setIsExecuting(false);
      setActiveTab('results');
    }, 400);
  };

  const handleSelectTemplate = (templateQuery: string) => {
    setQueryInput(templateQuery);
    handleRunQuery(templateQuery);
  };

  return (
    <div className="space-y-6 bg-white text-black">
      {/* Top Banner */}
      <div className="p-4 border border-black bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-black" />
            <div>
              <h2 className="font-bold text-black text-sm uppercase tracking-wide">
                Apache Hive Data Warehouse (HiveQL Studio)
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Demonstrates Schema-on-Read, partitioned Parquet columnar storage, and analytical window functions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-600">Engine:</span>
            <span className="font-bold border border-black px-2 py-0.5 bg-black text-white">
              Apache Tez (DAG)
            </span>
          </div>
        </div>

        {/* Schema-on-Read Concept */}
        <div className="p-3 border border-black bg-neutral-50 text-xs flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-black mt-0.5 shrink-0" />
          <div className="text-neutral-800">
            <strong className="text-black uppercase">BDA Concept - Schema-on-Read:</strong> Unlike traditional RDBMS where data is checked on insertion (Schema-on-Write), Hive loads raw network packets into HDFS without schema validation. The schema is applied only when the query executes via the Hive Metastore and SerDe.
          </div>
        </div>
      </div>

      {/* Query Template Presets */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-black block">
          Preset Analytical Benchmark Queries:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_HIVE_QUERIES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectTemplate(item.query)}
              className="p-2.5 text-left border border-neutral-300 hover:border-black bg-white transition-colors space-y-1 cursor-pointer"
            >
              <div className="text-xs font-bold font-mono text-black truncate">{item.title}</div>
              <p className="text-[11px] text-neutral-600 line-clamp-2">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* SQL Editor & Controls */}
      <div className="p-4 border border-black bg-white space-y-3">
        <div className="flex items-center justify-between border-b border-black pb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-black" />
            <span className="font-bold text-xs uppercase tracking-wider text-black">
              HiveQL Query Editor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(queryInput);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-2.5 py-1 border border-black bg-white text-black hover:bg-neutral-100 text-xs font-mono flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
            <button
              onClick={() => handleRunQuery()}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold border border-black hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isExecuting ? 'Compiling DAG...' : 'Execute HiveQL'}</span>
            </button>
          </div>
        </div>

        <textarea
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          rows={5}
          className="w-full bg-neutral-50 border border-neutral-300 p-3 text-xs font-mono text-black focus:outline-none focus:border-black"
          spellCheck={false}
        />
      </div>

      {/* Query Results & Execution Plans */}
      <div className="p-4 border border-black bg-white space-y-3">
        <div className="flex items-center justify-between border-b border-black pb-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1 border transition-colors cursor-pointer ${
                activeTab === 'results' ? 'border-black bg-black text-white font-bold' : 'border-neutral-300 bg-white text-black hover:border-black'
              }`}
            >
              Results ({queryResult.rows.length} rows)
            </button>
            <button
              onClick={() => setActiveTab('explain')}
              className={`px-3 py-1 border transition-colors cursor-pointer ${
                activeTab === 'explain' ? 'border-black bg-black text-white font-bold' : 'border-neutral-300 bg-white text-black hover:border-black'
              }`}
            >
              Tez Execution Plan (EXPLAIN)
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1 border transition-colors cursor-pointer ${
                activeTab === 'schema' ? 'border-black bg-black text-white font-bold' : 'border-neutral-300 bg-white text-black hover:border-black'
              }`}
            >
              Metastore Schema Browser
            </button>
          </div>

          <div className="text-xs font-mono text-black flex items-center gap-3">
            <span>Execution Time: <span className="font-bold">{queryResult.executionTimeMs} ms</span></span>
            <span aria-hidden="true">·</span>
            <span>Tez Stages: <span className="font-bold">{queryResult.stages.length}</span></span>
          </div>
        </div>

        {/* Tab 1: Tabular Results Grid */}
        {activeTab === 'results' && (
          <div className="border border-black overflow-x-auto bg-white">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-neutral-100 text-black border-b border-black">
                <tr>
                  {queryResult.columns.map((col, idx) => (
                    <th key={idx} className="py-2 px-3 font-bold uppercase">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {queryResult.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-neutral-50">
                    {queryResult.columns.map((col, cIdx) => {
                      const val = row[col];
                      const isAlert = String(val).includes('ATTACK') || String(val).includes('SCANNER');
                      return (
                        <td key={cIdx} className={`py-2 px-3 ${isAlert ? 'font-bold underline' : 'text-black'}`}>
                          {typeof val === 'number' ? val.toLocaleString() : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Explain Plan */}
        {activeTab === 'explain' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-black">
              <GitFork className="w-4 h-4 text-black" />
              <span className="font-bold uppercase">Tez Directed Acyclic Graph (DAG) Plan</span>
            </div>
            <pre className="bg-neutral-50 p-4 border border-black font-mono text-xs text-black whitespace-pre-wrap overflow-x-auto">
              {queryResult.explainPlan}
            </pre>
          </div>
        )}

        {/* Tab 3: Metastore Table Schema */}
        {activeTab === 'schema' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HIVE_PRESET_TABLES.map(table => (
              <div key={table.name} className="p-3.5 border border-black bg-white space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-black pb-1.5">
                  <span className="font-bold text-black">{table.name}</span>
                  <span className="text-[10px] border border-black px-1 uppercase">{table.fileFormat}</span>
                </div>
                <div className="text-[11px] text-neutral-700">
                  Type: <span className="font-bold text-black">{table.tableType}</span>
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  Location: {table.location}
                </div>
                <div className="pt-2 border-t border-neutral-200 space-y-1">
                  <span className="text-black font-bold text-[10px] block uppercase">Columns ({table.columns.length}):</span>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    {table.columns.map(col => (
                      <div key={col.name} className="flex justify-between text-[11px] text-black">
                        <span className="font-semibold">{col.name}</span>
                        <span className="text-neutral-500">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {table.partitionColumns && (
                  <div className="pt-1.5 border-t border-neutral-200 text-[10px] text-black font-bold">
                    Partitioned by: {table.partitionColumns.map(p => `${p.name} (${p.type})`).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
