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
  DocumentVersionDto,
  normalizeColumnWidths
} from '@docflow/shared-types';
import Link from 'next/link';

interface DocumentBlockInput {
  id: string;
  sortOrder: number;
  blockType: 'COVER' | 'TEXT' | 'TABLE' | 'NOTES' | 'CUSTOM_FIELDS';
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
  const [templates, setTemplates] = useState<any[]>([]);
  const [designerTemplates, setDesignerTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState({
    size: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    marginTop: 36,
    marginRight: 36,
    marginBottom: 36,
    marginLeft: 36
  });
  const [fieldVisibility, setFieldVisibility] = useState({
    showOrgTaxId: true,
    showOrgPhone: true,
    showOrgEmail: true,
    showOrgAddress: true,
    showCustTax: true,
    showCustPhone: true,
    showCustEmail: true,
    showCustAddress: true,
    showTableSku: true,
    showTableTaxCode: true,
    showTableType: true,
    logoUrl: '',
    qrUrl: '',
    applyDiscount: false,
    applyAdjustment: false,
    showPaymentInstructions: true,
    showBankDetails: true,
    showSignature: true,
    showFooter: true
  });

  // Right sidebar resizing states
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const isResizingRight = useRef(false);

  const startResizingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.addEventListener('mousemove', handleMouseMoveRight);
    document.addEventListener('mouseup', stopResizingRight);
  };

  const handleMouseMoveRight = (e: MouseEvent) => {
    if (!isResizingRight.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 280 && newWidth <= 600) {
      setRightSidebarWidth(newWidth);
    }
  };

  const stopResizingRight = () => {
    isResizingRight.current = false;
    document.removeEventListener('mousemove', handleMouseMoveRight);
    document.removeEventListener('mouseup', stopResizingRight);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveRight);
      document.removeEventListener('mouseup', stopResizingRight);
    };
  }, []);


  const handleSelectBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setActiveRightTab('properties');
  };

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load document and dependencies on startup
  const loadDependencies = async () => {
    setLoading(true);
    try {
      const [docData, compList, custList, prodList, taxList, unitList, versionList, templateList, designerTemplateList] = await Promise.all([
        api.documents.get(id),
        api.companies.list(),
        api.customers.list(),
        api.products.list(),
        api.taxes.list(),
        api.units.list(),
        api.documents.listVersions(id),
        api.templates.list(),
        api.templateEngine.listDefinitions()
      ]);

      setDoc(docData);
      setTitle(docData.title);
      setStatus(docData.status);
      setSelectedCompanyId(docData.companyId || '');
      setSelectedCustomerId(docData.customerId || '');
      setVersions(versionList);
      setTemplates(templateList);

      setDesignerTemplates(designerTemplateList);
      const defaultTmpl = designerTemplateList.find(t => t.meta.isDefault) || designerTemplateList[0];
      setSelectedTemplateId(docData.templateId || (defaultTmpl ? defaultTmpl.meta.id : ''));

      setAccentColor(docData.accentColor || '#3b82f6');
      setFontFamily(docData.fontFamily || 'font-sans');
      setShowWatermark(docData.showWatermark || false);
      setWatermarkText(docData.watermarkText || 'DRAFT');
      setShowStamp(docData.showStamp || false);

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
        const configBlock = mapped.find(b => b.content?.isGlobalConfig);
        let restoredVisibility = configBlock?.content?.fieldVisibility || null;
        if (configBlock) {
          if (configBlock.content.pageSettings) setPageSettings(configBlock.content.pageSettings);
          if (restoredVisibility) setFieldVisibility(restoredVisibility);
        }
        // If no logo in draft config, auto-load from company branding
        if (docData.companyId && (!restoredVisibility?.logoUrl)) {
          try {
            const branding = await api.customization.getBranding(docData.companyId);
            if (branding?.logoUrl) {
              setFieldVisibility(prev => ({ ...prev, logoUrl: branding.logoUrl || '' }));
            }
          } catch { }
        }
        setBlocks(mapped.filter(b => !b.content?.isGlobalConfig));
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

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    triggerAutoSave(blocks);
  }, [pageSettings, fieldVisibility, accentColor, fontFamily, showWatermark, watermarkText, showStamp, selectedTemplateId]);

  // Toast notifier
  const triggerToast = (msg: string, isErr = false) => {
    setToastMsg(msg);
    setToastError(isErr);
    setTimeout(() => {
      setToastMsg('');
    }, 4000);
  };

  // Save changes logic
  const handleSaveBlocks = async (blocksPayload: DocumentBlockInput[], currentTitle = title, silent = false) => {
    if (!silent) setSaving(true);
    try {
      const configBlock: DocumentBlockInput = {
        id: 'b-global-config',
        sortOrder: 9999,
        blockType: 'CUSTOM_FIELDS',
        content: {
          isGlobalConfig: true,
          pageSettings,
          fieldVisibility
        }
      };

      const fullPayload = [...blocksPayload, configBlock];

      const serialized = fullPayload.map(b => ({
        sortOrder: b.sortOrder,
        blockType: b.blockType,
        content: JSON.stringify(b.content)
      }));

      await Promise.all([
        api.documents.updateBlocks(id, serialized),
        api.documents.update(id, {
          title: currentTitle,
          companyId: selectedCompanyId || null,
          customerId: selectedCustomerId || null,
          accentColor,
          fontFamily,
          showWatermark,
          watermarkText,
          showStamp,
          templateId: selectedTemplateId || null,
        })
      ]);

      if (!silent) triggerToast('Draft saved successfully.');
    } catch (err: any) {
      if (!silent) triggerToast(err.message || 'Auto-save failed.', true);
    } finally {
      if (!silent) setSaving(false);
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

  const duplicateBlock = (idx: number) => {
    const target = blocks[idx];
    const copy = {
      ...target,
      id: `b-custom-${Date.now()}`,
      content: JSON.parse(JSON.stringify(target.content))
    };
    const appended = [...blocks];
    appended.splice(idx + 1, 0, copy);
    const reindexed = appended.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(reindexed);
    triggerAutoSave(reindexed);
    setSelectedBlockId(copy.id);
    triggerToast('Section block duplicated.');
  };

  const addBlockSection = (type: 'COVER' | 'TEXT' | 'TABLE' | 'NOTES' | 'CUSTOM_FIELDS') => {
    let initialContent: any = {};
    if (type === 'COVER') {
      initialContent = { subtitle: 'Document section', date: new Date().toLocaleDateString(), logoUrl: '' };
    } else if (type === 'TEXT') {
      initialContent = { text: 'New paragraph block' };
    } else if (type === 'TABLE') {
      initialContent = { items: [{ sku: '', description: 'Custom item name', quantity: 1, rate: 0, unit: 'PCS', taxCode: 'EXEMPT' }], discount: 0, adjustment: 0 };
    } else if (type === 'NOTES') {
      initialContent = { notes: 'Add footnote annotations.' };
    } else if (type === 'CUSTOM_FIELDS') {
      initialContent = { fields: [{ key: 'GSTIN', value: '' }] };
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
        return { ...b, content: { ...(b.content || {}), [key]: val } };
      }
      return b;
    });
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Line Items spreadsheet calculator operations
  const addLineItem = (blockIdx: number) => {
    const targetBlock = blocks[blockIdx];
    const items = [...(targetBlock.content?.items || [])];
    items.push({ sku: '', description: '', quantity: 1, rate: 0, unit: 'PCS', taxCode: 'EXEMPT' });
    updateBlockContent(blockIdx, 'items', items);
  };

  const removeLineItem = (blockIdx: number, itemIdx: number) => {
    const targetBlock = blocks[blockIdx];
    const items = (targetBlock.content?.items || []).filter((_: any, i: number) => i !== itemIdx);
    updateBlockContent(blockIdx, 'items', items);
  };

  const updateLineItemField = (blockIdx: number, itemIdx: number, key: string, val: any) => {
    const targetBlock = blocks[blockIdx];
    const items = (targetBlock.content?.items || []).map((item: any, i: number) => {
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

  const handleSaveProductToMaster = async (sku: string, description: string, rate: number, unitCode: string, taxCode: string) => {
    if (!sku.trim()) {
      triggerToast('SKU is required to save to master.', true);
      return;
    }
    try {
      const matchedUnit = units.find(u => u.code === unitCode) || units[0];
      const matchedTax = taxes.find(t => t.code === taxCode) || taxes[0];

      await api.products.create({
        sku: sku,
        name: description || sku,
        description: description,
        rate: Number(rate) || 0,
        unitId: matchedUnit?.id,
        taxId: matchedTax?.id
      });

      const updatedList = await api.products.list();
      setProducts(updatedList);
      triggerToast(`Product "${sku}" successfully added to master!`);
    } catch (e: any) {
      triggerToast(e.message || 'Failed to save product to master.', true);
    }
  };

  // Calculate live totals for a table block
  const calculateTotals = (blockContent: any) => {
    const items = blockContent.items || [];
    let subtotal = 0;
    let taxTotal = 0;

    items.forEach((item: any) => {
      const lineVal = Number(item.rate) || 0;
      subtotal += lineVal;

      const ratePercent = item.taxRate !== undefined ? Number(item.taxRate) : (() => {
        const matchedTax = taxes.find(t => t.code === item.taxCode);
        return matchedTax ? matchedTax.ratePercent : 0;
      })();

      taxTotal += lineVal * (ratePercent / 100);
    });

    const discount = fieldVisibility.applyDiscount ? (Number(blockContent.discount) || 0) : 0;
    const adjustment = fieldVisibility.applyAdjustment ? (Number(blockContent.adjustment) || 0) : 0;
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

  // Download real customized layout templates from Template Designer
  const handleDownloadDesignerFile = async (format: 'pdf' | 'docx') => {
    if (!selectedTemplateId) {
      triggerToast('Please select a template layout from the custom designer.', true);
      return;
    }
    try {
      await handleSaveBlocks(blocks, title, true);
      const res = await api.templateEngine.render(id, selectedTemplateId, format);
      const binaryStr = window.atob(res.base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: res.mimeType });
      const downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = res.filename;
      downloadLink.click();
      triggerToast(`${format.toUpperCase()} export compiled successfully.`);
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Export compilation failed.', true);
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

  const activeTmpl = designerTemplates.find(t => t.meta.id === selectedTemplateId) || designerTemplates[0];

  return (
    <MainLayout>
      <style>{`
        @media print {
          /* Hide all layout elements */
          header, aside, nav, button, .no-print, .add-block-trigger, .block-actions-toolbar, .print-hide {
            display: none !important;
          }
          
          /* Reset root and containers */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Break out of flex/grid layouts only for top-level parent wrapper elements */
          main, 
          body > div, 
          main > div {
            display: block !important;
            position: relative !important;
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            width: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
          }
          
          main {
            width: 100% !important;
          }
          
          #print-sheet {
            display: block !important;
            position: relative !important;
            margin: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            min-height: 0 !important;
            height: auto !important;
            page-break-inside: avoid !important;
          }
          
          #print-sheet input, 
          #print-sheet select, 
          #print-sheet textarea {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            color: black !important;
            outline: none !important;
            box-shadow: none !important;
            width: auto !important;
            appearance: none !important;
          }
          
          #print-sheet table select {
            appearance: none !important;
            background-image: none !important;
          }

          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
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
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
            {blocks.map((block, idx) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`group flex flex-col p-2 bg-surface-container-low border rounded-lg cursor-pointer hover:border-primary/45 transition-all
                  ${selectedBlockId === block.id ? 'border-primary bg-primary-container/10 shadow-xs' : 'border-outline-variant/60'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[15px]">
                      {block.blockType === 'COVER' ? 'branding_watermark' :
                        block.blockType === 'TEXT' ? 'notes' :
                          block.blockType === 'TABLE' ? 'table_chart' :
                            block.blockType === 'CUSTOM_FIELDS' ? 'dashboard_customize' : 'description'}
                    </span>
                    <span className="text-[10.5px] font-bold text-on-surface truncate">
                      {block.blockType} #{idx + 1}
                    </span>
                  </div>

                  {/* Sorting triggers */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[11px]">arrow_upward</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                      disabled={idx === blocks.length - 1}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-primary disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[11px]">arrow_downward</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                      className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[11px]">delete</span>
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
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[10.5px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">notes</span> Text
              </button>
              <button
                onClick={() => addBlockSection('TABLE')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[10.5px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">table_chart</span> Pricing
              </button>
              <button
                onClick={() => addBlockSection('NOTES')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[10.5px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">description</span> Notes
              </button>
              <button
                onClick={() => addBlockSection('COVER')}
                className="py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[10.5px] flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">branding_watermark</span> Branding
              </button>
              <button
                onClick={() => addBlockSection('CUSTOM_FIELDS')}
                className="col-span-2 py-1 px-2 border border-outline-variant hover:bg-surface-container-low rounded text-[10.5px] flex items-center justify-center gap-1 bg-primary-container/10 border-primary/20 text-primary"
              >
                <span className="material-symbols-outlined text-[13px]">dashboard_customize</span> Custom Fields
              </button>
            </div>
          </div>

          {/* Page Settings Card */}
          <div className="p-3 border-t border-outline-variant bg-surface-container-low/40 space-y-2">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Page Layout Settings</span>
            <div className="space-y-2 text-[10.5px]">

              <div className="flex flex-col gap-0.5">
                <label className="text-[8.5px] text-on-surface-variant font-bold uppercase">Format Size</label>
                <select
                  value={pageSettings.size}
                  onChange={(e) => setPageSettings(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full h-9 px-2 text-[11px] border border-outline-variant rounded bg-surface text-on-surface focus:outline-none"
                >
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="Letter">US Letter (8.5 x 11 in)</option>
                </select>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[8.5px] text-on-surface-variant font-bold uppercase">Orientation</label>
                <div className="grid grid-cols-2 gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setPageSettings(prev => ({ ...prev, orientation: 'portrait' }))}
                    className={`h-8.5 rounded border font-semibold text-[9.5px] flex items-center justify-center gap-0.5 transition-all
                      ${pageSettings.orientation === 'portrait' ? 'bg-primary-container border-primary text-primary' : 'bg-surface border-outline-variant hover:bg-surface-container-low text-on-surface-variant'}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">portrait</span> Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSettings(prev => ({ ...prev, orientation: 'landscape' }))}
                    className={`h-8.5 rounded border font-semibold text-[9.5px] flex items-center justify-center gap-0.5 transition-all
                      ${pageSettings.orientation === 'landscape' ? 'bg-primary-container border-primary text-primary' : 'bg-surface border-outline-variant hover:bg-surface-container-low text-on-surface-variant'}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">landscape</span> Landscape
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[8.5px] text-on-surface-variant font-bold uppercase">Margins Preset</label>
                <select
                  value={pageSettings.margins}
                  onChange={(e) => {
                    const preset = e.target.value;
                    let top = 36, right = 36, bottom = 36, left = 36;
                    if (preset === 'narrow') {
                      top = 18; right = 18; bottom = 18; left = 18;
                    } else if (preset === 'wide') {
                      top = 54; right = 54; bottom = 54; left = 54;
                    }
                    setPageSettings(prev => ({
                      ...prev,
                      margins: preset,
                      marginTop: top,
                      marginRight: right,
                      marginBottom: bottom,
                      marginLeft: left
                    }));
                  }}
                  className="w-full h-9 px-2 text-[11px] border border-outline-variant rounded bg-surface text-on-surface focus:outline-none"
                >
                  <option value="normal">Normal (36 pt)</option>
                  <option value="narrow">Narrow (18 pt)</option>
                  <option value="wide">Wide (54 pt)</option>
                  <option value="custom">Custom Sliders</option>
                </select>
              </div>

              {pageSettings.margins === 'custom' && (
                <div className="space-y-1.5 pt-1.5 border-t border-outline-variant/35 mt-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-on-surface-variant font-mono">T: {pageSettings.marginTop}pt</span>
                    <input
                      type="range" min="10" max="100" value={pageSettings.marginTop}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, marginTop: Number(e.target.value) }))}
                      className="w-24 accent-primary h-1"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-on-surface-variant font-mono">R: {pageSettings.marginRight}pt</span>
                    <input
                      type="range" min="10" max="100" value={pageSettings.marginRight}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, marginRight: Number(e.target.value) }))}
                      className="w-24 accent-primary h-1"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-on-surface-variant font-mono">B: {pageSettings.marginBottom}pt</span>
                    <input
                      type="range" min="10" max="100" value={pageSettings.marginBottom}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, marginBottom: Number(e.target.value) }))}
                      className="w-24 accent-primary h-1"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-on-surface-variant font-mono">L: {pageSettings.marginLeft}pt</span>
                    <input
                      type="range" min="10" max="100" value={pageSettings.marginLeft}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, marginLeft: Number(e.target.value) }))}
                      className="w-24 accent-primary h-1"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* CENTER PANE: EDITABLE DOCUMENT CANVAS */}
        {/* ======================================================== */}
        <main
          style={{ paddingRight: `${rightSidebarWidth + 24}px` }}
          className="flex-1 overflow-y-auto p-8 h-full custom-scrollbar"
        >
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 pb-24">

            {/* Action title toolbar */}
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3 select-none no-print">
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
                  className="bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors text-body-sm font-bold h-8 px-4 rounded flex items-center gap-1 disabled:opacity-50 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </div>

            {/* Document Canvas Sheet Wrapper (WYSIWYG A4 Print Layout Editor) */}
            <div
              id="print-sheet"
              style={{
                borderColor: accentColor,
                paddingTop: `${pageSettings.marginTop}pt`,
                paddingRight: `${pageSettings.marginRight}pt`,
                paddingBottom: `${pageSettings.marginBottom}pt`,
                paddingLeft: `${pageSettings.marginLeft}pt`,
                fontFamily: fontFamily === 'font-mono' ? 'monospace' : fontFamily === 'font-serif' ? 'serif' : 'sans-serif',
                fontSize: activeTmpl ? `${activeTmpl.theme.baseFontSize}pt` : '10pt',
                color: activeTmpl ? activeTmpl.theme.colors.text : '#1f2937',
              }}
              className={`bg-white border-t-8 rounded-lg shadow-md relative overflow-hidden text-left text-body-sm font-medium mx-auto transition-all duration-300 select-none
                ${pageSettings.orientation === 'landscape' ? 'max-w-[1100px] min-h-[750px]' : 'max-w-[850px] min-h-[960px]'}`}
            >

              {/* Simulated draft watermark overlay */}
              {showWatermark && (
                <div
                  style={{
                    opacity: activeTmpl ? activeTmpl.watermark.opacity : 0.05,
                    transform: `translate(-50%, -50%) rotate(-${activeTmpl ? activeTmpl.watermark.angle : 45}deg)`,
                    color: activeTmpl ? activeTmpl.theme.colors.muted : '#9ca3af',
                  }}
                  className="absolute left-1/2 top-1/2 font-bold text-[64px] pointer-events-none select-none tracking-wider whitespace-nowrap z-0 font-sans animate-fade-in"
                >
                  {watermarkText}
                </div>
              )}

              {/* Redesigned Document Header block container */}
              <div
                onClick={() => setSelectedBlockId('document-header')}
                className={`grid grid-cols-2 gap-8 mb-8 z-10 border-b pb-4 cursor-pointer hover:ring-1 hover:ring-primary/45 rounded p-3 transition-all relative group/block
                  ${selectedBlockId === 'document-header' ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-outline-variant/40'}`}
              >
                {/* Floating badge controls */}
                <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                  <span className="bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">edit</span> Edit Header Details
                  </span>
                </div>

                {/* Left Column: Logo + Bill To */}
                <div className="space-y-6">
                  {/* Logo Display / Uploader */}
                  {fieldVisibility.logoUrl ? (
                    <div className="relative group/logo max-w-[160px]">
                      <img src={fieldVisibility.logoUrl} className="max-h-12 object-contain rounded" alt="Logo" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFieldVisibility(prev => ({ ...prev, logoUrl: '' }));
                        }}
                        className="absolute -top-1.5 -right-1.5 bg-error text-on-error hover:bg-error-container rounded-full w-4 h-4 flex items-center justify-center shadow-xs no-print"
                        title="Remove Logo"
                      >
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-outline-variant/60 hover:border-primary rounded p-2 flex flex-col items-center justify-center bg-surface-container-low/40 cursor-pointer relative max-w-[160px] no-print">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFieldVisibility(prev => ({ ...prev, logoUrl: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-primary text-[16px]">add_photo_alternate</span>
                      <span className="text-[9px] font-bold text-on-surface-variant mt-0.5">Upload Logo</span>
                    </div>
                  )}

                  {/* Bill To Info */}
                  <div>
                    <span style={{ color: accentColor }} className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                      {activeTmpl ? activeTmpl.customer.billToHeading : 'Bill To'}
                    </span>
                    <select
                      value={selectedCustomerId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCustomerId(val);
                        api.documents.update(id, { customerId: val || null }).catch(console.error);
                      }}
                      className="bg-transparent border-b border-dashed border-outline-variant/60 hover:border-primary font-bold text-[12px] focus:outline-none w-full py-0.5 text-on-surface mb-1"
                    >
                      <option value="">Unlinked Client</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {selectedCustomerId && (
                      <div className="text-on-surface-variant/80 text-[11px] leading-tight space-y-0.5 mt-1 text-[10.5px]">
                        {(() => {
                          const cust = customers.find(c => c.id === selectedCustomerId);
                          if (!cust) return null;
                          return (
                            <>
                              {fieldVisibility.showCustAddress && (
                                <>
                                  <p>{cust.addressLine1 || 'No billing address set'}</p>
                                  {cust.addressLine2 && <p>{cust.addressLine2}</p>}
                                  <p>{cust.city || ''} {cust.postalCode || ''} {cust.country || ''}</p>
                                </>
                              )}
                              {fieldVisibility.showCustEmail && <p>{cust.email}</p>}
                              {fieldVisibility.showCustPhone && cust.phone && <p>{cust.phone}</p>}
                              {fieldVisibility.showCustTax && cust.customFields && (
                                <p className="mt-0.5 font-semibold text-primary">
                                  {typeof cust.customFields === 'string' ? cust.customFields : JSON.stringify(cust.customFields)}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Title + Company Info */}
                <div className="text-right space-y-4">
                  <div>
                    <h2
                      style={{ color: accentColor, fontSize: '20pt' }}
                      className="font-bold uppercase tracking-wide inline-flex items-center gap-1 justify-end"
                    >
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          triggerAutoSave(blocks, e.target.value);
                        }}
                        className="bg-transparent border-b border-dashed border-outline-variant/60 focus:border-primary focus:outline-none text-[18px] font-bold text-on-surface text-right w-44"
                      />
                    </h2>
                  </div>

                  {/* Meta details */}
                  <div className="text-[11px] leading-relaxed">
                    <p><strong className="font-semibold text-on-surface">Invoice No:</strong> {doc?.id.slice(0, 8).toUpperCase()}</p>
                    <p><strong className="font-semibold text-on-surface">Issue Date:</strong> {doc ? new Date(doc.createdAt).toLocaleDateString() : ''}</p>
                  </div>

                  {/* Company Info */}
                  <div className="flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] text-on-surface-variant font-bold uppercase select-none">Billing Entity</span>
                    <select
                      value={selectedCompanyId || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        setSelectedCompanyId(val);
                        api.documents.update(id, { companyId: val || null }).catch(console.error);
                        // Auto-load company logo if no logo currently set
                        if (val && !fieldVisibility.logoUrl) {
                          try {
                            const branding = await api.customization.getBranding(val);
                            if (branding?.logoUrl) {
                              setFieldVisibility(prev => ({ ...prev, logoUrl: branding.logoUrl || '' }));
                            }
                          } catch { }
                        }
                      }}
                      style={{ color: accentColor }}
                      className="bg-transparent border-b border-dashed border-outline-variant/60 hover:border-primary font-bold text-[12px] focus:outline-none py-0.5 text-right"
                    >
                      <option value="">No Corporate Link</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {selectedCompanyId && (
                    <div className="text-right text-[11px] leading-relaxed text-on-surface-variant/90 space-y-0.5">
                      {(() => {
                        const comp = companies.find(c => c.id === selectedCompanyId);
                        if (!comp) return null;
                        const contact = comp.contacts?.find((c: any) => c.isDefault) || comp.contacts?.[0];
                        const cEmail = contact?.email;
                        const cPhone = contact?.phone;
                        const cWebsite = comp.customFields?.website || comp.customFields?.Website;
                        const cCin = comp.registrationNumber || comp.customFields?.cin || comp.customFields?.CIN;
                        const cPan = comp.customFields?.pan || comp.customFields?.PAN;
                        return (
                          <>
                            {fieldVisibility.showOrgAddress && (
                              <>
                                <p>{comp.addressLine1}</p>
                                {comp.addressLine2 && <p>{comp.addressLine2}</p>}
                                <p>{comp.city}, {comp.postalCode}, {comp.country}</p>
                              </>
                            )}
                            {cEmail && <p><span className="font-semibold">Email:</span> {cEmail}</p>}
                            {cWebsite && <p><span className="font-semibold">Website:</span> {cWebsite}</p>}
                            {cPhone && <p><span className="font-semibold">Phone:</span> {cPhone}</p>}
                            {fieldVisibility.showOrgTaxId && comp.taxId && <p><span className="font-semibold">GSTIN/VAT:</span> {comp.taxId}</p>}
                            {cCin && <p><span className="font-semibold">CIN:</span> {cCin}</p>}
                            {cPan && <p><span className="font-semibold">PAN:</span> {cPan}</p>}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. DYNAMIC BLOCKS LOOP (TABLE, TEXT, NOTES, COVER) */}
              <div className="space-y-6">
                {blocks.map((block, idx) => {

                  // COVER BLOCK RENDERING
                  if (block.blockType === 'COVER') {
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        className={`space-y-2 border-b pb-4 cursor-pointer hover:ring-1 hover:ring-primary/45 rounded p-2 transition-all relative group/block
                          ${selectedBlockId === block.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-outline-variant/30'}`}
                      >
                        {/* Floating controls */}
                        <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                            title="Move Up"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                            disabled={idx === blocks.length - 1}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                            title="Move Down"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="Duplicate block"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-error-container/20 hover:text-error text-on-surface-variant"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={block.content?.subtitle || ''}
                          onChange={(e) => updateBlockContent(idx, 'subtitle', e.target.value)}
                          style={{ color: accentColor }}
                          className="font-bold bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary focus:outline-none w-full text-[14px]"
                          placeholder="Document Subtitle/Subject"
                        />
                      </div>
                    );
                  }

                  // TEXT BLOCK RENDERING
                  if (block.blockType === 'TEXT') {
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        className={`relative group/block border rounded p-2 cursor-pointer transition-all hover:ring-1 hover:ring-primary/45
                          ${selectedBlockId === block.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-transparent'}`}
                      >
                        {/* Floating controls */}
                        <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                            disabled={idx === blocks.length - 1}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="Duplicate block"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-error-container/20 hover:text-error text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                        <textarea
                          value={block.content?.text || ''}
                          onChange={(e) => updateBlockContent(idx, 'text', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-outline-variant/60 focus:border-primary focus:outline-none rounded p-1 text-[12px] text-on-surface resize-none leading-relaxed"
                          rows={2}
                          placeholder="Insert description summary or contract clause..."
                        />
                      </div>
                    );
                  }

                  // TABLE BLOCK RENDERING
                  if (block.blockType === 'TABLE') {
                    const { subtotal, taxTotal, total } = calculateTotals(block.content);
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        className={`space-y-4 relative group/block border rounded p-2 cursor-pointer transition-all hover:ring-1 hover:ring-primary/45
                          ${selectedBlockId === block.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-transparent'}`}
                      >
                        {/* Floating controls */}
                        <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                            disabled={idx === blocks.length - 1}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="Duplicate block"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-error-container/20 hover:text-error text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          {(() => {
                            const sortedColumns = normalizeColumnWidths(
                              (activeTmpl?.table?.columns?.length
                                ? [...activeTmpl.table.columns]
                                : [
                                  { key: 'index', label: 'Sr. No', visible: true, width: 8, align: 'center', order: 0 },
                                  { key: 'description', label: 'Description', visible: true, width: 45, align: 'left', order: 1 },
                                  { key: 'type', label: 'Type', visible: fieldVisibility.showTableType, width: 20, align: 'left', order: 2 },
                                  { key: 'amount', label: 'Amount (₹)', visible: true, width: 15, align: 'right', order: 3 },
                                  { key: 'tax', label: 'Tax', visible: fieldVisibility.showTableTaxCode, width: 12, align: 'center', order: 4 }
                                ])
                                .filter(c => c.visible && c.key !== 'sku')
                            ).sort((a, b) => a.order - b.order);

                            return (
                              <table className="w-full text-left border-collapse text-[11px] font-medium">
                                <thead>
                                  <tr
                                    style={{
                                      backgroundColor: activeTmpl ? activeTmpl.theme.colors.tableHeaderBg : `${accentColor}10`,
                                      color: activeTmpl ? activeTmpl.theme.colors.tableHeaderText : '#ffffff',
                                      borderBottom: `2px solid ${accentColor}`
                                    }}
                                    className="text-on-surface-variant font-bold select-none text-[10px] uppercase tracking-wider"
                                  >
                                    {sortedColumns.map(col => (
                                      <th
                                        key={col.key}
                                        style={{
                                          width: `${col.width}%`,
                                          textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left'
                                        }}
                                        className="p-2"
                                      >
                                        {col.label}
                                      </th>
                                    ))}
                                    <th className="p-2 w-[5%] text-right no-print"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/40">
                                  {(block.content?.items || []).map((item: any, itemIdx: number) => (
                                    <tr
                                      key={itemIdx}
                                      style={{
                                        backgroundColor: activeTmpl && activeTmpl.table.zebra && itemIdx % 2 === 1 ? activeTmpl.theme.colors.zebraBg : 'transparent'
                                      }}
                                      className="hover:bg-surface-container-low/40"
                                    >
                                      {sortedColumns.map(col => {
                                        if (col.key === 'index') {
                                          return (
                                            <td key={col.key} style={{ textAlign: 'center' }} className="p-2 align-top text-on-surface-variant font-mono text-[11px] select-none">
                                              {itemIdx + 1}
                                            </td>
                                          );
                                        }
                                        if (col.key === 'description') {
                                          return (
                                            <td key={col.key} className="p-2 align-top">
                                              <textarea
                                                value={item.description}
                                                onChange={(e) => updateLineItemField(idx, itemIdx, 'description', e.target.value)}
                                                placeholder="Item summary details"
                                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/60 rounded px-1 py-0.5 text-[11px] resize-none"
                                                rows={1}
                                              />
                                            </td>
                                          );
                                        }
                                        if (col.key === 'type') {
                                          return (
                                            <td key={col.key} className="p-2 align-top">
                                              <input
                                                type="text"
                                                value={item.type || ''}
                                                onChange={(e) => updateLineItemField(idx, itemIdx, 'type', e.target.value)}
                                                placeholder="Billing Type"
                                                className="w-full bg-transparent focus:outline-none border-b border-outline-variant/60 focus:border-primary text-[11px]"
                                              />
                                            </td>
                                          );
                                        }
                                        if (col.key === 'amount') {
                                          return (
                                            <td key={col.key} style={{ textAlign: 'right' }} className="p-2 align-top">
                                              <input
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => updateLineItemField(idx, itemIdx, 'rate', Number(e.target.value) || 0)}
                                                className="w-20 bg-transparent text-right focus:outline-none border-b border-outline-variant/60 focus:border-primary font-mono text-[11px]"
                                              />
                                            </td>
                                          );
                                        }
                                        if (col.key === 'tax') {
                                          return (
                                            <td key={col.key} style={{ textAlign: 'center' }} className="p-2 align-top">
                                              <select
                                                value={item.taxCode || 'EXEMPT'}
                                                onChange={(e) => updateLineItemField(idx, itemIdx, 'taxCode', e.target.value)}
                                                className="bg-transparent focus:outline-none border border-outline-variant/60 rounded text-[10px] font-semibold text-on-surface w-full"
                                              >
                                                {taxes.map(t => (
                                                  <option key={t.id} value={t.code}>{t.name} ({Number(t.ratePercent)}%)</option>
                                                ))}
                                              </select>
                                            </td>
                                          );
                                        }
                                        return (
                                          <td key={col.key} className="p-2 align-top">
                                            <input
                                              type="text"
                                              value={item.customFields?.[col.key] || ''}
                                              onChange={(e) => {
                                                const customFields = { ...(item.customFields || {}), [col.key]: e.target.value };
                                                updateLineItemField(idx, itemIdx, 'customFields', customFields);
                                              }}
                                              placeholder={col.label}
                                              className="w-full bg-transparent focus:outline-none border-b border-outline-variant/60 focus:border-primary text-[11px]"
                                            />
                                          </td>
                                        );
                                      })}
                                      <td className="p-2 text-right align-top no-print flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => removeLineItem(idx, itemIdx)}
                                          className="text-on-surface-variant hover:text-error"
                                          title="Remove item"
                                        >
                                          <span className="material-symbols-outlined text-[15px]">close</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>

                        {/* Add Row control */}
                        <div className="flex justify-between items-start pt-2 no-print">
                          <button
                            type="button"
                            onClick={() => addLineItem(idx)}
                            className="bg-surface border border-outline-variant hover:bg-surface-container transition-colors text-[10px] font-bold px-2 py-1 rounded flex items-center gap-0.5 text-primary shadow-xs active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span> Add Row Item
                          </button>
                        </div>

                        {/* Totals Calculation Card */}
                        <div className="flex justify-end pt-3 border-t border-outline-variant/40">
                          <div className="w-64 space-y-1.5 text-right text-[11px]">
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Subtotal:</span>
                              <span className="font-bold font-mono">{formatCurrency(subtotal, '₹')}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Tax Addition:</span>
                              <span className="font-bold font-mono">{formatCurrency(taxTotal, '₹')}</span>
                            </div>
                            {fieldVisibility.applyDiscount && (
                              <div className="flex justify-between items-center text-on-surface-variant gap-2">
                                <span>Discount (₹):</span>
                                <input
                                  type="number"
                                  value={block.content?.discount || 0}
                                  onChange={(e) => updateBlockContent(idx, 'discount', Number(e.target.value) || 0)}
                                  className="w-16 bg-transparent text-right focus:outline-none border-b border-outline-variant/60 focus:border-primary font-mono py-0.5"
                                />
                              </div>
                            )}
                            {fieldVisibility.applyAdjustment && (
                              <div className="flex justify-between items-center text-on-surface-variant gap-2">
                                <span>Adjustment (₹):</span>
                                <input
                                  type="number"
                                  value={block.content?.adjustment || 0}
                                  onChange={(e) => updateBlockContent(idx, 'adjustment', Number(e.target.value) || 0)}
                                  className="w-16 bg-transparent text-right focus:outline-none border-b border-outline-variant/60 focus:border-primary font-mono py-0.5"
                                />
                              </div>
                            )}
                            <div style={{ color: accentColor }} className="flex justify-between font-bold text-[12px] border-t border-outline-variant/60 pt-1.5 mt-1.5">
                              <span>Grand Total:</span>
                              <span className="font-mono">{formatCurrency(total, '₹')}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  }

                  // NOTES BLOCK RENDERING
                  if (block.blockType === 'NOTES') {
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        className={`relative group/block border rounded p-2 cursor-pointer transition-all hover:ring-1 hover:ring-primary/45
                          ${selectedBlockId === block.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-transparent'}`}
                      >
                        {/* Floating controls */}
                        <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                            disabled={idx === blocks.length - 1}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="Duplicate block"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-error-container/20 hover:text-error text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                        <span style={{ color: accentColor }} className="text-[10px] font-bold uppercase tracking-wider block mb-1">
                          {activeTmpl ? activeTmpl.notes.heading : 'Notes & Footnotes'}
                        </span>
                        <textarea
                          value={block.content?.notes || ''}
                          onChange={(e) => updateBlockContent(idx, 'notes', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-outline-variant/60 focus:border-primary focus:outline-none rounded p-1 text-[10px] text-on-surface-variant/80 resize-none leading-relaxed"
                          rows={2}
                          placeholder="Add footnote declarations..."
                        />
                      </div>
                    );
                  }

                  // CUSTOM FIELDS BLOCK RENDERING
                  if (block.blockType === 'CUSTOM_FIELDS') {
                    const fields = block.content?.fields || [];
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        className={`relative group/block border rounded p-2 cursor-pointer transition-all hover:ring-1 hover:ring-primary/45 space-y-2
                          ${selectedBlockId === block.id ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-transparent'}`}
                      >
                        {/* Floating controls */}
                        <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'UP'); }}
                            disabled={idx === 0}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'DOWN'); }}
                            disabled={idx === blocks.length - 1}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); duplicateBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-primary"
                            title="Duplicate block"
                          >
                            <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(idx); }}
                            className="w-5 h-5 rounded bg-surface border border-outline-variant/60 shadow-xs flex items-center justify-center hover:bg-error-container/20 hover:text-error text-on-surface-variant"
                          >
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[11px] leading-relaxed">
                          {fields.map((f: any, fIdx: number) => (
                            <div key={fIdx} className="flex items-center gap-1.5 group/row hover:bg-surface-container-lowest/50 p-0.5 rounded">
                              <input
                                type="text"
                                value={f.key}
                                onChange={(e) => {
                                  const updatedFields = fields.map((field: any, i: number) => i === fIdx ? { ...field, key: e.target.value } : field);
                                  updateBlockContent(idx, 'fields', updatedFields);
                                }}
                                placeholder="Label Name"
                                className="w-1/3 bg-transparent text-[11px] font-bold text-on-surface focus:outline-none border-b border-transparent focus:border-primary"
                              />
                              <span className="text-on-surface-variant">:</span>
                              <input
                                type="text"
                                value={f.value}
                                onChange={(e) => {
                                  const updatedFields = fields.map((field: any, i: number) => i === fIdx ? { ...field, value: e.target.value } : field);
                                  updateBlockContent(idx, 'fields', updatedFields);
                                }}
                                placeholder="Field Value"
                                className="flex-1 bg-transparent text-[11px] text-on-surface-variant/80 focus:outline-none border-b border-transparent focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedFields = fields.filter((_: any, i: number) => i !== fIdx);
                                  updateBlockContent(idx, 'fields', updatedFields);
                                }}
                                className="text-on-surface-variant hover:text-error opacity-0 group-hover/row:opacity-100 transition-opacity no-print"
                              >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFields = [...fields, { key: 'Custom Label', value: '' }];
                            updateBlockContent(idx, 'fields', updatedFields);
                          }}
                          className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:text-primary-fixed-variant no-print"
                        >
                          <span className="material-symbols-outlined text-[12px]">add_circle</span> Add Custom Field
                        </button>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* 4. FOOTER DETAILS BLOCK (Virtual) */}
              <div
                onClick={() => setSelectedBlockId('footer')}
                className={`border-t pt-4 mt-8 cursor-pointer hover:ring-1 hover:ring-primary/45 rounded p-2 transition-all relative group/block
                  ${selectedBlockId === 'footer' ? 'ring-2 ring-primary bg-primary/5 border-transparent' : 'border-outline-variant/40'}`}
              >
                {/* Floating badge controls */}
                <div className="absolute right-2 -top-4 opacity-0 group-hover/block:opacity-100 flex gap-1 z-20 transition-opacity select-none no-print">
                  <span className="bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">edit</span> Edit Payment & Footer
                  </span>
                </div>

                <div className="space-y-6">
                  {[...(activeTmpl?.footerBlocks || [
                    { key: 'payment', label: 'Payment Instructions', visible: fieldVisibility.showPaymentInstructions, order: 0 },
                    { key: 'bank', label: 'Bank Details', visible: fieldVisibility.showBankDetails, order: 1 },
                    { key: 'qr', label: 'QR Code', visible: !!fieldVisibility.qrUrl, order: 2 },
                    { key: 'signature', label: 'Signature', visible: fieldVisibility.showSignature, order: 3 },
                    { key: 'footer', label: 'Footer Declaration', visible: fieldVisibility.showFooter, order: 4 },
                  ])].sort((a, b) => a.order - b.order).map(block => {
                    if (!block.visible) return null;

                    if (block.key === 'payment' && fieldVisibility.showPaymentInstructions) {
                      return (
                        <div key={block.key} className="text-[10.5px] leading-tight">
                          <h6 style={{ color: accentColor }} className="font-bold text-[9px] uppercase tracking-wider mb-1">
                            {activeTmpl ? activeTmpl.payment.heading : 'Payment Instructions'}
                          </h6>
                          <p className="text-on-surface-variant/80">{activeTmpl ? activeTmpl.payment.instructions : 'Please settle outstanding amount within 30 days.'}</p>
                        </div>
                      );
                    }

                    if (block.key === 'bank' && fieldVisibility.showBankDetails) {
                      const comp = companies.find(c => c.id === selectedCompanyId);
                      if (!comp) return null;
                      return (
                        <div key={block.key} className="text-[10.5px] leading-tight">
                          <h6 style={{ color: accentColor }} className="font-bold text-[9px] uppercase tracking-wider mb-1">
                            {activeTmpl ? activeTmpl.bank.heading : 'Bank Transfer Details'}
                          </h6>
                          <div className="space-y-0.5">
                            <p><strong className="font-semibold text-on-surface">Bank:</strong> {comp.bankName || '—'}</p>
                            <p><strong className="font-semibold text-on-surface">Account Name:</strong> {comp.name}</p>
                            <p><strong className="font-semibold text-on-surface">IBAN:</strong> {comp.bankIban || '—'}</p>
                            <p><strong className="font-semibold text-on-surface">BIC/SWIFT:</strong> {comp.bankBic || '—'}</p>
                          </div>
                        </div>
                      );
                    }

                    if (block.key === 'qr' && fieldVisibility.qrUrl) {
                      return (
                        <div key={block.key} className="relative group/qr w-20 h-20 shrink-0">
                          <img src={fieldVisibility.qrUrl} className="w-20 h-20 object-contain border border-outline-variant/60 rounded p-1" alt="QR" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFieldVisibility(prev => ({ ...prev, qrUrl: '' }));
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-error text-on-error hover:bg-error-container rounded-full w-4 h-4 flex items-center justify-center shadow-xs no-print"
                            title="Remove QR Code"
                          >
                            <span className="material-symbols-outlined text-[10px]">close</span>
                          </button>
                        </div>
                      );
                    }

                    if (block.key === 'signature' && fieldVisibility.showSignature && activeTmpl && activeTmpl.signature.show) {
                      return (
                        <div key={block.key} className="pt-4 self-end text-right text-[10px] w-full flex justify-end">
                          <div className="text-center w-48 border-t border-outline-variant pt-1 mt-6 pr-4">
                            <p className="font-bold text-on-surface">{activeTmpl.signature.label}</p>
                          </div>
                        </div>
                      );
                    }

                    if (block.key === 'footer' && fieldVisibility.showFooter && activeTmpl && activeTmpl.footer.show) {
                      return (
                        <div key={block.key} className="pt-2 border-t border-outline-variant/30 text-[9px] text-on-surface-variant/70 text-center flex justify-between w-full">
                          <span>{activeTmpl.footer.text}</span>
                          {activeTmpl.footer.showPageNumbers && <span>Page 1 of 1</span>}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>

            </div>
          </div>
        </main>

        <aside
          style={{ width: `${rightSidebarWidth}px` }}
          className="bg-surface border-l border-outline-variant flex flex-col h-full absolute right-0 top-0 shrink-0 select-none shadow-sm"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizingRight}
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-primary/25 active:bg-primary/45 transition-colors z-50"
            title="Drag to resize properties panel"
          />

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

                {/* 1. If ORGANIZATION BRANDING virtual block selected */}
                {selectedBlockId === 'org-branding' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">branding_watermark</span>
                      <h4 className="font-bold text-[12px] text-on-surface">Org Branding Settings</h4>
                    </div>

                    {/* Field Toggles */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Field Visibility</span>
                      <div className="space-y-2 border border-outline-variant/40 rounded-lg p-2.5 bg-surface-container-low/40">
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showOrgTaxId}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showOrgTaxId: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Company Tax ID
                        </label>
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showOrgAddress}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showOrgAddress: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Organization Address
                        </label>
                      </div>
                    </div>

                    {/* Color Swatch overrides */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Accent Color</span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          {['#3b82f6', '#0d9488', '#16a34a', '#ca8a04', '#4b5563', '#6366f1'].map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setAccentColor(color)}
                              style={{ backgroundColor: color }}
                              className={`w-5 h-5 rounded-full border border-outline-variant/60 transition-transform
                                ${accentColor.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1 border-l pl-2 border-outline-variant/60 ml-1">
                          <input
                            type="color"
                            value={accentColor.startsWith('#') && accentColor.length === 7 ? accentColor : '#3b82f6'}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="w-6 h-6 border-0 p-0 rounded-full cursor-pointer overflow-hidden bg-transparent"
                            title="Custom color picker"
                          />
                          <input
                            type="text"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            placeholder="#hex"
                            className="w-14 h-6 text-[10px] font-mono border border-outline-variant/60 rounded bg-transparent px-1 text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Typography choice */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Document Font</label>
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

                    {/* Stamp / Logo settings */}
                    <p>THis is the logo for of the company</p>
                    <div className="space-y-2">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Branding Elements</span>
                      <div className="space-y-2 border border-outline-variant/40 rounded-lg p-2.5 bg-surface-container-low/40">
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={showStamp}
                            onChange={(e) => setShowStamp(e.target.checked)}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Approved Stamp Overlay
                        </label>
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={showWatermark}
                            onChange={(e) => setShowWatermark(e.target.checked)}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Watermark Overlay
                        </label>
                        {showWatermark && (
                          <div className="flex flex-col gap-1.5 pl-6 pt-1">
                            <label className="text-[9px] text-on-surface-variant font-bold">Watermark Label</label>
                            <input
                              type="text"
                              value={watermarkText}
                              onChange={(e) => setWatermarkText(e.target.value)}
                              className="px-2 py-1 h-7 border border-outline-variant rounded bg-surface text-[11px]"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                    {/* Reusable Template Trigger */}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setSaving(true);
                          const layoutDef = {
                            meta: {
                              name: `${title} Layout Preset`,
                              category: 'INVOICE' as const,
                              description: `Custom layout preset compiled from ${title}`,
                            },
                            theme: {
                              fonts: { heading: fontFamily, body: fontFamily, mono: 'font-mono' },
                              baseFontSize: 10,
                              colors: {
                                primary: accentColor,
                                text: '#1f2937',
                                muted: '#6b7280',
                                border: '#e5e7eb',
                                tableHeaderBg: `${accentColor}10`,
                                tableHeaderText: accentColor,
                                zebraBg: '#f9fafb',
                              }
                            },
                            page: {
                              size: pageSettings.size.toUpperCase() as 'A4' | 'LETTER',
                              orientation: pageSettings.orientation as 'portrait' | 'landscape',
                              margins: {
                                top: pageSettings.marginTop,
                                right: pageSettings.marginRight,
                                bottom: pageSettings.marginBottom,
                                left: pageSettings.marginLeft
                              }
                            },
                            table: {
                              columns: [],
                              zebra: true,
                              showBorders: true,
                              compact: false
                            },
                            watermark: {
                              enabled: showWatermark,
                              text: watermarkText,
                              opacity: 0.05,
                              angle: 45
                            },
                            customer: {
                              showBillTo: true,
                              billToHeading: 'Bill To',
                              showShipTo: true,
                              shipToHeading: 'Ship To',
                              fields: []
                            },
                            payment: {
                              show: true,
                              heading: 'Payment Instructions',
                              instructions: 'Standard Net 30 days terms apply.'
                            },
                            bank: {
                              show: true,
                              heading: 'Bank Transfer details',
                              source: 'company' as const,
                              fields: []
                            },
                            signature: {
                              show: showStamp,
                              label: 'Authorized Signatory',
                              source: 'branding' as const,
                              showStamp: showStamp
                            },
                            footer: {
                              show: true,
                              text: 'Thank you for your business.',
                              showPageNumbers: true
                            }
                          };

                          const res = await api.templateEngine.createDefinition(layoutDef);
                          const updatedList = await api.templateEngine.listDefinitions();
                          setDesignerTemplates(updatedList);
                          setSelectedTemplateId(res.meta.id);
                          triggerToast('Custom styles saved as reusable template!');
                        } catch (e: any) {
                          triggerToast(e.message || 'Failed to save template layout.', true);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="w-full bg-primary-container text-primary hover:bg-primary-container/85 border border-primary/20 transition-all font-bold text-[10.5px] py-1.5 rounded flex items-center justify-center gap-1 active:scale-95 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">style</span>
                      Save as Reusable Template
                    </button>
                  </div>
                )}

                {/* 2. If CLIENT details virtual block selected */}
                {selectedBlockId === 'billing-client' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                      <h4 className="font-bold text-[12px] text-on-surface">Client Info Settings</h4>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant font-bold uppercase">Customer / Client Link</label>
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value || '')}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-[11px] text-on-surface focus:outline-none"
                      >
                        <option value="">Unlinked Client</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 mt-2">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Field Visibility</span>
                      <div className="space-y-2 border border-outline-variant/40 rounded-lg p-2.5 bg-surface-container-low/40">
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showCustTax}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showCustTax: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Client Tax ID / GSTIN
                        </label>
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showCustAddress}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showCustAddress: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Address Lines
                        </label>
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showCustEmail}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showCustEmail: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Contact Email
                        </label>
                        <label className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={fieldVisibility.showCustPhone}
                            onChange={(e) => setFieldVisibility(prev => ({ ...prev, showCustPhone: e.target.checked }))}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          Show Contact Phone
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. If standard block is selected */}
                {(() => {
                  const blockIdx = blocks.findIndex(b => b.id === selectedBlockId);
                  if (blockIdx === -1) return null;
                  const block = blocks[blockIdx];

                  if (block.blockType === 'TABLE') {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                          <h4 className="font-bold text-[12px] text-on-surface">Pricing Table Config</h4>
                        </div>

                        {/* Dynamic Columns Configuration */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-outline-variant/60 pb-1.5 mt-1">
                            <span className="text-[10px] text-on-surface-variant font-bold uppercase">Columns Setup</span>
                            {activeTmpl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newKey = `col_${Date.now()}`;
                                  const newCol = {
                                    key: newKey,
                                    label: 'New Column',
                                    visible: true,
                                    width: 15,
                                    align: 'left',
                                    order: activeTmpl.table.columns.length
                                  };
                                  const newCols = [...activeTmpl.table.columns, newCol];
                                  api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                    table: { ...activeTmpl.table, columns: newCols }
                                  }).then(async () => {
                                    const updated = await api.templateEngine.listDefinitions();
                                    setDesignerTemplates(updated);
                                  });
                                }}
                                className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:underline cursor-pointer bg-transparent border-none"
                              >
                                <span className="material-symbols-outlined text-[12px]">add</span> Add
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            {activeTmpl && [...activeTmpl.table.columns].sort((a, b) => a.order - b.order).map((col) => (
                              <div key={col.key} className="border border-outline-variant/50 rounded-lg p-2.5 space-y-2 bg-surface-container-lowest/50 text-[11px] font-semibold">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="checkbox"
                                      checked={col.visible}
                                      onChange={(e) => {
                                        const newCols = activeTmpl.table.columns.map((c: any) => c.key === col.key ? { ...c, visible: e.target.checked } : c);
                                        api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                          table: { ...activeTmpl.table, columns: newCols }
                                        }).then(async () => {
                                          const updated = await api.templateEngine.listDefinitions();
                                          setDesignerTemplates(updated);
                                        });
                                      }}
                                      className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                                    />
                                    <span className="font-bold text-on-surface truncate max-w-[120px]">{col.label || col.key}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newCols = activeTmpl.table.columns.filter((c: any) => c.key !== col.key);
                                      api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                        table: { ...activeTmpl.table, columns: newCols }
                                      }).then(async () => {
                                        const updated = await api.templateEngine.listDefinitions();
                                        setDesignerTemplates(updated);
                                      });
                                    }}
                                    className="text-on-surface-variant hover:text-error cursor-pointer bg-transparent border-none"
                                    title="Delete Column"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                  </button>
                                </div>

                                {col.visible && (
                                  <div className="space-y-2 text-body-sm mt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] text-on-surface-variant uppercase font-bold">Rename Label</span>
                                        <input
                                          type="text"
                                          value={col.label}
                                          onChange={(e) => {
                                            const newCols = activeTmpl.table.columns.map((c: any) => c.key === col.key ? { ...c, label: e.target.value } : c);
                                            api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                              table: { ...activeTmpl.table, columns: newCols }
                                            }).then(async () => {
                                              const updated = await api.templateEngine.listDefinitions();
                                              setDesignerTemplates(updated);
                                            });
                                          }}
                                          className="px-1.5 py-0.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[10px]"
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] text-on-surface-variant uppercase font-bold">Align</span>
                                        <select
                                          value={col.align || 'left'}
                                          onChange={(e) => {
                                            const newCols = activeTmpl.table.columns.map((c: any) => c.key === col.key ? { ...c, align: e.target.value } : c);
                                            api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                              table: { ...activeTmpl.table, columns: newCols }
                                            }).then(async () => {
                                              const updated = await api.templateEngine.listDefinitions();
                                              setDesignerTemplates(updated);
                                            });
                                          }}
                                          className="px-1.5 py-0.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px] text-on-surface font-semibold cursor-pointer"
                                        >
                                          <option value="left">Left</option>
                                          <option value="center">Center</option>
                                          <option value="right">Right</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-0.5 font-mono">
                                      <span className="text-[9px] text-on-surface-variant uppercase font-bold">Width: {col.width}%</span>
                                      <input
                                        type="range"
                                        min="5"
                                        max="70"
                                        value={col.width}
                                        onChange={(e) => {
                                          const newCols = activeTmpl.table.columns.map((c: any) => c.key === col.key ? { ...c, width: Number(e.target.value) || 10 } : c);
                                          api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                            table: { ...activeTmpl.table, columns: newCols }
                                          }).then(async () => {
                                            const updated = await api.templateEngine.listDefinitions();
                                            setDesignerTemplates(updated);
                                          });
                                        }}
                                        className="w-full accent-primary h-1 bg-surface-variant rounded appearance-none cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Pricing adjustments */}
                        <div className="space-y-3">
                          <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Pricing Adjustments</span>
                          <div className="space-y-2.5 border border-outline-variant/40 rounded-lg p-2.5 bg-surface-container-low/40">
                            <label className="flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={fieldVisibility.applyDiscount}
                                onChange={(e) => setFieldVisibility(prev => ({ ...prev, applyDiscount: e.target.checked }))}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                              />
                              Apply Discount Row
                            </label>
                            <label className="flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                checked={fieldVisibility.applyAdjustment}
                                onChange={(e) => setFieldVisibility(prev => ({ ...prev, applyAdjustment: e.target.checked }))}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                              />
                              Apply Adjustment Row
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {fieldVisibility.applyDiscount && (
                              <div className="flex flex-col gap-0.5 animate-fade-in">
                                <label className="text-[9px] text-on-surface-variant font-bold uppercase">Discount (₹)</label>
                                <input
                                  type="number"
                                  value={block.content?.discount || 0}
                                  onChange={(e) => updateBlockContent(blockIdx, 'discount', Number(e.target.value) || 0)}
                                  className="h-8 px-2 border border-outline-variant rounded bg-surface font-semibold text-[11px] font-mono"
                                />
                              </div>
                            )}
                            {fieldVisibility.applyAdjustment && (
                              <div className="flex flex-col gap-0.5 animate-fade-in">
                                <label className="text-[9px] text-on-surface-variant font-bold uppercase">Adjustment (₹)</label>
                                <input
                                  type="number"
                                  value={block.content?.adjustment || 0}
                                  onChange={(e) => updateBlockContent(blockIdx, 'adjustment', Number(e.target.value) || 0)}
                                  className="h-8 px-2 border border-outline-variant rounded bg-surface font-semibold text-[11px] font-mono"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // TEXT / NOTES specific options
                  if (block.blockType === 'TEXT' || block.blockType === 'NOTES') {
                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">notes</span>
                          <h4 className="font-bold text-[12px] text-on-surface">{block.blockType === 'TEXT' ? 'Text block properties' : 'Notes block properties'}</h4>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-on-surface-variant font-bold uppercase">Edit Text content</label>
                          <textarea
                            value={block.blockType === 'TEXT' ? (block.content?.text || '') : (block.content?.notes || '')}
                            onChange={(e) => updateBlockContent(blockIdx, block.blockType === 'TEXT' ? 'text' : 'notes', e.target.value)}
                            rows={6}
                            className="p-2 border border-outline-variant rounded bg-surface text-[11px] font-medium resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* 4. If FOOTER details block selected */}
                {selectedBlockId === 'footer' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                      <h4 className="font-bold text-[12px] text-on-surface">Payment Stub & Footer</h4>
                    </div>

                    {/* Checkbox visibility toggles */}
                    <div className="space-y-2 border border-outline-variant/40 rounded-lg p-2.5 bg-surface-container-low/40">
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={fieldVisibility.showPaymentInstructions}
                          onChange={(e) => setFieldVisibility(prev => ({ ...prev, showPaymentInstructions: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Show Payment Instructions
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={fieldVisibility.showBankDetails}
                          onChange={(e) => setFieldVisibility(prev => ({ ...prev, showBankDetails: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Show Bank Transfer Details
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={fieldVisibility.showSignature}
                          onChange={(e) => setFieldVisibility(prev => ({ ...prev, showSignature: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Show Signatory Line
                      </label>
                      <label className="flex items-center gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={fieldVisibility.showFooter}
                          onChange={(e) => setFieldVisibility(prev => ({ ...prev, showFooter: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        Show Footer Text Line
                      </label>
                    </div>

                    {fieldVisibility.showBankDetails && activeTmpl && activeTmpl.bank && (
                      <div className="flex flex-col gap-2 p-2.5 border border-outline-variant/40 rounded-lg bg-surface-container-low/40">
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Display Bank Fields</span>
                        <div className="space-y-2 mt-1">
                          {activeTmpl.bank.fields.map((f: any) => (
                            <label key={f.key} className="flex items-center justify-between text-[11px] font-semibold cursor-pointer">
                              <span className="capitalize">{f.key.replace('bankName', 'Bank').replace('account', 'Account')}</span>
                              <input
                                type="checkbox"
                                checked={f.visible}
                                onChange={(e) => {
                                  const newF = activeTmpl.bank.fields.map((field: any) => field.key === f.key ? { ...field, visible: e.target.checked } : field);
                                  api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                    bank: { ...activeTmpl.bank, fields: newF }
                                  }).then(async () => {
                                    const updated = await api.templateEngine.listDefinitions();
                                    setDesignerTemplates(updated);
                                  });
                                }}
                                className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                    {fieldVisibility.showPaymentInstructions && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-on-surface-variant font-bold uppercase">Payment Instructions</label>
                        <textarea
                          value={activeTmpl ? activeTmpl.payment.instructions : 'Settle outstanding invoices within 30 days.'}
                          onChange={(e) => {
                            if (activeTmpl) {
                              api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                payment: { ...activeTmpl.payment, instructions: e.target.value }
                              }).then(async () => {
                                const updated = await api.templateEngine.listDefinitions();
                                setDesignerTemplates(updated);
                              });
                            }
                          }}
                          rows={3}
                          className="p-2 border border-outline-variant rounded bg-surface text-[11px] font-medium resize-none leading-relaxed"
                        />
                      </div>
                    )}

                    {fieldVisibility.showSignature && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-on-surface-variant font-bold uppercase">Signature Label</label>
                        <input
                          type="text"
                          value={activeTmpl ? activeTmpl.signature.label : 'Authorized Signatory'}
                          onChange={(e) => {
                            if (activeTmpl) {
                              api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                signature: { ...activeTmpl.signature, label: e.target.value }
                              }).then(async () => {
                                const updated = await api.templateEngine.listDefinitions();
                                setDesignerTemplates(updated);
                              });
                            }
                          }}
                          className="h-8 px-2 border border-outline-variant rounded bg-surface text-[11px] font-medium"
                        />
                      </div>
                    )}

                    {fieldVisibility.showFooter && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-on-surface-variant font-bold uppercase">Footer text line</label>
                        <textarea
                          value={activeTmpl ? activeTmpl.footer.text : 'Thank you for choosing us.'}
                          onChange={(e) => {
                            if (activeTmpl) {
                              api.templateEngine.updateDefinition(activeTmpl.meta.id, {
                                footer: { ...activeTmpl.footer, text: e.target.value }
                              }).then(async () => {
                                const updated = await api.templateEngine.listDefinitions();
                                setDesignerTemplates(updated);
                              });
                            }
                          }}
                          rows={2}
                          className="p-2 border border-outline-variant rounded bg-surface text-[11px] font-medium resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Default General properties when no canvas block is active */}
                {!selectedBlockId && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                      <h4 className="font-bold text-[12px] text-on-surface">Document Details</h4>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant font-bold uppercase">Document Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          triggerAutoSave(blocks, e.target.value);
                        }}
                        className="h-8 px-2 border border-outline-variant rounded bg-surface text-[11.5px] font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant font-bold uppercase">Document Status</label>
                      <select
                        value={status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-body-sm font-semibold text-on-surface focus:outline-none"
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

                    <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant font-bold uppercase">Active Blueprint Theme</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTemplateId(val);
                          const selectedTmpl = designerTemplates.find(t => t.meta.id === val);
                          if (selectedTmpl) {
                            const newAccent = selectedTmpl.theme.colors.primary;
                            const newFont = selectedTmpl.theme.fonts.body.includes('Mono') ? 'font-mono' : selectedTmpl.theme.fonts.body.includes('Serif') ? 'font-serif' : 'font-sans';
                            const newWatermark = selectedTmpl.watermark.enabled;
                            const newWatermarkText = selectedTmpl.watermark.text;
                            setAccentColor(newAccent);
                            setFontFamily(newFont);
                            setShowWatermark(newWatermark);
                            setWatermarkText(newWatermarkText);
                            api.documents.update(id, {
                              templateId: val,
                              accentColor: newAccent,
                              fontFamily: newFont,
                              showWatermark: newWatermark,
                              watermarkText: newWatermarkText,
                            }).catch(console.error);
                          } else {
                            api.documents.update(id, { templateId: val }).catch(console.error);
                          }
                        }}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-[11px] font-semibold text-on-surface focus:outline-none"
                      >
                        {designerTemplates.map(t => (
                          <option key={t.meta.id} value={t.meta.id}>{t.meta.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                    <button
                      onClick={handleDuplicate}
                      className="w-full bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors font-bold text-[11px] py-1.5 rounded flex items-center justify-center gap-1 text-on-surface active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Duplicate Document
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* STYLES TAB */}
            {activeRightTab === 'styles' && (
              <div className="space-y-4">

                {/* Apply from Templates list */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Apply Layout Theme</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTemplateId(val);
                      const selectedTmpl = designerTemplates.find(t => t.meta.id === val);
                      if (selectedTmpl) {
                        const newAccent = selectedTmpl.theme.colors.primary;
                        const newFont = selectedTmpl.theme.fonts.body.includes('Mono') ? 'font-mono' : selectedTmpl.theme.fonts.body.includes('Serif') ? 'font-serif' : 'font-sans';
                        const newWatermark = selectedTmpl.watermark.enabled;
                        const newWatermarkText = selectedTmpl.watermark.text;
                        setAccentColor(newAccent);
                        setFontFamily(newFont);
                        setShowWatermark(newWatermark);
                        setWatermarkText(newWatermarkText);
                        api.documents.update(id, {
                          templateId: val,
                          accentColor: newAccent,
                          fontFamily: newFont,
                          showWatermark: newWatermark,
                          watermarkText: newWatermarkText,
                        }).catch(console.error);
                        triggerToast(`Applied styles from "${selectedTmpl.meta.name}".`);
                      }
                    }}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-body-sm font-semibold text-on-surface focus:outline-none"
                  >
                    <option value="">Select layout theme...</option>
                    {designerTemplates.map(t => (
                      <option key={t.meta.id} value={t.meta.id}>{t.meta.name}</option>
                    ))}
                  </select>
                </div>

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
              <div className="space-y-4 select-none">

                <div className="space-y-3">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Template Design Layout</span>

                  {designerTemplates.length === 0 ? (
                    <div className="text-[10px] text-on-surface-variant italic">
                      No custom layouts defined in Template Designer.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-on-surface-variant font-bold uppercase">Select Blueprint</label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTemplateId(val);
                          const selectedTmpl = designerTemplates.find(t => t.meta.id === val);
                          if (selectedTmpl) {
                            const newAccent = selectedTmpl.theme.colors.primary;
                            const newFont = selectedTmpl.theme.fonts.body.includes('Mono') ? 'font-mono' : selectedTmpl.theme.fonts.body.includes('Serif') ? 'font-serif' : 'font-sans';
                            const newWatermark = selectedTmpl.watermark.enabled;
                            const newWatermarkText = selectedTmpl.watermark.text;
                            setAccentColor(newAccent);
                            setFontFamily(newFont);
                            setShowWatermark(newWatermark);
                            setWatermarkText(newWatermarkText);
                            api.documents.update(id, {
                              templateId: val,
                              accentColor: newAccent,
                              fontFamily: newFont,
                              showWatermark: newWatermark,
                              watermarkText: newWatermarkText,
                            }).catch(console.error);
                          } else {
                            api.documents.update(id, { templateId: val }).catch(console.error);
                          }
                        }}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-[11px] font-semibold text-on-surface focus:outline-none"
                      >
                        {designerTemplates.map(t => (
                          <option key={t.meta.id} value={t.meta.id}>{t.meta.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadDesignerFile('pdf')}
                      className="bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold text-[10px] py-2 rounded flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDesignerFile('docx')}
                      className="bg-surface hover:bg-surface-container border border-outline-variant transition-colors font-bold text-[10px] py-2 text-on-surface rounded flex items-center justify-center gap-1 shadow-sm active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">description</span>
                      Export Word
                    </button>
                  </div>
                </div>

                <div className="h-px bg-outline-variant/60 w-full pt-1"></div>

                {/* Print Layout */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="w-full bg-surface border border-outline-variant hover:bg-surface-container transition-colors text-on-surface-variant/80 font-bold text-[10px] py-1.5 rounded flex items-center justify-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[14px]">print</span>
                  Print Web Screen (Default Browser)
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

function formatCurrency(amount: number, symbol: string): string {
  const sym = symbol === '₹' ? 'Rs. ' : symbol;
  return `${sym}${Number(amount).toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}
