"use client";

import { useRef } from "react";

interface ResizerProps {
  onDragStart: () => void;
  onDragMove: (deltaX: number) => void;
  onDragEnd?: () => void;
}

export default function Resizer({ onDragStart, onDragMove, onDragEnd }: ResizerProps) {
  const startXRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    onDragStart();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onDragMove(e.clientX - startXRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onDragEnd?.();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="group flex w-[4px] flex-shrink-0 cursor-col-resize touch-none items-stretch justify-center bg-transparent"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="w-px bg-slate-200 transition-colors group-hover:bg-slate-400 group-active:bg-slate-500" />
    </div>
  );
}