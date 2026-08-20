"use client";

import { useCallback, useRef, useState } from "react";

export function useResizablePanel(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);
  const startWidthRef = useRef(initialWidth);

  const clamp = useCallback((v: number) => Math.min(Math.max(v, minWidth), maxWidth), [minWidth, maxWidth]);

  const dragStart = useCallback(() => {
    startWidthRef.current = widthRef.current;
  }, []);

  const dragMove = useCallback(
    (deltaX: number) => {
      const next = clamp(startWidthRef.current + deltaX);
      if (next !== widthRef.current) {
        widthRef.current = next;
        setWidth(next);
      }
    },
    [clamp]
  );

  return { width, dragStart, dragMove };
}