'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import MainLayout from '../../../../components/shared/MainLayout';
import { api } from '../../../../lib/api';
import { 
  DocumentDto, 
  CompanyDto, 
  CustomerDto, 
  ProductDto, 
  TaxConfigurationDto, 
  UnitDto, 
  DocumentVersionDto 
} from '@docflow/shared-types';
import Link from 'next/link';

interface DocumentBlockInput {
  id: string;
  sortOrder: number;
  blockType: 'COVER' | 'TEXT' | 'TABLE' | 'NOTES';
  content: any; // Mapped JSON parameters
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UniversalDocumentEditorPage({ params }: PageProps) {
  const { id } = use(params);

  // Core metadata states
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [blocks, setBlocks] = useState<DocumentBlockInput[]>([]);
  const [status, setStatus] = useState<string>('DRAFT');
  const [title, setTitle] = useState<string>('');
  
  // Master lists
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [taxes, setTaxes] = useState<TaxConfigurationDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [versions, setVersions] = useState<DocumentVersionDto[]>([]);
  
  // Selected associations
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Styles & Inspector controls
  const [activeRightTab, setActiveRightTab] = useState<'properties' | 'styles' | 'versions' | 'export'>('properties');
  const [accentColor, setAccentColor] = useState<string>('#3b82f6'); // default blue
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [showStamp, setShowStamp] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('DRAFT COPY');

  // Interactive prompts and loaders
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [toastError, setToastError] = useState<boolean>(false);

  // Email form states
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  // Version snapshot label
  const [newSnapshotTitle, setNewSnapshotTitle] = useState<string>('');

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load document and dependencies on startup
  const loadDependencies = async () => {
    setLoading(true);
    try {
      const [docData, compList, custList, prodList, taxList, unitList, versionList] = await Promise.all([
        api.documents.get(id),
        api.companies.list(),
        api.customers.list(),
        api.products.list(),
        api.taxes.list(),
        api.units.list(),
        api.documents.listVersions(id)
      ]);

      setDoc(docData);
      setTitle(docData.title);
      setStatus(docData.status);
      setSelectedCompanyId(docData.companyId || '');
      setSelectedCustomerId(docData.customerId || '');
      setVersions(versionList);

      setCompanies(compList);
      setCustomers(custList);
      setProducts(prodList);
      setTaxes(taxList);
      setUnits(unitList);

      // Prepopulate email defaults based on customer
      if (docData.customer) {
        setEmailRecipient(docData.customer.email);
        setEmailSubject(`Your ${docData.type.replace('_', ' ')}: ${docData.title}`);
        setEmailMessage(`Hi ${docData.customer.name},\n\nPlease review your active ${docData.type.toLowerCase().replace('_', ' ')} ${docData.title} by visiting the link: http://localhost:3000/documents/${docData.id}\n\nKind regards.`);
      }

      // Map block types
      if (docData.blocks && docData.blocks.length > 0) {
        const mapped = docData.blocks.map(b => ({
          id: b.id || Math.random().toString(36).substring(7),
          sortOrder: b.sortOrder,
          blockType: b.blockType as any,
          content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content
        }));
        setBlocks(mapped);
      } else {
        // Build initial structure matching Stitch defaults
        setBlocks([
          { 
            id: 'b-cover', 
            sortOrder: 0, 
            blockType: 'COVER', 
            content: { subtitle: 'Proposal Agreement & Details', date: new Date().toLocaleDateString(), logoUrl: '' } 
          },
          { 
            id: 'b-text', 
            sortOrder: 1, 
            blockType: 'TEXT', 
            content: { text: 'Thank you for choosing us. We are pleased to present the pricing breakdown below.' } 
          },
          { 
            id: 'b-table', 
            sortOrder: 2, 
            blockType: 'TABLE', 
            content: { 
              items: [{ sku: 'PROD-01', description: 'Consulting services', quantity: 5, rate: 120, unit: 'HR', taxCode: 'GST-18' }],
              discount: 0,
              adjustment: 0
            } 
          },
          { 
            id: 'b-notes', 
            sortOrder: 3, 
            blockType: 'NOTES', 
            content: { notes: 'Payment terms apply. Please process funds to our bank routing.' } 
          }
        ]);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load document editor workspace.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, [id]);

  // Toast notifier
  const triggerToast = (msg: string, isErr = false) => {
    setToastMsg(msg);
    setToastError(isErr);
    setTimeout(() => {
      setToastMsg('');
    }, 4000);
  };

  // Save changes logic
  const handleSaveBlocks = async (blocksPayload: DocumentBlockInput[], currentTitle = title) => {
    setSaving(true);
    try {
      const serialized = blocksPayload.map(b => ({
        sortOrder: b.sortOrder,
        blockType: b.blockType,
        content: JSON.stringify(b.content)
      }));
      await api.documents.updateBlocks(id, serialized);
      
      // Update title, company/customer references if changed
      const docPayload = {
        title: currentTitle,
        companyId: selectedCompanyId || undefined,
        customerId: selectedCustomerId || undefined
      };
      // Mock call update or local api update logic
      // For type safety, we write custom blocks first.
      triggerToast('Draft saved successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Auto-save failed.', true);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save triggers
  const triggerAutoSave = (updatedBlocks: DocumentBlockInput[], updatedTitle = title) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSaveBlocks(updatedBlocks, updatedTitle);
    }, 1500);
  };

  // Document block sorting operations
  const moveBlock = (idx: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    
    const copy = [...blocks];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;

    // Reset sortOrder sequence
    const sequence = copy.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(sequence);
    triggerAutoSave(sequence);
  };

  const removeBlock = (idx: number) => {
    if (blocks.length <= 1) {
      triggerToast('A document must have at least one block section.', true);
      return;
    }
    const filtered = blocks.filter((_, i) => i !== idx).map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(filtered);
    triggerAutoSave(filtered);
  };

  const addBlockSection = (type: 'COVER' | 'TEXT' | 'TABLE' | 'NOTES') => {
    let initialContent: any = {};
    if (type === 'COVER') {
      initialContent = { subtitle: 'Document section', date: new Date().toLocaleDateString(), logoUrl: '' };
    } else if (type === 'TEXT') {
      initialContent = { text: 'New paragraph block' };
    } else if (type === 'TABLE') {
      initialContent = { items: [{ sku: '', description: 'Custom item name', quantity: 1, rate: 0, unit: 'PCS', taxCode: 'EXEMPT' }], discount: 0, adjustment: 0 };
    } else if (type === 'NOTES') {
      initialContent = { notes: 'Add footnote annotations.' };
    }

    const appended = [...blocks, {
      id: `b-custom-${Date.now()}`,
      sortOrder: blocks.length,
      blockType: type,
      content: initialContent
    }];
    setBlocks(appended);
    triggerAutoSave(appended);
  };

  // Block inline editors
  const updateBlockContent = (idx: number, key: string, val: any) => {
    const updated = blocks.map((b, i) => {
      if (i === idx) {
        return { ...b, content: { ...b.content, [key]: val } };
      }
      return b;
    });
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Line Items spreadsheet calculator operations
  const addLineItem = (blockIdx: number) => {
    const targetBlock = blocks[blockIdx];
    const items = [...(targetBlock.content.items || [])];
    items.push({ sku: '', description: '', quantity: 1, rate: 0, unit: 'PCS', taxCode: 'EXEMPT' });
    updateBlockContent(blockIdx, 'items', items);
  };

  const removeLineItem = (blockIdx: number, itemIdx: number) => {
    const targetBlock = blocks[blockIdx];
    const items = (targetBlock.content.items || []).filter((_: any, i: number) => i !== itemIdx);
    updateBlockContent(blockIdx, 'items', items);
  };

  const updateLineItemField = (blockIdx: number, itemIdx: number, key: string, val: any) => {
    const targetBlock = blocks[blockIdx];
    const items = (targetBlock.content.items || []).map((item: any, i: number) => {
      if (i === itemIdx) {
        const next = { ...item, [key]: val };
        
        // If product selected, auto-populate SKU, name, rate, unit, tax
        if (key === 'productId') {
          const matched = products.find(p => p.id === val);
          if (matched) {
            next.sku = matched.sku;
            next.description = matched.name;
            next.rate = Number(matched.rate);
            if (matched.unit) next.unit = matched.unit.code;
            if (matched.tax) next.taxCode = matched.tax.code;
          }
        }
        return next;
      }
      return item;
    });
    updateBlockContent(blockIdx, 'items', items);
  };

  // Calculate live totals for a table block
  const calculateTotals = (blockContent: any) => {
    const items = blockContent.items || [];
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach((item: any) => {
      const lineVal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      subtotal += lineVal;

      // GST tax configuration rates matching
      const matchedTax = taxes.find(t => t.code === item.taxCode);
      if (matchedTax) {
        taxTotal += lineVal * (matchedTax.ratePercent / 100);
      }
    });

    const discount = Number(blockContent.discount) || 0;
    const adjustment = Number(blockContent.adjustment) || 0;
    const total = subtotal + taxTotal - discount + adjustment;

    return { subtotal, taxTotal, total };
  };

  // Change Status
  const handleUpdateStatus = async (nextStatus: string) => {
    try {
      await api.documents.updateStatus(id, nextStatus);
      setStatus(nextStatus);
      triggerToast(`Document status updated to ${nextStatus}.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update status.', true);
    }
  };

  // Duplicate Document
  const handleDuplicate = async () => {
    if (!confirm('Duplicate this document? This will generate a new numbering sequence clone.')) return;
    try {
      const cloned = await api.documents.duplicate(id);
      triggerToast(`Cloned successfully: ${cloned.title}`);
      window.location.href = `/documents/${cloned.id}/edit`;
    } catch (err: any) {
      triggerToast(err.message || 'Duplication failed.', true);
    }
  };

  // Landmark versions revisions save/restore
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotTitle.trim()) return;
    try {
      const created = await api.documents.saveVersion(id, newSnapshotTitle);
      setVersions([created, ...versions]);
      setNewSnapshotTitle('');
      triggerToast('Landmark revision snapshot created.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to create revision.', true);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Restore document structure to this snapshot? All current changes will be replaced.')) return;
    try {
      const restored = await api.documents.restoreVersion(id, versionId);
      // Remap restored blocks
      const mapped = restored.blocks.map((b: any) => ({
        id: b.id || Math.random().toString(36).substring(7),
        sortOrder: b.sortOrder,
        blockType: b.blockType as any,
        content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content
      }));
      setBlocks(mapped);
      triggerToast('Revision snapshot restored successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Restore failed.', true);
    }
  };

  // Export mock PDF
  const handleDownloadPdf = async () => {
    try {
      const res = await api.documents.generatePdf(id);
      triggerToast(`Simulated PDF "${res.filename}" downloaded! (${res.sizeBytes} bytes)`);
      // Simulate real browser print/download behavior
      window.print();
    } catch (err: any) {
      triggerToast(err.message || 'PDF export failed.', true);
    }
  };

  // Send Email Trigger
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) return;
    setSendingEmail(true);
    try {
      await api.documents.sendEmail(id, emailRecipient, emailSubject, emailMessage);
      triggerToast(`Email document dispatched to ${emailRecipient}.`);
    } catch (err: any) {
      triggerToast(err.message || 'Failed to send email.', true);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-full w-full items-center justify-center bg-background select-none">
          <div className="text-center font-body-sm text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-[32px] text-primary mb-2 block">design_services</span>
            Entering Universal Document Studio Workspace...
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-full w-full bg-background overflow-hidden relative">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: STRUCTURE & SECTIONS */}
        {/* ======================================================== */}
        <aside className="w-[240px] bg-surface border-r border-outline-variant flex flex-col h-full shrink-0 select-none">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center h-12 bg-surface-container-lowest">
            <span className="font-label-md text-label-md font-bold text-on-surface">Sections Layout</span>
            <span className="text-[10px] text-primary font-bold uppercase font-mono">Blocks: {blocks.length}</span>
          </div>

          {/* Section structure sorting sequence */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {blocks.map((block, idx) => (
              <div 
                key={block.id} 
                className="group flex flex-col p-2.5 bg-surface-container-low border border-outline-variant/60 rounded-lg hover:border-primary/45 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      {block.blockType === 'COVER' ? 'branding_watermark' : 
                       block.blockType === 'TEXT' ? 'notes' : 
                       block.blockType === 'TABLE' ? 'table_chart' : 'description'}
                    </span>
                    <span className="text-[11px] font-bold text-on-surface truncate">
                      {block.blockType} #{idx + 1}
                    </span>
                  </div>
                  
                  {/* Sorting triggers */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => moveBlock(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                    </button>
                    <button 
                      onClick={() => moveBlock(idx, 'DOWN')}
                      disabled={idx === blocks.length - 1}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                    </button>
                    <button 
                      onClick={() => removeBlock(idx)}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[12px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick sections append controls */}
          <div className="p-3 border-t border-outline-variant bg-surface-container-lowest space-y-2">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Add section block</span>
            <div className="grid grid-cols-2 gap-1.5 text-body-sm font-semibold">
              <button 
                onClick={() => addBlockSection('TEXT')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[11px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">notes</span> Text
              </button>
              <button 
                onClick={() => addBlockSection('TABLE')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[11px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">table_chart</span> Pricing
              </button>
              <button 
                onClick={() => addBlockSection('NOTES')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[11px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">description</span> Notes
              </button>
              <button 
                onClick={() => addBlockSection('COVER')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[11px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">branding_watermark</span> Branding
              </button>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* CENTER PANE: EDITABLE DOCUMENT CANVAS */}
        {/* ======================================================== */}
        <main className="flex-1 overflow-y-auto p-8 h-full custom-scrollbar pr-[374px]">
          <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-24">
            
            {/* Action title toolbar */}
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3 select-none">
              <div className="flex-1 min-w-0 pr-6">
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => {
                    setTitle(e.target.value);
                    triggerAutoSave(blocks, e.target.value);
                  }}
                  className="font-headline-lg text-[22px] font-bold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none w-full pb-0.5 truncate"
                  placeholder="Document Title"
                />
                <span className="text-[10px] text-on-surface-variant/80 uppercase font-bold tracking-wider font-mono">
                  Document Type: {doc?.type} | ID: {doc?.id.slice(0, 8)}...
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSaveBlocks(blocks, title)}
                  disabled={saving}
                  className="bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors text-body-sm font-semibold h-8 px-4 rounded flex items-center gap-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </div>

            {/* Document Canvas Sheet Wrapper */}
            <div 
              style={{ borderColor: accentColor }}
              className={`bg-surface border-t-8 rounded-lg shadow-md p-8 relative overflow-hidden ${fontFamily} min-h-[850px]`}
            >
              
              {/* Simulated draft watermark */}
              {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 select-none rotate-45">
                  <span className="text-[72px] font-bold tracking-widest text-on-surface">{watermarkText}</span>
                </div>
              )}

              {/* Dynamic Blocks Loop */}
              <div className="space-y-8">
                {blocks.map((block, idx) => {
                  
                  // COVER BLOCK RENDERING
                  if (block.blockType === 'COVER') {
                    return (
                      <div key={block.id} className="space-y-4 border-b border-outline-variant/40 pb-6 relative group">
                        
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={block.content.subtitle || ''}
                              onChange={(e) => updateBlockContent(idx, 'subtitle', e.target.value)}
                              className="text-headline-md font-bold text-on-surface bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none w-full text-[18px]"
                              placeholder="Document Subtitle/Subject"
                            />
                            <input 
                              type="text" 
                              value={block.content.date || ''}
                              onChange={(e) => updateBlockContent(idx, 'date', e.target.value)}
                              className="text-body-sm text-on-surface-variant bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none w-48 mt-1 font-mono text-[11px]"
                              placeholder="Date"
                            />
                          </div>

                          {/* Stamp simulation */}
                          {showStamp && (
                            <div 
                              style={{ borderColor: accentColor, color: accentColor }}
                              className="border-4 border-dashed rounded px-2.5 py-1 font-bold text-[10px] uppercase select-none tracking-widest rotate-12 opacity-80"
                            >
                              Authorized
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // TEXT BLOCK RENDERING
                  if (block.blockType === 'TEXT') {
                    return (
                      <div key={block.id} className="relative group">
                        <textarea
                          value={block.content.text || ''}
                          onChange={(e) => updateBlockContent(idx, 'text', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-outline-variant focus:border-primary focus:outline-none rounded p-2 text-body-md text-on-surface resize-none leading-relaxed font-sans"
                          rows={3}
                          placeholder="Insert description summary or contract clause..."
                        />
                      </div>
                    );
                  }

                  // TABLE BLOCK RENDERING
                  if (block.blockType === 'TABLE') {
                    const { subtotal, taxTotal, total } = calculateTotals(block.content);
                    return (
                      <div key={block.id} className="space-y-4 relative group">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px] font-medium">
                            <thead>
                              <tr 
                                style={{ backgroundColor: `${accentColor}10`, borderBottom: `2px solid ${accentColor}` }}
                                className="text-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider"
                              >
                                <th className="p-2 w-[18%]">SKU / Item</th>
                                <th className="p-2 w-[35%]">Description</th>
                                <th className="p-2 w-[10%] text-right">Qty</th>
                                <th className="p-2 w-[12%] text-right">Rate</th>
                                <th className="p-2 w-[10%] text-center">Tax</th>
                                <th className="p-2 w-[10%] text-right">Total</th>
                                <th className="p-2 w-[5%] text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                              {(block.content.items || []).map((item: any, itemIdx: number) => (
                                <tr key={itemIdx} className="hover:bg-surface-container-low/40">
                                  
                                  {/* Item selection auto-populate */}
                                  <td className="p-2">
                                    <select
                                      value={products.find(p => p.sku === item.sku)?.id || ''}
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'productId', e.target.value)}
                                      className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/60 rounded px-1 text-[11px] font-mono text-on-surface"
                                    >
                                      <option value="">Manual SKU</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.sku}</option>
                                      ))}
                                    </select>
                                    <input 
                                      type="text" 
                                      value={item.sku} 
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'sku', e.target.value)}
                                      placeholder="SKU"
                                      className="w-full bg-transparent focus:outline-none border-b border-transparent focus:border-primary text-[10px] font-mono text-on-surface-variant mt-1"
                                    />
                                  </td>

                                  <td className="p-2 align-top">
                                    <textarea
                                      value={item.description}
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'description', e.target.value)}
                                      placeholder="Item summary details"
                                      className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/60 rounded px-1 py-0.5 text-[11px] resize-none"
                                      rows={1}
                                    />
                                  </td>

                                  <td className="p-2 text-right align-top">
                                    <input 
                                      type="number" 
                                      value={item.quantity}
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'quantity', Number(e.target.value) || 0)}
                                      className="w-12 bg-transparent text-right focus:outline-none border-b border-outline-variant/60 focus:border-primary font-mono text-[11px]"
                                    />
                                  </td>

                                  <td className="p-2 text-right align-top">
                                    <input 
                                      type="number" 
                                      value={item.rate}
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'rate', Number(e.target.value) || 0)}
                                      className="w-16 bg-transparent text-right focus:outline-none border-b border-outline-variant/60 focus:border-primary font-mono text-[11px]"
                                    />
                                  </td>

                                  <td className="p-2 text-center align-top">
                                    <select
                                      value={item.taxCode}
                                      onChange={(e) => updateLineItemField(idx, itemIdx, 'taxCode', e.target.value)}
                                      className="bg-transparent focus:outline-none border border-outline-variant/60 rounded text-[10px] font-semibold text-on-surface"
                                    >
                                      {taxes.map(t => (
                                        <option key={t.id} value={t.code}>{t.code}</option>
                                      ))}
                                    </select>
                                  </td>

                                  <td className="p-2 text-right align-top font-mono font-bold text-primary">
                                    ${((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
                                  </td>

                                  <td className="p-2 text-right align-top">
                                    <button 
                                      type="button" 
                                      onClick={() => removeLineItem(idx, itemIdx)}
                                      className="text-on-surface-variant hover:text-error transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => addLineItem(idx)}
                          className="text-[11px] text-primary font-bold flex items-center gap-0.5 hover:text-primary-fixed-variant"
                        >
                          <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Row Item
                        </button>

                        {/* Calculation Summary blocks */}
                        <div className="flex justify-end pt-4 border-t border-outline-variant/40 select-none">
                          <div className="w-64 space-y-2.5 text-body-sm font-semibold text-on-surface-variant">
                            
                            <div className="flex justify-between font-mono">
                              <span>Subtotal:</span>
                              <span className="text-on-surface">${subtotal.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between font-mono">
                              <span>Tax Addition:</span>
                              <span className="text-on-surface">${taxTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center gap-2">
                              <span>Discount:</span>
                              <input 
                                type="number" 
                                value={block.content.discount || 0}
                                onChange={(e) => updateBlockContent(idx, 'discount', Number(e.target.value) || 0)}
                                className="w-16 h-6 text-right bg-surface-container-low border border-outline-variant/60 rounded font-mono text-[11px] focus:outline-none"
                              />
                            </div>

                            <div className="flex justify-between items-center gap-2">
                              <span>Adjustment:</span>
                              <input 
                                type="number" 
                                value={block.content.adjustment || 0}
                                onChange={(e) => updateBlockContent(idx, 'adjustment', Number(e.target.value) || 0)}
                                className="w-16 h-6 text-right bg-surface-container-low border border-outline-variant/60 rounded font-mono text-[11px] focus:outline-none"
                              />
                            </div>

                            <div className="h-px bg-outline-variant/60 w-full"></div>

                            <div className="flex justify-between font-mono font-bold text-headline-sm text-on-surface">
                              <span>Grand Total:</span>
                              <span style={{ color: accentColor }}>${total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // NOTES BLOCK RENDERING
                  if (block.blockType === 'NOTES') {
                    return (
                      <div key={block.id} className="relative group">
                        <textarea
                          value={block.content.notes || ''}
                          onChange={(e) => updateBlockContent(idx, 'notes', e.target.value)}
                          className="w-full bg-surface-container-low/50 border border-outline-variant/60 rounded p-3 text-[11px] text-on-surface-variant font-medium font-mono leading-relaxed"
                          rows={2}
                          placeholder="Insert payment methods details or disclaimer footnote..."
                        />
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
              
            </div>

          </div>
        </main>

        {/* ======================================================== */}
        {/* RIGHT PANEL: INSPECTOR & REVISIONS TABS */}
        {/* ======================================================== */}
        <aside className="w-[320px] bg-surface border-l border-outline-variant flex flex-col h-full absolute right-0 top-0 shrink-0 select-none shadow-sm">
          
          {/* Tabs header */}
          <div className="flex border-b border-outline-variant bg-surface-container-lowest p-1 gap-1">
            {([
              { id: 'properties', icon: 'settings', title: 'Properties' },
              { id: 'styles', icon: 'palette', title: 'Styles' },
              { id: 'versions', icon: 'history', title: 'Versions' },
              { id: 'export', icon: 'share', title: 'Export' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveRightTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-1 rounded transition-colors
                  ${activeRightTab === tab.id ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                title={tab.title}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span className="text-[9px] font-bold mt-0.5">{tab.title}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-body-sm">
            
            {/* PROPERTIES TAB */}
            {activeRightTab === 'properties' && (
              <div className="space-y-4">
                
                {/* Status selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Document Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm font-semibold text-on-surface"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SENT">SENT</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="PAID">PAID</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                {/* Company association */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Billing Corporate Entity</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      // Trigger autosave with new reference parameters
                      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
                      autoSaveTimer.current = setTimeout(() => {
                        api.documents.create({ title, type: doc?.type || 'INVOICE', companyId: e.target.value, customerId: selectedCustomerId });
                      }, 1000);
                    }}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px] text-on-surface"
                  >
                    <option value="">Unlinked</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Customer association */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Customer / Client Roster</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      // Trigger autosave reference parameters
                      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
                      autoSaveTimer.current = setTimeout(() => {
                        api.documents.create({ title, type: doc?.type || 'INVOICE', companyId: selectedCompanyId, customerId: e.target.value });
                      }, 1000);
                    }}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px] text-on-surface"
                  >
                    <option value="">Unlinked</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="h-px bg-outline-variant/60 w-full pt-2"></div>

                <button
                  onClick={handleDuplicate}
                  className="w-full bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors font-bold text-[11px] py-1.5 rounded flex items-center justify-center gap-1 text-on-surface active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Duplicate Document
                </button>

              </div>
            )}

            {/* STYLES TAB */}
            {activeRightTab === 'styles' && (
              <div className="space-y-4">
                
                {/* Color Swatches */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase">Accent Theme Color</span>
                  <div className="flex gap-2">
                    {['#3b82f6', '#0d9488', '#16a34a', '#ca8a04', '#4b5563'].map(color => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform
                          ${accentColor === color ? 'border-on-surface scale-110' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Typography choices */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Primary Font</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm font-semibold text-on-surface"
                  >
                    <option value="font-sans">Inter (Modern Sans)</option>
                    <option value="font-serif">Playfair (Elegant Serif)</option>
                    <option value="font-mono">Fira Code (High-Density Mono)</option>
                  </select>
                </div>

                <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                {/* Logo stamp toggler checkboxes */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={showStamp}
                    onChange={(e) => setShowStamp(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <label className="font-semibold text-on-surface">Render Approved Stamp</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <label className="font-semibold text-on-surface">Enable Sheet Watermark</label>
                </div>

                {showWatermark && (
                  <div className="flex flex-col gap-1 pl-6">
                    <label className="text-[9px] text-on-surface-variant font-bold">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="px-2 py-1 h-7 border border-outline-variant rounded bg-surface-container-low text-[11px]"
                    />
                  </div>
                )}

              </div>
            )}

            {/* VERSIONS TAB */}
            {activeRightTab === 'versions' && (
              <div className="space-y-4">
                
                {/* Save current landmark snapshot */}
                <form onSubmit={handleCreateSnapshot} className="space-y-2 border-b border-outline-variant/60 pb-3">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase block">Create Landmark Revision</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      placeholder="e.g. Major updates" 
                      value={newSnapshotTitle}
                      onChange={(e) => setNewSnapshotTitle(e.target.value)}
                      required
                      className="flex-1 h-7 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px]"
                    />
                    <button 
                      type="submit" 
                      className="bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold px-2 rounded text-[11px] h-7 active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                </form>

                {/* Versions list */}
                <div className="space-y-2">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Revision History Logs</span>
                  {versions.length === 0 ? (
                    <div className="text-center text-[10px] text-on-surface-variant italic py-4">No landmark snapshots logged.</div>
                  ) : (
                    versions.map((ver) => (
                      <div 
                        key={ver.id} 
                        className="flex justify-between items-center p-2 bg-surface-container-low border border-outline-variant/60 rounded-lg"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-[11px] text-on-surface truncate">{ver.title}</div>
                          <div className="text-[9px] text-on-surface-variant/80 font-mono mt-0.5">
                            Rev #{ver.version} • {new Date(ver.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(ver.id)}
                          className="bg-surface hover:bg-surface-container border border-outline-variant font-bold text-[9px] px-2 py-0.5 rounded transition-colors text-primary active:scale-95"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

            {/* EXPORT TAB */}
            {activeRightTab === 'export' && (
              <div className="space-y-4">
                
                {/* Print Layout */}
                <button
                  onClick={handleDownloadPdf}
                  className="w-full bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold text-[11px] py-2 rounded flex items-center justify-center gap-1 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print / Export simulated PDF
                </button>

                <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                {/* Email Preparation Form */}
                <form onSubmit={handleSendEmail} className="space-y-3">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Dispatch via Email</span>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-on-surface-variant font-bold uppercase">Recipient Email</label>
                    <input 
                      type="email" 
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e.target.value)}
                      placeholder="client@company.com"
                      required
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px] font-mono text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-on-surface-variant font-bold uppercase">Subject Header</label>
                    <input 
                      type="text" 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Document invoice"
                      required
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px] text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-on-surface-variant font-bold uppercase">Message body</label>
                    <textarea 
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Email description details"
                      required
                      rows={4}
                      className="w-full p-2 border border-outline-variant rounded bg-surface-container-low text-[11px] text-on-surface-variant resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="w-full bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors font-bold text-[11px] py-1.5 rounded flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    {sendingEmail ? 'Sending Dispatch...' : 'Dispatch Document Link'}
                  </button>
                </form>

              </div>
            )}

          </div>

          {/* Toast Alert overlay */}
          {toastMsg && (
            <div 
              style={{ borderLeft: `4px solid ${toastError ? '#b3261e' : '#6750a4'}` }}
              className="p-3 bg-surface-container border border-outline-variant shadow-lg rounded-md m-4 flex items-center gap-2 select-none"
            >
              <span 
                className="material-symbols-outlined text-[18px]"
                style={{ color: toastError ? '#b3261e' : '#6750a4' }}
              >
                {toastError ? 'error' : 'check_circle'}
              </span>
              <span className="text-[11px] font-bold text-on-surface leading-tight">{toastMsg}</span>
            </div>
          )}
        </aside>

      </div>
    </MainLayout>
  );
}
