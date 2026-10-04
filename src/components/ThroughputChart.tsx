import React, { useEffect, useRef } from 'react';

interface ThroughputPoint {
  time: number;
  pps: number;
  bps: number;
  hasAnomaly: boolean;
}

interface ThroughputChartProps {
  currentPps: number;
  currentBps: number;
  hasAnomaly: boolean;
}

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  currentPps,
  currentBps,
  hasAnomaly,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<ThroughputPoint[]>([]);

  useEffect(() => {
    const point: ThroughputPoint = {
      time: Date.now(),
      pps: currentPps,
      bps: currentBps,
      hasAnomaly,
    };

    dataPointsRef.current.push(point);
    if (dataPointsRef.current.length > 35) {
      dataPointsRef.current.shift();
    }
  }, [currentPps, currentBps, hasAnomaly]);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const points = dataPointsRef.current;

      // Pure white canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Subtle black/gray grid lines
      ctx.strokeStyle = '#e5e5e5';
      ctx.lineWidth = 1;
      for (let y = 20; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (points.length < 2) return;

      const maxPps = Math.max(...points.map(p => p.pps), 20);
      const stepX = width / (points.length - 1);

      // Draw subtle light gray gradient area under line
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

      ctx.beginPath();
      points.forEach((p, idx) => {
        const x = idx * stepX;
        const y = height - (p.pps / maxPps) * (height - 30) - 10;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo((points.length - 1) * stepX, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Solid black line
      ctx.beginPath();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      points.forEach((p, idx) => {
        const x = idx * stepX;
        const y = height - (p.pps / maxPps) * (height - 30) - 10;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Black dots for anomaly markers
      points.forEach((p, idx) => {
        if (p.hasAnomaly) {
          const x = idx * stepX;
          const y = height - (p.pps / maxPps) * (height - 30) - 10;

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    };

    render();
    const interval = setInterval(render, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1.5 bg-white text-black">
      <div className="flex items-center justify-between text-[11px] font-mono text-black">
        <span>30s Rolling Stream Window (Ingestion Waveform)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-black">
            <span className="inline-block w-2.5 h-0.5 bg-black"></span> Ingestion (pps)
          </span>
          <span className="flex items-center gap-1.5 text-black font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-black"></span> Anomaly Event
          </span>
        </div>
      </div>
      <div className="w-full h-24 rounded-none bg-white border border-black overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={96}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
};
