"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface HistogramProps {
  histogram?: { density: number[]; bin_centers: number[] };
  kde?: { x: number[]; y: number[] };
}

export default function Histogram({ histogram, kde }: HistogramProps) {
  const hasHistogram = histogram && Array.isArray(histogram.bin_centers) && histogram.bin_centers.length > 0;
  const hasKde = kde && Array.isArray(kde.x) && kde.x.length > 0;

  // loading screen
  if (!hasHistogram) {
    return (
      <div className="flex h-[130px] w-full items-center justify-center text-[13px] text-slate-400">
        Generating distribution...
      </div>
    );
  }

  const kdeAt = (x: number) => {
    if (!hasKde) return undefined;
    let lo = 0;
    while (lo < kde.x.length - 1 && kde.x[lo + 1] < x) lo++;
    const hi = Math.min(lo + 1, kde.x.length - 1);
    const t = kde.x[hi] === kde.x[lo] ? 0 : (x - kde.x[lo]) / (kde.x[hi] - kde.x[lo]);
    return kde.y[lo] + t * (kde.y[hi] - kde.y[lo]);
  };

  const data = histogram.bin_centers.map((x, i) => ({
    x,
    bar: histogram.density[i] || 0,
    curve: kdeAt(x),
  }));

  return (
    <div style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={(v) => v.toFixed(2)}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            formatter={(value: number) => value.toFixed(3)}
            labelFormatter={(v: number) => `x = ${Number(v).toFixed(2)}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          <Bar dataKey="bar" fill="#A5B4FC" opacity={0.6} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          {hasKde && (
            <Line type="monotone" dataKey="curve" stroke="#6366F1" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}