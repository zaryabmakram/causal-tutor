"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceDot, ResponsiveContainer, CartesianGrid } from "recharts";
import { fetchTreatmentResponse } from "@/lib/api";
import type { SCMSchema, SCMVariable } from "@/types";

interface TreatmentResponseProps {
  schema: SCMSchema;
  abducedNoise: Record<string, number>;
  interveneVar: SCMVariable;
  queryVar: SCMVariable;
  initialValue: number;
}

const RANGE_POINTS = 500; // actual num of values to slide through
const RANGE_SPAN = 200; // +/- around the initial value

export default function TreatmentResponse({
  schema, abducedNoise, interveneVar, queryVar, initialValue,
}: TreatmentResponseProps) {
  const [sliderValue, setSliderValue] = useState(initialValue);
  const [points, setPoints] = useState<{ x: number; y: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  // getting left-right range vals
  const rangeMin = initialValue - RANGE_SPAN / 2;
  const rangeMax = initialValue + RANGE_SPAN / 2;

  const valueRange = useMemo(() => {
    const step = (rangeMax - rangeMin) / (RANGE_POINTS - 1);
    return Array.from({ length: RANGE_POINTS }, (_, i) => rangeMin + i * step);
  }, [rangeMin, rangeMax]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTreatmentResponse(schema, abducedNoise, interveneVar.id, queryVar.id, valueRange)
      .then((res) => {
        if (!cancelled) setPoints(res);
      })
      .catch((err) => console.error("Treatment response failed", err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schema, abducedNoise, interveneVar.id, queryVar.id, valueRange]);

  const currentPoint = useMemo(() => {
    if (!points) return null;
    let closest = points[0];
    let closestDist = Infinity;
    for (const p of points) {
      const d = Math.abs(p.x - sliderValue);
      if (d < closestDist) { closestDist = d; closest = p; }
    }
    return closest;
  }, [points, sliderValue]);

  return (
    <div className="px-4 py-4">
      <p className="mb-4 text-[12.5px] leading-snug text-slate-500">
        Drag the slider to explore how the outcome would have changed across the range of hypothetical treatment
        values, while keeping everything else fixed.
      </p>

      <div className="mb-5 flex items-center gap-3">
        <span className="font-mono text-[14px] font-bold text-slate-700">{interveneVar.name} =</span>
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={(rangeMax - rangeMin) / (RANGE_POINTS - 1)}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="flex-1 accent-slate-800"
        />
        <span className="w-14 flex-shrink-0 text-right font-mono text-[14px] font-semibold text-slate-600">
          {sliderValue.toFixed(1)}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-slate-100 p-3">
        {loading || !points ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-slate-300">Computing...</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F1F5F9" />
              <XAxis dataKey="x" type="number" domain={[rangeMin, rangeMax]} tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => v.toFixed(0)} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} width={40} />
              <Line type="monotone" dataKey="y" stroke="#A5B4FC" strokeWidth={2} dot={false} isAnimationActive={false} />
              {currentPoint && (
                <ReferenceDot x={currentPoint.x} y={currentPoint.y} r={5} fill={"#728EB3"} stroke="white" strokeWidth={2} isFront />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/*comparing the target value*/}
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-semibold text-slate-600">Value of {queryVar.name}:</span>
        <span className="font-mono text-[20px] font-bold" style={{ color: "#728EB3" }}>
          {currentPoint ? currentPoint.y.toFixed(3) : "—"}
        </span>
      </div>
    </div>
  );
}