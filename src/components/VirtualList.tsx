import React, { useEffect, useRef } from "react";
import { useVirtualList } from "../hooks/useVirtualList";

interface VirtualListProps<T> {
  list: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
  children: (item: T, index: number) => React.ReactNode;
}

const ListItemWrapper = ({
  children,
  index,
  updateItemSize,
}: {
  children: React.ReactNode;
  index: number;
  updateItemSize: (index: number, height: number) => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = itemRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect;
      updateItemSize(index, height.height);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [index, updateItemSize]);

  return <div ref={itemRef}>{children}</div>;
};

export function VirtualList<T>({
  list,
  estimatedItemHeight = 60,
  containerHeight,
  overscan = 5,
  children,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    visibleData,
    totalHeight,
    offsetY,
    startIndex,
    handleScroll,
    updateItemSize,
  } = useVirtualList({
    list,
    estimatedItemHeight,
    containerHeight,
    overscan,
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: "auto",
        position: "relative",
        border: "1px solid #f0f0f0",
        borderRadius: "4px",
      }}
    >
      {/* 1. 撑开滚动条的“幻影”层 */}
      <div style={{ height: totalHeight, width: "100%" }} />

      {/* 2. 实际渲染的数据层 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translate3d(0, ${offsetY}px, 0)`,
        }}
      >
        {visibleData.map((item, index) => {
          const realIndex = startIndex + index;
          return (
            <ListItemWrapper
              key={realIndex}
              index={realIndex}
              updateItemSize={updateItemSize}
            >
              {children(item, realIndex)}
            </ListItemWrapper>
          );
        })}
      </div>
    </div>
  );
}
