'use client';

import React from 'react';

interface ContextualInspectorProps {
  title?: string;
  children?: React.ReactNode;
}

export default function ContextualInspector({ title = 'Next Steps', children }: ContextualInspectorProps) {
  return (
    <aside className="w-[320px] shrink-0 bg-surface border-l border-outline-variant/30 h-full overflow-y-auto flex flex-col z-30 hidden xl:flex shadow-[-4px_0_20px_rgba(0,0,0,0.01)]">
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
