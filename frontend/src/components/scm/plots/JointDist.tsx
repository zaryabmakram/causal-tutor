"use client";

import { useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";
import { pearsonCorrelation, linearRegressionSlope } from "@/lib/statUtils";
import type { SCMVariable } from "@/types";

interface JointDistributionProps {
  variables: SCMVariable[];
  getSamples: (varId: string) => number[] | undefined;
  sampleSize: number;
  onSampleSizeChange: (n: number) => void;
  loading: boolean;
  interventionTargetId?: string;
  interventionType?: "hard" | "soft";
}

export default function JointDistribution({variables, getSamples, sampleSize, onSampleSizeChange, loading, interventionTargetId, interventionType}: JointDistributionProps) 
{
  const [xVarId, setXVarId] = useState(variables[0]?.id ?? "");
  const [yVarId, setYVarId] = useState(variables[1]?.id ?? variables[0]?.id ?? "");

  // samples X, Y
  const xData = getSamples(xVarId) ?? [];
  const yData = getSamples(yVarId) ?? [];
  const hasData = !loading && xData.length > 0 && yData.length > 0;

  const points = useMemo(
    () => xData.map((x, i) => ({ x, y: yData[i] })),
    [xData, yData]
  );

  const correlation = useMemo(() => pearsonCorrelation(xData, yData), [xData, yData]);
  const slope = useMemo(() => linearRegressionSlope(xData, yData), [xData, yData]);

  const AxisSelector = ({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) => (
    <div className="mb-4">
      <div className="mb-2 text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          {variables.map((v) => (
            <button
              key={v.id}
              onClick={() => onChange(v.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[13px] font-semibold transition-colors ${
                v.id === value
                  ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                  : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {/* color-coded (soft/hard) circle before variable to distinguish*/}
              {v.id === interventionTargetId && (
                <span className={`h-2 w-2 rounded-full ${interventionType === "hard" ? "bg-amber-500" : "bg-sky-500"}`} />
              )}
              <span>{v.name}</span>
            </button>
          ))}
      </div>
    </div>
  );
  
  return (
    <div className="px-4 py-3">
      <AxisSelector label="X-axis" value={xVarId} onChange={setXVarId} />
      <AxisSelector label="Y-axis" value={yVarId} onChange={setYVarId} />

      <div className="mx-0 rounded-lg p-0.5">
        {/* loading*/}
        {!hasData ? (
          <div className="flex h-[220px] items-center justify-center text-[12px] text-slate-300">
            Sampling...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 8, right: 4, bottom: 8, left: -30 }}>
              <CartesianGrid stroke="#F1F5F9" />
              <XAxis type="number" dataKey="x" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <YAxis type="number" dataKey="y" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <Scatter data={points} fill="#0F766E" fillOpacity={0.2} r={2} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex flex-col divide-y divide-slate-100">
        <div className="flex items-center justify-between py-2.5 text-[14px]">
          <span className="text-slate-500">Correlation</span>
          <span className="font-mono text-slate-700">{!hasData || isNaN(correlation) ? "—" : correlation.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-[14px]">
          <span className="text-slate-500">Slope</span>
          <span className="font-mono text-slate-700">{!hasData || isNaN(slope) ? "—" : slope.toFixed(2)}</span>
        </div>
      </div>

      <div className="pt-5">
        <div className="mb-2 flex items-center justify-between text-[14px]">
          <span className="text-slate-500">Sample Size (n)</span>
          <span className="font-mono font-semibold text-[#4F70B0]">{sampleSize}</span>
        </div>
        {/*can change range from here
        TO-DO: change slider theme*/}
        <input
          type="range" min={100} max={2000} step={100}
          value={sampleSize}
          onChange={(e) => onSampleSizeChange(Number(e.target.value))}
          className="w-full accent-slate-800"
        />
      </div>
    </div>
  );
}