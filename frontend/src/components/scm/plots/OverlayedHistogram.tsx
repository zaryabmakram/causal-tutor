"use client";

import { ComposedChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface ComparisonHistogramProps {
  observed?: { density: number[]; bin_centers: number[] };
  intervened?: { density: number[]; bin_centers: number[] };
}

export default function ComparisonHistogram({ observed, intervened }: ComparisonHistogramProps) {
  const hasObserved = observed && Array.isArray(observed.bin_centers) && observed.bin_centers.length > 0;
  const hasIntervened = intervened && Array.isArray(intervened.bin_centers) && intervened.bin_centers.length > 0;

  if (!hasObserved) {
    return (
      <div className="flex h-[130px] w-full items-center justify-center text-[13px] text-slate-400">
        Generating distribution...
      </div>
    );
  }

  // maps obs/int coordinates together to one x-axis  
  const intAt = (x: number) => {
    if (!hasIntervened) return undefined;
    let lo = 0;
    while (lo < intervened.bin_centers.length - 1 && intervened.bin_centers[lo + 1] < x) lo++;
    const hi = Math.min(lo + 1, intervened.bin_centers.length - 1);
    const t =
      intervened.bin_centers[hi] === intervened.bin_centers[lo]
        ? 0
        : (x - intervened.bin_centers[lo]) / (intervened.bin_centers[hi] - intervened.bin_centers[lo]);
    return intervened.density[lo] + t * (intervened.density[hi] - intervened.density[lo]);
  };

  // maps over unified x-axis
  const data = observed.bin_centers.map((x, i) => ({
    x,
    obs: observed.density[i] || 0,
    int: intAt(x),
  }));

  return (
    <div style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
          
          {/* control visible grid and handle observational data */}
          <XAxis
            xAxisId="obs-axis"
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={(v) => v.toFixed(2)}
            axisLine={{ stroke: "#E2E8F0" }}
            tickLine={false}
          />
          
          {/* forces the interventional data to render on the exact same physical coordinates to create the overlay */}
          <XAxis 
            xAxisId="int-axis" 
            dataKey="x" 
            type="number" 
            domain={['dataMin', 'dataMax']} 
            hide 
          />
          
          <YAxis hide domain={[0, 'auto']} />
          
          <Tooltip
            formatter={(value: number) => value.toFixed(3)}
            labelFormatter={(v: number) => `x = ${Number(v).toFixed(2)}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
          />
          
          <Bar 
            xAxisId="obs-axis" 
            dataKey="obs" 
            fill="#A5B4FC" 
            opacity={0.6} 
            radius={[2, 2, 0, 0]} 
            isAnimationActive={false} 
          />
          
          {hasIntervened && (
            <Bar 
              xAxisId="int-axis" 
              dataKey="int" 
              fill="#34D399" 
              opacity={0.6} 
              radius={[2, 2, 0, 0]} 
              isAnimationActive={false} 
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}