"use client";

import React from "react";
import { Info } from "lucide-react";

function HoverInfo({
  title,
  description,
  side = "top",
}: {
  title: string;
  description?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  // adding breathing space between hover and container depending on its location to avoid accidental crop
  const posClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`pointer-events-none absolute z-30 w-[230px] origin-bottom opacity-0 scale-95 transition-all duration-150 ease-out group-hover:opacity-100 group-hover:scale-100 ${posClasses[side]}`}
    >
      <div className="rounded-2xl border border-black/5 bg-[#F1F1F1] px-4 py-3 shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <Info size={15} className="flex-shrink-0 text-slate-500" />
          <span className="text-[13px] font-bold text-slate-800">{title}</span>
        </div>
        {description && (
          <p className="text-[12px] leading-snug text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

export const Hoverable = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    description?: string;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
    children: React.ReactNode;
  }
>(({ title, description, side = "top", className = "", children }, ref) => (
  <div ref={ref} className={`group relative ${className}`}>
    {children}
    <HoverInfo title={title} description={description} side={side} />
  </div>
));
Hoverable.displayName = "Hoverable";