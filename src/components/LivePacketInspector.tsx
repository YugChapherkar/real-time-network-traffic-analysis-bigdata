import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  ShieldAlert, 
  X,
  FileText
} from 'lucide-react';
import { NetworkPacket } from '../types/network';

interface LivePacketInspectorProps {
  packets: NetworkPacket[];
  isCapturing: boolean;
  onExportCsv: () => void;
}

export const LivePacketInspector: React.FC<LivePacketInspectorProps> = ({
  packets,
  isCapturing,
  onExportCsv,
}) => {
  const [filterProtocol, setFilterProtocol] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterAnomalyOnly, setFilterAnomalyOnly] = useState<boolean>(false);
  const [selectedPacket, setSelectedPacket] = useState<NetworkPacket | null>(null);

  const filteredPackets = packets.filter(p => {
    if (filterProtocol !== 'ALL' && p.protocol !== filterProtocol) return false;
    if (filterAnomalyOnly && !p.isAnomaly) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      const match = 
        p.srcIp.toLowerCase().includes(q) ||
        p.dstIp.toLowerCase().includes(q) ||
        String(p.srcPort).includes(q) ||
        String(p.dstPort).includes(q) ||
        p.payloadSummary.toLowerCase().includes(q) ||
        (p.dnsQuery && p.dnsQuery.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 bg-white text-black">
      {/* Top Controls Toolbar */}
      <div className="p-3.5 border border-neutral-300 rounded-md bg-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search IP, port, payload..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="bg-white border border-neutral-300 rounded-md pl-8 pr-3 py-1.5 text-black placeholder:text-neutral-400 focus:outline-none focus:border-black w-56 font-mono text-xs"
            />
          </div>

          {/* Protocol Filters */}
          <div className="flex items-center gap-1 border border-neutral-300 p-0.5 rounded-md bg-white text-[11px] font-mono">
            {['ALL', 'TCP', 'UDP', 'DNS', 'HTTP', 'HTTPS', 'ICMP'].map((proto) => (
              <button
                key={proto}
                onClick={() => setFilterProtocol(proto)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filterProtocol === proto
                    ? 'bg-black text-white font-bold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-black'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>

          {/* Anomaly Only Filter */}
          <button
            onClick={() => setFilterAnomalyOnly(!filterAnomalyOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
              filterAnomalyOnly
                ? 'bg-black text-white border-black font-bold'
                : 'bg-white text-black border-neutral-300 hover:bg-neutral-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Anomalies Only</span>
          </button>
        </div>

        {/* Counter and Export Button */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-600 font-mono text-xs font-medium">
            Showing <strong className="text-black">{filteredPackets.length}</strong> of {packets.length} frames
          </span>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-black hover:bg-black hover:text-white text-black font-medium text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Packet Table */}
      <div className="border border-neutral-300 rounded-md overflow-hidden bg-white shadow-xs">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-100 text-neutral-800 sticky top-0 border-b border-neutral-300 z-10 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-16">No.</th>
                <th className="py-2.5 px-3 w-28">Time</th>
                <th className="py-2.5 px-3 w-44">Source</th>
                <th className="py-2.5 px-3 w-44">Destination</th>
                <th className="py-2.5 px-3 w-24">Protocol</th>
                <th className="py-2.5 px-3 w-20">Length</th>
                <th className="py-2.5 px-3">Info / Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-neutral-500 font-sans">
                    No packets match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt, idx) => {
                  const isSelected = selectedPacket?.id === pkt.id;
                  return (
                    <tr
                      key={pkt.id}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-neutral-200 font-semibold text-black' 
                          : pkt.isAnomaly 
                            ? 'bg-neutral-100 text-black font-medium' 
                            : 'hover:bg-neutral-50 text-neutral-900'
                      }`}
                    >
                      <td className="py-2 px-3 text-neutral-500 font-medium">
                        {filteredPackets.length - idx}
                      </td>
                      <td className="py-2 px-3 text-neutral-700">
                        {pkt.timestampIso.split('T')[1].replace('Z', '')}
                      </td>
                      <td className="py-2 px-3">
                        <span className={pkt.srcIp === '198.51.100.77' ? 'font-bold underline' : ''}>
                          {pkt.srcIp}
                        </span>
                        {pkt.srcPort > 0 && <span className="text-neutral-500">:{pkt.srcPort}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span>{pkt.dstIp}</span>
                        {pkt.dstPort > 0 && <span className="text-neutral-500">:{pkt.dstPort}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold border border-neutral-400 px-1 py-0.5 rounded text-[10px] bg-white">
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-neutral-700">{pkt.packetSize} B</td>
                      <td className="py-2 px-3 truncate max-w-md">
                        {pkt.isAnomaly && (
                          <span className="font-bold border border-black bg-black text-white px-1.5 py-0.5 rounded text-[10px] mr-2">
                            ANOMALY
                          </span>
                        )}
                        <span>{pkt.payloadSummary}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Packet Dissection Drawer */}
      {selectedPacket && (
        <div className="p-4 border border-neutral-300 rounded-md bg-white space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-black" />
              <span className="font-bold text-black text-sm uppercase">
                Packet Dissection: Frame #{selectedPacket.id}
              </span>
              {selectedPacket.isAnomaly && (
                <span className="text-[11px] font-mono font-bold border border-black bg-black text-white px-1.5 py-0.5 rounded">
                  {selectedPacket.anomalyType}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedPacket(null)}
              className="text-neutral-600 hover:text-black p-1 rounded-md hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {/* Header & Flow Info */}
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="font-bold text-black border-b border-neutral-300 pb-1 uppercase tracking-wide">
                Network Layer (IPv4 / Transport)
              </div>
              <div className="grid grid-cols-2 gap-2 text-neutral-800">
                <div><span className="text-neutral-500">Source:</span> {selectedPacket.srcIp}:{selectedPacket.srcPort}</div>
                <div><span className="text-neutral-500">Destination:</span> {selectedPacket.dstIp}:{selectedPacket.dstPort}</div>
                <div><span className="text-neutral-500">Protocol:</span> {selectedPacket.protocol}</div>
                <div><span className="text-neutral-500">Wire Length:</span> {selectedPacket.packetSize} bytes</div>
                <div><span className="text-neutral-500">TTL:</span> {selectedPacket.ttl}</div>
                <div><span className="text-neutral-500">Window:</span> {selectedPacket.windowSize}</div>
              </div>

              {selectedPacket.protocol === 'TCP' && (
                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500 block mb-1">TCP Flags:</span>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className={selectedPacket.tcpFlags.syn ? 'font-bold underline' : 'text-neutral-400'}>SYN={selectedPacket.tcpFlags.syn ? 1 : 0}</span>
                    <span className={selectedPacket.tcpFlags.ack ? 'font-bold underline' : 'text-neutral-400'}>ACK={selectedPacket.tcpFlags.ack ? 1 : 0}</span>
                    <span className={selectedPacket.tcpFlags.fin ? 'font-bold underline' : 'text-neutral-400'}>FIN={selectedPacket.tcpFlags.fin ? 1 : 0}</span>
                    <span className={selectedPacket.tcpFlags.rst ? 'font-bold underline' : 'text-neutral-400'}>RST={selectedPacket.tcpFlags.rst ? 1 : 0}</span>
                    <span className={selectedPacket.tcpFlags.psh ? 'font-bold underline' : 'text-neutral-400'}>PSH={selectedPacket.tcpFlags.psh ? 1 : 0}</span>
                  </div>
                </div>
              )}

              {selectedPacket.dnsQuery && (
                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500 block">DNS Query:</span>
                  <span className="font-bold text-black">{selectedPacket.dnsQuery}</span>
                  <div className="text-neutral-600 text-[11px] mt-0.5">
                    Shannon Entropy: <strong className="text-black">{selectedPacket.dnsEntropy}</strong> (Threshold: &gt; 3.6 for tunneling)
                  </div>
                </div>
              )}
            </div>

            {/* Hex Dump & Payload Dissection */}
            <div className="p-3 rounded-md bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="font-bold text-black border-b border-neutral-300 pb-1 uppercase tracking-wide">
                Hex Preview & Payload
              </div>
              <div className="bg-white p-2.5 rounded border border-neutral-300 font-mono text-[11px] text-neutral-900 overflow-x-auto space-y-1">
                <div>0000  {selectedPacket.hexPreview}</div>
                <div>0010  54 63 70 41 6e 61 6c 79 73 69 73 42 69 67 44 61</div>
                <div>0020  74 61 50 69 70 65 6c 69 6e 65 5f 32 30 32 36 21</div>
              </div>
              <div className="text-neutral-700 text-[11px]">
                <span className="text-neutral-500">Payload Interpretation:</span>
                <p className="text-black font-sans mt-0.5 bg-white p-2 rounded border border-neutral-200">
                  {selectedPacket.payloadSummary}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
