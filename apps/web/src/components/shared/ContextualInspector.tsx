'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ContextualInspectorProps {
  title?: string;
  children?: React.ReactNode;
}

export default function ContextualInspector({ title = 'Next Steps', children }: ContextualInspectorProps) {
  const [width, setWidth] = useState(320);
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 280 && newWidth <= 600) {
      setWidth(newWidth);
    }
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, []);

  return (
    <aside 
      style={{ width: `${width}px` }}
      className="shrink-0 bg-surface border-l border-outline-variant/30 h-full overflow-y-auto flex flex-col z-30 hidden xl:flex shadow-[-4px_0_20px_rgba(0,0,0,0.01)] relative"
    >
      {/* Resize handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-50"
        title="Drag to resize properties panel"
      />

      <div className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest sticky top-0 z-10 flex justify-between items-center h-12 select-none">
        <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">{title}</h2>
        <button className="text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-stack-md flex-1 min-w-0">
        {children}
      </div>
    </aside>
  );
}

