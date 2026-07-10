'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { DocumentDto, UserDto, CompanyDto, CustomerDto } from '@docflow/shared-types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProposalBlock {
  id: string;
  type: 'COVER' | 'TEXT' | 'PRICING';
  title: string;
  content: string;
  style: string;
  align: 'left' | 'center' | 'right';
  marginTop: number;
  marginBottom: number;
}

export default function ProposalBuilderPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [doc, setDoc] = useState<(DocumentDto & { company?: CompanyDto; customer?: CustomerDto; author: UserDto }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Proposal Blocks List
  const [blocks, setBlocks] = useState<ProposalBlock[]>([
    {
      id: 'block-cover',
      type: 'COVER',
      title: 'Add Cover Image or Header',
      content: 'Drag & drop an image or select from library',
      style: 'Body Medium',
      align: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    {
      id: 'block-intro',
      type: 'TEXT',
      title: 'Executive Summary',
      content: `Thank you for the opportunity to propose our DocFlow Pro solution for Acme Corp. Based on our previous discussions, we understand your need to streamline document management across your 5 regional offices while maintaining strict compliance with industry standards.\n\nThis proposal outlines a phased implementation approach designed to minimize disruption while rapidly delivering value to your core compliance teams.`,
      style: 'Body Large',
      align: 'left',
      marginTop: 24,
      marginBottom: 24,
    },
    {
      id: 'block-pricing',
      type: 'PRICING',
      title: 'Investment Summary',
      content: JSON.stringify([
        { desc: 'Enterprise License (Annual)', qty: 1, rate: 24000 },
        { desc: 'Implementation & Training Package', qty: 1, rate: 5000 },
        { desc: 'Premium Support SLA', qty: 12, rate: 500 },
      ]),
      style: 'Body Medium',
      align: 'left',
      marginTop: 24,
      marginBottom: 24,
    },
  ]);

  const [activeBlockId, setActiveBlockId] = useState<string>('block-intro');
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProposal = async () => {
      setLoading(true);
      try {
        const data = await api.documents.get(id);
        if (data.type !== 'PROPOSAL') {
          router.push(`/documents/${id}`);
          return;
        }
        setDoc(data);
        if (data.blocks && data.blocks.length > 0) {
          // If database already contains structured proposal blocks, load them
          try {
            const parsedBlocks = data.blocks.map((b) => ({
              id: String(b.sortOrder),
              ...JSON.parse(b.content),
            }));
            setBlocks(parsedBlocks);
            if (parsedBlocks.length > 0) setActiveBlockId(parsedBlocks[0].id);
          } catch {
            // fallback to default demo blocks
          }
        }
      } catch (err: any) {
        setError(err.message || 'Proposal record not found.');
      } finally {
        setLoading(false);
      }
    };
    loadProposal();
  }, [id, router]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const activeBlock = blocks.find((b) => b.id === activeBlockId);

  const handleUpdateActiveBlock = (fields: Partial<Omit<ProposalBlock, 'id' | 'type'>>) => {
    if (!activeBlockId) return;
    setBlocks(
      blocks.map((b) => (b.id === activeBlockId ? { ...b, ...fields } : b))
    );
  };

  const handleAddBlock = (blockType: 'COVER' | 'TEXT' | 'PRICING') => {
    const newBlock: ProposalBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      title: blockType === 'TEXT' ? 'New Section Title' : blockType === 'PRICING' ? 'Pricing Summary' : 'Header Cover Block',
      content: blockType === 'TEXT' ? 'Write section description paragraphs here...' : blockType === 'PRICING' ? JSON.stringify([{ desc: 'Consulting services', qty: 5, rate: 100 }]) : 'Simulated cover asset description',
      style: 'Body Medium',
      align: 'left',
      marginTop: 24,
      marginBottom: 24,
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
    triggerToast(`Added ${blockType.toLowerCase()} segment.`);
  };

  const handleDuplicateBlock = () => {
    if (!activeBlock) return;
    const duplicated: ProposalBlock = {
      ...activeBlock,
      id: `block-${Date.now()}`,
      title: `${activeBlock.title} (Copy)`,
    };
    setBlocks([...blocks, duplicated]);
    setActiveBlockId(duplicated.id);
    triggerToast('Duplicated block.');
  };

  const handleDeleteBlock = () => {
    if (blocks.length <= 1) {
      triggerToast('Proposal requires at least one block element.');
      return;
    }
    const filtered = blocks.filter((b) => b.id !== activeBlockId);
    setBlocks(filtered);
    setActiveBlockId(filtered[0].id);
    triggerToast('Deleted block.');
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const serial = blocks.map((b, idx) => ({
        sortOrder: idx,
        blockType: b.type,
        content: JSON.stringify({
          type: b.type,
          title: b.title,
          content: b.content,
          style: b.style,
          align: b.align,
          marginTop: b.marginTop,
          marginBottom: b.marginBottom,
        }),
      }));
      await api.documents.updateBlocks(id, serial);
      triggerToast('Proposal draft saved to database.');
    } catch (err) {
      triggerToast('Failed to save proposal.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendProposal = async () => {
    try {
      await api.documents.updateStatus(id, 'COMPLETED');
      triggerToast('Proposal sent to client successfully!');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      triggerToast('Error: Failed to send proposal.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background select-none">
        <div className="text-body-md text-on-surface-variant animate-pulse">Loading Proposal Builder...</div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 select-none">
        <div className="bg-error-container text-on-error-container p-6 rounded-lg max-w-sm border border-error/20 flex flex-col gap-2">
          <div className="font-bold text-headline-sm">Error Loading Designer</div>
          <p className="text-body-sm">{error || 'The document record could not be fetched.'}</p>
          <Link href="/" className="text-primary font-semibold hover:underline mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background select-none">
      {/* Toast Alert popup */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface font-semibold text-body-sm px-4 py-2 rounded-lg shadow-lg z-50 transition-all flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          {toast}
        </div>
      )}

      {/* Sidebar Rail */}
      <nav className="fixed left-0 top-0 h-full w-[64px] bg-surface border-r border-outline-variant flex flex-col items-center py-4 z-50">
        <Link href="/" className="mb-6 flex flex-col items-center">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-headline-sm font-bold active:scale-95 transition-transform">
            DF
          </div>
        </Link>
        <div className="flex-1 w-full flex flex-col gap-1">
          <Link href="/" className="flex flex-col items-center justify-center w-full py-4 text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95 transition-transform">
            <span className="material-symbols-outlined">home</span>
          </Link>
          <div className="relative flex flex-col items-center justify-center w-full py-4 text-primary before:absolute before:left-0 before:h-6 before:w-[3px] before:bg-primary before:rounded-r">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          </div>
        </div>
      </nav>

      {/* Workspace wrapper */}
      <div className="flex-1 flex flex-col ml-[64px] min-w-0 h-full mr-[320px]">
        {/* Header Toolbar */}
        <header className="h-12 bg-surface flex justify-between items-center px-6 border-b border-outline-variant shrink-0 select-none z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-outline text-[18px]">description</span>
              {doc.title}
            </h1>
            <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-[10px] uppercase font-bold px-2 py-0.5 rounded">
              {doc.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSaveDraft}
              disabled={saving}
              className="h-8 px-4 border border-outline-variant bg-surface text-on-surface rounded font-label-md text-label-md hover:bg-surface-container-low transition-colors font-semibold active:scale-95"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              onClick={handleSendProposal}
              className="h-8 px-4 bg-primary text-on-primary rounded font-label-md text-label-md hover:bg-primary-fixed-variant transition-colors shadow-sm font-semibold active:scale-95"
            >
              Send Proposal
            </button>
          </div>
        </header>

        {/* Central Editor Canvas Workspace */}
        <main className="flex-1 overflow-y-auto p-6 bg-surface-container-low custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-24">
            
            {/* Render Blocks */}
            {blocks.map((b) => {
              const isActive = b.id === activeBlockId;
              return (
                <div
                  key={b.id}
                  onClick={() => setActiveBlockId(b.id)}
                  style={{ marginTop: `${b.marginTop}px`, marginBottom: `${b.marginBottom}px` }}
                  className={`relative bg-surface border rounded-lg p-8 shadow-sm cursor-pointer transition-all group
                    ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant hover:border-outline'}`}
                >
                  {/* Left drag indicator handles */}
                  <div className="absolute -left-12 top-4 flex flex-col gap-1 items-center bg-surface border border-outline-variant rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant/70 cursor-grab">drag_indicator</span>
                  </div>

                  {/* BLOCK COVER PAGE */}
                  {b.type === 'COVER' && (
                    <div 
                      className={`flex flex-col h-60 justify-center items-center text-center border-2 border-dashed border-outline-variant rounded bg-surface-bright p-4
                        ${b.align === 'left' ? 'items-start text-left' : b.align === 'right' ? 'items-end text-right' : 'items-center text-center'}`}
                    >
                      <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4 text-outline select-none">
                        <span className="material-symbols-outlined text-[32px]">add_photo_alternate</span>
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-on-surface-variant mb-2">{b.title}</h2>
                      <p className="font-body-sm text-[11px] text-outline">{b.content}</p>
                    </div>
                  )}

                  {/* BLOCK TEXT PARAGRAPHS */}
                  {b.type === 'TEXT' && (
                    <div 
                      className="space-y-3"
                      style={{ textAlign: b.align }}
                    >
                      <input 
                        type="text" 
                        value={b.title}
                        onChange={(e) => handleUpdateActiveBlock({ title: e.target.value })}
                        className="font-headline-md text-headline-md font-bold text-on-surface bg-transparent border-none outline-none focus:ring-1 focus:ring-primary p-1 rounded w-full"
                        placeholder="Section Header..."
                      />
                      <textarea
                        value={b.content}
                        onChange={(e) => handleUpdateActiveBlock({ content: e.target.value })}
                        className="font-body-md text-body-md text-on-surface-variant bg-transparent border-none outline-none focus:ring-1 focus:ring-primary p-1 rounded w-full resize-none h-32 leading-relaxed"
                        placeholder="Write section text paragraphs..."
                      />
                    </div>
                  )}

                  {/* BLOCK PRICING TABLE */}
                  {b.type === 'PRICING' && (
                    <div className="space-y-4">
                      <input 
                        type="text" 
                        value={b.title}
                        onChange={(e) => handleUpdateActiveBlock({ title: e.target.value })}
                        className="font-headline-md text-headline-md font-bold text-on-surface bg-transparent border-none outline-none focus:ring-1 focus:ring-primary p-1 rounded w-full"
                      />
                      <div className="border border-outline-variant rounded overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low font-label-md text-label-md text-on-surface-variant border-b border-outline-variant select-none">
                              <th className="py-2.5 px-4 font-semibold">Item / Description</th>
                              <th className="py-2.5 px-4 font-semibold w-24 text-right">Qty</th>
                              <th className="py-2.5 px-4 font-semibold w-32 text-right">Unit Price</th>
                              <th className="py-2.5 px-4 font-semibold w-32 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="font-body-md text-body-md text-on-surface font-mono">
                            {JSON.parse(b.content).map((item: any, index: number) => (
                              <tr key={index} className="border-b border-outline-variant hover:bg-surface-container-lowest">
                                <td className="py-3 px-4 font-sans font-medium">{item.desc}</td>
                                <td className="py-3 px-4 text-right">{item.qty}</td>
                                <td className="py-3 px-4 text-right">${item.rate.toLocaleString()}</td>
                                <td className="py-3 px-4 text-right font-semibold text-primary">${(item.qty * item.rate).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {/* Block Appender Options */}
            <div className="flex gap-3 justify-center select-none pt-4">
              <button
                onClick={() => handleAddBlock('TEXT')}
                className="h-10 px-4 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container text-body-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">subject</span>
                Add Text Section
              </button>
              <button
                onClick={() => handleAddBlock('PRICING')}
                className="h-10 px-4 border border-outline-variant rounded-lg bg-surface hover:bg-surface-container text-body-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">table_chart</span>
                Add Pricing Matrix
              </button>
            </div>

          </div>
        </main>
      </div>

      {/* Right Contextual Inspector Drawer */}
      <aside className="fixed right-0 top-0 h-screen w-[320px] bg-surface border-l border-outline-variant flex flex-col z-40 overflow-hidden shadow-sm select-none">
        <div className="h-12 border-b border-outline-variant flex items-center px-4 bg-surface-bright sticky top-0 shrink-0">
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[18px]">tune</span>
            Block Properties
          </h3>
        </div>

        {activeBlock ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            
            {/* Active Block indicator card */}
            <div className="bg-surface-container-low rounded p-3.5 flex items-start gap-3">
              <div className="mt-0.5 text-primary">
                <span className="material-symbols-outlined text-[20px]">subject</span>
              </div>
              <div>
                <h4 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Active Element</h4>
                <p className="font-body-sm text-body-sm text-on-surface font-semibold mt-0.5">{activeBlock.type} BLOCK</p>
              </div>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            {/* Typography style selector */}
            <section className="space-y-3">
              <h4 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold border-b border-outline-variant pb-2">Typography</h4>
              <div className="flex justify-between items-center text-body-sm">
                <label className="font-medium text-on-surface-variant">Text Style</label>
                <select
                  value={activeBlock.style}
                  onChange={(e) => handleUpdateActiveBlock({ style: e.target.value })}
                  className="w-32 h-8 px-2 border border-outline-variant rounded bg-surface font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-primary text-on-surface font-semibold"
                >
                  <option value="Body Large">Body Large</option>
                  <option value="Body Medium">Body Medium</option>
                  <option value="Body Small">Body Small</option>
                </select>
              </div>

              {/* Text Alignment actions grid */}
              <div className="flex justify-between items-center text-body-sm pt-2">
                <label className="font-medium text-on-surface-variant">Alignment</label>
                <div className="flex border border-outline-variant rounded overflow-hidden">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => handleUpdateActiveBlock({ align })}
                      className={`w-8 h-8 flex items-center justify-center hover:bg-surface-container transition-colors border-r last:border-r-0 border-outline-variant
                        ${activeBlock.align === align ? 'bg-surface-container-high text-primary' : 'bg-surface text-on-surface-variant/60'}`}
                      title={`${align.toUpperCase()} Alignment`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {align === 'left' ? 'format_align_left' : align === 'right' ? 'format_align_right' : 'format_align_center'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            {/* Margins Sliders */}
            <section className="space-y-4">
              <h4 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold border-b border-outline-variant pb-2">Spacing</h4>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-semibold">Top Margin (px)</label>
                  <input
                    type="number"
                    value={activeBlock.marginTop}
                    onChange={(e) => handleUpdateActiveBlock({ marginTop: Number(e.target.value) || 0 })}
                    className="w-full h-8 border border-outline-variant rounded bg-surface font-body-sm text-body-sm px-2 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-semibold">Bottom Margin (px)</label>
                  <input
                    type="number"
                    value={activeBlock.marginBottom}
                    onChange={(e) => handleUpdateActiveBlock({ marginBottom: Number(e.target.value) || 0 })}
                    className="w-full h-8 border border-outline-variant rounded bg-surface font-body-sm text-body-sm px-2 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Block level actions */}
            <section className="space-y-2 mt-auto pt-4 border-t border-outline-variant">
              <button 
                onClick={handleDuplicateBlock}
                className="w-full h-8 flex items-center justify-center gap-1.5 border border-outline-variant rounded text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors font-semibold active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span> 
                Duplicate Block
              </button>
              <button 
                onClick={handleDeleteBlock}
                className="w-full h-8 flex items-center justify-center gap-1.5 border border-error-container text-error rounded font-label-md text-label-md hover:bg-error-container/20 transition-colors font-semibold active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span> 
                Delete Block
              </button>
            </section>

          </div>
        ) : (
          <div className="text-center text-body-sm text-on-surface-variant py-8 italic">
            Select a block elements canvas to inspect.
          </div>
        )}
      </aside>
    </div>
  );
}
