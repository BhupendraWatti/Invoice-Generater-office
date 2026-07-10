'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import ContextualInspector from '../../components/shared/ContextualInspector';
import { api } from '../../lib/api';
import { TemplateDto } from '@docflow/shared-types';
import * as Dialog from '@radix-ui/react-dialog';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'INVOICE' | 'PROPOSAL' | 'CONTRACT'>('INVOICE');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDto | null>(null);

  // Designer Workspace Builder states
  const [designerMode, setDesignerMode] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [marginSize, setMarginSize] = useState(15);
  const [guidesEnabled, setGuidesEnabled] = useState(true);
  
  // Visual template blocks list
  const [layoutBlocks, setLayoutBlocks] = useState([
    { id: 'header', title: 'Branding Logo & Header', visible: true, height: 80 },
    { id: 'client', title: 'Client Bill-To Information', visible: true, height: 60 },
    { id: 'pricing', title: 'Spreadsheet Item Calculator', visible: true, height: 120 },
    { id: 'stamps', title: 'Corporate Stamp & Signature Seals', visible: true, height: 70 },
    { id: 'stub', title: 'QR Code Payment stub stub', visible: true, height: 60 },
  ]);

  // New Template Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await api.templates.list();
      setTemplates(list);
      if (list.length > 0) {
        const filtered = list.filter((t) => t.category === activeCategory);
        if (filtered.length > 0) {
          setSelectedId(filtered[0].id);
        } else {
          setSelectedId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedId) {
      const found = templates.find((t) => t.id === selectedId);
      if (found) {
        setSelectedTemplate(found);
      }
    } else {
      setSelectedTemplate(null);
    }
  }, [selectedId, templates]);

  const handleUpdateTemplate = async (fields: Partial<Omit<TemplateDto, 'id' | 'lastEdited'>>) => {
    if (!selectedId || !selectedTemplate) return;
    
    setTemplates((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, ...fields } : t))
    );

    try {
      await api.templates.update(selectedId, fields);
      triggerToast('Template configuration updated.');
    } catch (err) {
      console.error('Failed to update template:', err);
      triggerToast('Error: Failed to save changes.');
      loadTemplates();
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormLoading(true);
    try {
      const newTemp = await api.templates.create({
        name,
        category: activeCategory,
        isDefault: false,
        accentColor: '#3525CD',
        primaryFont: 'inter',
        showPaymentStub: true,
        includeTermsPage: false,
        compactLineItems: true,
      });
      setName('');
      setCreateOpen(false);
      triggerToast(`Template "${name}" drafted successfully.`);
      
      const list = await api.templates.list();
      setTemplates(list);
      setSelectedId(newTemp.id);
    } catch (err) {
      console.error('Failed to create template:', err);
      triggerToast('Failed to draft template.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template layout?')) return;
    try {
      await api.templates.delete(id);
      triggerToast('Template layout deleted.');
      if (selectedId === id) setSelectedId(null);
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      triggerToast('Error deleting template.');
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Drag and Drop block reordering helpers
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const blocks = [...layoutBlocks];
    const temp = blocks[index];
    blocks[index] = blocks[index - 1];
    blocks[index - 1] = temp;
    setLayoutBlocks(blocks);
  };

  const handleMoveDown = (index: number) => {
    if (index === layoutBlocks.length - 1) return;
    const blocks = [...layoutBlocks];
    const temp = blocks[index];
    blocks[index] = blocks[index + 1];
    blocks[index + 1] = temp;
    setLayoutBlocks(blocks);
  };

  const handleToggleBlockVisibility = (id: string) => {
    setLayoutBlocks(layoutBlocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  };

  const filteredTemplates = templates.filter((t) => t.category === activeCategory);

  const fontPresets = [
    { value: 'inter', label: 'Inter (Sans-serif)' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'merriweather', label: 'Merriweather (Serif)' },
    { value: 'mono', label: 'Space Mono' },
  ];

  const colorPresets = ['#3525CD', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <MainLayout>
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface font-semibold text-body-sm px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center gap-2 select-none">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          {toastMessage}
        </div>
      )}
      <main className="flex h-full w-full overflow-hidden bg-background">
        {/* Workspace Column - Gallery / Designer View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header context and tabs */}
          <header className="h-12 bg-surface border-b border-outline-variant flex items-center justify-between px-6 shrink-0 z-10 select-none">
            <div className="flex items-center gap-4 h-full">
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {designerMode ? 'Visual Template Customizer' : 'Template Library'}
              </h1>
              <div className="h-4 w-px bg-outline-variant"></div>
              
              {!designerMode ? (
                <div className="flex gap-4 h-full">
                  {(['INVOICE', 'PROPOSAL', 'CONTRACT'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat);
                        const catTemplates = templates.filter((t) => t.category === cat);
                        if (catTemplates.length > 0) {
                          setSelectedId(catTemplates[0].id);
                        }
                      }}
                      className={`font-body-sm text-body-sm h-full flex items-center px-1 border-b-2 transition-all cursor-pointer
                        ${activeCategory === cat 
                          ? 'text-primary font-bold border-primary' 
                          : 'text-on-surface-variant hover:text-primary border-transparent'}`}
                    >
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}s
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-body-sm text-on-surface-variant font-semibold">Editing: {selectedTemplate?.name}</span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {designerMode ? (
                <button 
                  onClick={() => setDesignerMode(false)}
                  className="h-8 px-3 bg-surface border border-outline-variant font-label-md text-label-md rounded hover:bg-surface-container transition-colors shadow-sm font-semibold active:scale-95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Exit Designer
                </button>
              ) : (
                <button 
                  onClick={() => setCreateOpen(true)}
                  className="h-8 px-3 bg-primary text-on-primary font-label-md text-label-md rounded flex items-center gap-1 hover:bg-primary-fixed-variant transition-colors shadow-sm font-semibold active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Draft Layout
                </button>
              )}
            </div>
          </header>

          {/* Canvas Gallery or Layout Designer */}
          <section className="flex-1 overflow-y-auto p-margin-page bg-surface-bright custom-scrollbar">
            
            {loading ? (
              <div className="p-8 text-center text-body-sm text-on-surface-variant">Loading gallery layouts...</div>
            ) : !designerMode ? (
              /* Gallery view */
              filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-body-sm text-on-surface-variant italic select-none">
                  No templates drafted in this category directory.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((temp) => (
                    <div
                      key={temp.id}
                      onClick={() => setSelectedId(temp.id)}
                      className={`group relative bg-surface border rounded-lg overflow-hidden cursor-pointer flex flex-col h-[300px] transition-all hover:shadow-md
                        ${selectedId === temp.id ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant hover:border-outline'}`}
                    >
                      {temp.isDefault && (
                        <div className="absolute top-3 left-3 bg-primary text-on-primary px-2 py-0.5 rounded font-label-sm text-[10px] flex items-center gap-1 z-10 shadow-sm select-none">
                          <span className="material-symbols-outlined text-[12px] filled">check_circle</span>
                          Default
                        </div>
                      )}

                      <div className="flex-1 bg-surface-container-lowest relative overflow-hidden flex items-center justify-center p-4">
                        <div className="w-full h-full bg-white border border-outline-variant shadow-sm rounded flex flex-col p-4 opacity-90 transition-transform group-hover:scale-[1.02]">
                          <div 
                            className="w-1/3 h-4 rounded mb-4"
                            style={{ backgroundColor: `${temp.accentColor}25` }}
                          ></div>
                          <div className="w-2/3 h-2 bg-surface-variant rounded mb-2"></div>
                          <div className="w-1/2 h-2 bg-surface-variant rounded mb-6"></div>
                          <div className="flex-1 border-t border-outline-variant pt-4 flex flex-col gap-2">
                            <div className="w-full h-2 bg-surface-container rounded"></div>
                            <div className="w-full h-2 bg-surface-container rounded"></div>
                          </div>
                          <div 
                            className="mt-auto self-end w-1/4 h-4 rounded"
                            style={{ backgroundColor: `${temp.accentColor}15` }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-outline-variant bg-surface flex justify-between items-center select-none">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">{temp.name}</h3>
                          <p className="font-body-sm text-[11px] text-on-surface-variant">{temp.lastEdited}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(temp.id);
                            }}
                            className="w-7 h-7 rounded hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Interactive Visual Drag-and-Drop Block Designer Canvas */
              <div className="flex gap-6 max-w-4xl mx-auto items-start select-none">
                
                {/* Visual Canvas Page sheet */}
                <div 
                  style={{ padding: `${marginSize}mm` }}
                  className="flex-1 bg-white border border-outline-variant shadow-xl rounded-lg flex flex-col relative transition-all min-h-[550px]"
                >
                  {/* Grid snapping visual guides */}
                  {guidesEnabled && (
                    <div 
                      style={{ backgroundSize: `${gridSize}px ${gridSize}px` }}
                      className="absolute inset-0 pointer-events-none opacity-[0.03] rounded-lg bg-[radial-gradient(#3525CD_1px,transparent_1px)]"
                    ></div>
                  )}

                  {/* Header variable placeholder */}
                  <div className="text-[10px] text-primary/30 font-bold border-b border-primary/20 pb-1 mb-4 text-center tracking-wider">
                    PRINT CANVAS MOCK MARGINS OUTLINES ({marginSize}mm)
                  </div>

                  {/* Render reorderable blocks */}
                  <div className="flex flex-col gap-3">
                    {layoutBlocks.map((block, idx) => {
                      if (!block.visible) return null;
                      return (
                        <div 
                          key={block.id}
                          style={{ height: `${block.height}px` }}
                          className="border border-outline-variant hover:border-primary rounded p-3 flex items-center justify-between group bg-surface relative"
                        >
                          <div>
                            <span className="text-[10px] text-primary uppercase tracking-wider font-bold">Section Block</span>
                            <div className="font-semibold text-body-md text-on-surface mt-0.5">{block.title}</div>
                          </div>
                          
                          {/* Reordering and hide selectors */}
                          <div className="flex items-center gap-1 bg-surface-container rounded border border-outline-variant px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleMoveUp(idx)}
                              className="p-1 hover:text-primary transition-colors"
                              title="Move section up"
                            >
                              <span className="material-symbols-outlined text-[15px]">arrow_upward</span>
                            </button>
                            <button 
                              onClick={() => handleMoveDown(idx)}
                              className="p-1 hover:text-primary transition-colors"
                              title="Move section down"
                            >
                              <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                            </button>
                            <button 
                              onClick={() => handleToggleBlockVisibility(block.id)}
                              className="p-1 hover:text-error transition-colors"
                              title="Hide block"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Left panel tokens selector */}
                <div className="w-[260px] flex flex-col gap-4 text-body-sm font-semibold shrink-0">
                  
                  {/* Grid Alignment details */}
                  <div className="bg-surface border border-outline-variant rounded-lg p-4 shadow-sm space-y-4">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Designer Settings</span>
                    
                    {/* Snap guide */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Snap to Grid</span>
                        <span className="font-mono text-primary font-bold">{gridSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="4" 
                        max="24" 
                        step="4"
                        value={gridSize} 
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="w-full accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Margins */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span>Margins Spacing</span>
                        <span className="font-mono text-primary font-bold">{marginSize}mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="30" 
                        value={marginSize} 
                        onChange={(e) => setMarginSize(Number(e.target.value))}
                        className="w-full accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span>Rulers & Guides</span>
                      <button
                        onClick={() => setGuidesEnabled(!guidesEnabled)}
                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none
                          ${guidesEnabled ? 'bg-primary' : 'bg-surface-variant'}`}
                      >
                        <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow transition duration-200
                          ${guidesEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Variables Helper */}
                  <div className="bg-surface border border-outline-variant rounded-lg p-4 shadow-sm space-y-3">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Dynamic Tokens (Double Click)</span>
                    <div className="space-y-1.5 font-mono text-[9px] text-primary">
                      <div className="bg-surface-container border border-outline-variant/60 p-1 rounded select-all cursor-pointer hover:border-primary">{"{company.name}"}</div>
                      <div className="bg-surface-container border border-outline-variant/60 p-1 rounded select-all cursor-pointer hover:border-primary">{"{customer.name}"}</div>
                      <div className="bg-surface-container border border-outline-variant/60 p-1 rounded select-all cursor-pointer hover:border-primary">{"{document.grandTotal}"}</div>
                      <div className="bg-surface-container border border-outline-variant/60 p-1 rounded select-all cursor-pointer hover:border-primary">{"{customFields.vat_number}"}</div>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </section>
        </div>

        {/* Right Pane Contextual Inspector */}
        <ContextualInspector title="Template Details">
          {!selectedTemplate ? (
            <div className="text-center text-body-sm text-on-surface-variant py-4 italic select-none">
              No template active.
            </div>
          ) : (
            <div className="flex flex-col gap-5 text-body-sm select-none">
              
              {/* Entity Title */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                  {selectedTemplate.category} TEMPLATE
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface leading-tight font-semibold">
                  {selectedTemplate.name}
                </h3>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateTemplate({ isDefault: !selectedTemplate.isDefault })}
                    className={`h-7 px-3 border text-label-md font-semibold rounded transition-colors text-xs flex items-center gap-1
                      ${selectedTemplate.isDefault
                        ? 'bg-primary text-on-primary border-primary hover:bg-primary-fixed-variant'
                        : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-container'}`}
                  >
                    {selectedTemplate.isDefault ? 'Default Layout' : 'Make Default'}
                  </button>
                </div>
              </div>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              {/* Brand Variables */}
              <section className="flex flex-col gap-3.5">
                <h4 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold flex justify-between items-center">
                  Brand Configs
                  <span className="material-symbols-outlined text-[16px]">palette</span>
                </h4>

                {/* Accent Color picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md text-on-surface-variant font-medium flex justify-between">
                    Theme Primary Color
                    <span className="font-mono text-[10px] uppercase font-semibold text-primary">
                      {selectedTemplate.accentColor}
                    </span>
                  </label>
                  <div className="flex gap-2 items-center">
                    {colorPresets.map((color) => (
                      <div
                        key={color}
                        onClick={() => handleUpdateTemplate({ accentColor: color })}
                        className={`w-6 h-6 rounded-full border-2 border-surface cursor-pointer hover:scale-110 transition-transform shadow-sm
                          ${selectedTemplate.accentColor === color ? 'ring-2 ring-primary ring-offset-0.5' : ''}`}
                        style={{ backgroundColor: color }}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Font Selector */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-label-md text-on-surface-variant font-medium">Font Family</label>
                  <select
                    value={selectedTemplate.primaryFont}
                    onChange={(e) => handleUpdateTemplate({ primaryFont: e.target.value })}
                    className="w-full h-8 px-2 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface font-semibold"
                  >
                    {fontPresets.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              {/* Layout Properties */}
              <section className="flex flex-col gap-3.5">
                <h4 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold flex justify-between items-center">
                  Layout Properties
                  <span className="material-symbols-outlined text-[16px]">view_quilt</span>
                </h4>

                {/* Stub Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-on-surface font-medium">Show Payment Stub</span>
                  <button
                    onClick={() => handleUpdateTemplate({ showPaymentStub: !selectedTemplate.showPaymentStub })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                      ${selectedTemplate.showPaymentStub ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow transition duration-200 ease-in-out
                        ${selectedTemplate.showPaymentStub ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Terms Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-on-surface font-medium">Include Terms Page</span>
                  <button
                    onClick={() => handleUpdateTemplate({ includeTermsPage: !selectedTemplate.includeTermsPage })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                      ${selectedTemplate.includeTermsPage ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow transition duration-200 ease-in-out
                        ${selectedTemplate.includeTermsPage ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Compact Toggle */}
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-on-surface font-medium">Compact Line Items</span>
                  <button
                    onClick={() => handleUpdateTemplate({ compactLineItems: !selectedTemplate.compactLineItems })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                      ${selectedTemplate.compactLineItems ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow transition duration-200 ease-in-out
                        ${selectedTemplate.compactLineItems ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </section>

              {/* Open/Exit visual designer toggle trigger */}
              <div className="mt-auto pt-4 border-t border-outline-variant">
                {designerMode ? (
                  <button 
                    onClick={() => {
                      triggerToast('Layout block customizations saved.');
                      setDesignerMode(false);
                    }}
                    className="w-full h-9 bg-primary text-on-primary font-semibold text-label-md rounded flex items-center justify-center gap-1.5 hover:bg-primary-fixed-variant transition-colors shadow-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Layout Block
                  </button>
                ) : (
                  <button 
                    onClick={() => setDesignerMode(true)}
                    className="w-full h-9 bg-primary text-on-primary font-semibold text-label-md rounded flex items-center justify-center gap-1.5 hover:bg-primary-fixed-variant transition-colors shadow-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_document</span>
                    Open Designer Block
                  </button>
                )}
              </div>
            </div>
          )}
        </ContextualInspector>
      </main>

      {/* Creation Modal Dialog */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-[25%] left-1/2 -translate-x-1/2 w-full max-w-sm bg-surface border border-outline-variant rounded-xl shadow-xl z-50 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant select-none">
              <Dialog.Title className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Draft New Template
              </Dialog.Title>
              <Dialog.Close className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4 text-body-sm">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Layout Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elegant Bold Split"
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1 select-none">
                <label className="text-label-md text-on-surface-variant font-medium">Draft Category</label>
                <input
                  type="text"
                  value={activeCategory}
                  disabled
                  className="px-3 py-1.5 bg-surface-container-low/50 border border-outline-variant rounded text-on-surface-variant/80 text-body-sm cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-primary text-on-primary font-semibold py-2 rounded hover:bg-primary-fixed-variant transition-colors text-body-sm mt-2 disabled:bg-primary/50"
              >
                {formLoading ? 'Drafting...' : 'Create Draft'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </MainLayout>
  );
}
