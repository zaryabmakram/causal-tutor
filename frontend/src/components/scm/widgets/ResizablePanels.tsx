"use client";

import { Children, type ReactNode } from "react";
import Resizer from "./Resizer";
import { useResizablePanel } from "./useResizablePanel";

interface ResizablePanelsProps {
  children: ReactNode;
  className?: string;
  initialLeftWidth?: number;
  initialRightWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export default function ResizablePanels({
  children,
  className = "h-full w-full min-h-0",
  initialLeftWidth = 360,
  initialRightWidth = 360,
  minWidth = 260,
  minLeftWidth = 280,
  maxWidth = 520,
  minRightWidth,
}: ResizablePanelsProps) {
  const panels = Children.toArray(children);
  const left = panels[0];
  const center = panels[1];
  const right = panels[2];

  const leftPanel = useResizablePanel(initialLeftWidth, minLeftWidth, maxWidth);
  const rightPanel = useResizablePanel(initialRightWidth, minRightWidth ?? minWidth, maxWidth);

  return (
    <div className={`flex ${className}`}>
      {left && (
        <>
          <div style={{ width: leftPanel.width }} className="flex-shrink-0">
            {left}
          </div>
          <Resizer onDragStart={leftPanel.dragStart} onDragMove={leftPanel.dragMove} />
        </>
      )}
      <div className="min-w-0 flex-1">{center}</div>
      {right && (
        <>
          <Resizer onDragStart={rightPanel.dragStart} onDragMove={(d) => rightPanel.dragMove(-d)} />
          <div style={{ width: rightPanel.width }} className="flex-shrink-0">
            {right}
          </div>
        </>
      )}
    </div>
  );
}