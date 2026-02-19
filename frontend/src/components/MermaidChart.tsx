"use client";
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "sans-serif"
});

export default function MermaidChart({ chart }: MermaidProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
        // Clear previous content
        chartRef.current.innerHTML = "";
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
            mermaid.render(id, chart).then(({ svg }) => {
                if (chartRef.current) {
                    chartRef.current.innerHTML = svg;
                }
            });
        } catch (e) {
            console.error("Mermaid render error:", e);
            if (chartRef.current) {
                chartRef.current.innerHTML = `<div class="text-red-500 text-xs">Failed to render graph</div>`;
            }
        }
    }
  }, [chart]);

  return <div ref={chartRef} className="mermaid-chart flex justify-center w-full" />;
}

