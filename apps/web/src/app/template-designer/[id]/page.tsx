'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '../../../components/shared/MainLayout';
import ContextualInspector from '../../../components/shared/ContextualInspector';
import { api } from '../../../lib/api';
import { TemplateDefinitionDto, DocumentDto, InvoiceData } from '@docflow/shared-types';

export default function TemplateDesignerWorkspacePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [templateDef, setTemplateDef] = useState<TemplateDefinitionDto | null>(null);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  
  // Real or mock data loaded from preview endpoint
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Active configuration section selection state
  const [activePanel, setActivePanel] = useState<string>('theme');

  const loadData = async () => {
    setLoading(true);
    try {
      const [def, docList] = await Promise.all([
        api.templateEngine.getDefinition(id),
        api.documents.list({ limit: 20 }),
      ]);
      setTemplateDef(def);
      setDocuments(docList);
      if (docList.length > 0) {
        setSelectedDocId(docList[0].id);
      }
      
      // Load initial preview data using local mock fallback
      const prevData = await api.templateEngine.preview(def, docList[0]?.id || undefined);
      setInvoiceData(prevData.invoiceData);
    } catch (e) {
      console.error('Failed to load workspace designer configurations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // Reload preview data when selected document changes
  const handleDocumentChange = async (docId: string) => {
    setSelectedDocId(docId);
    if (!templateDef) return;
    try {
      const prevData = await api.templateEngine.preview(templateDef, docId || undefined);
      setInvoiceData(prevData.invoiceData);
    } catch (e) {
      console.error('Failed to load document preview data:', e);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!templateDef) return;
    setSaving(true);
    try {
      await api.templateEngine.updateDefinition(id, templateDef);
      triggerToast('Template configuration saved.');
    } catch (err: any) {
      console.error('Failed to save template:', err);
      triggerToast(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!templateDef || !selectedDocId) {
      triggerToast('Please select a document to compile.');
      return;
    }
    setRendering(true);
    try {
      // Auto-save styling parameters before generating file exports
      await api.templateEngine.updateDefinition(id, templateDef);
      
      const res = await api.templateEngine.render(selectedDocId, id, format);
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
      
      triggerToast(`${format.toUpperCase()} invoice compiled successfully.`);
    } catch (err: any) {
      console.error('Failed to compile file:', err);
      triggerToast(err.message || 'File compilation failed.');
    } finally {
      setRendering(false);
    }
  };

  // Helper to update template nested configs
  const updateNestedConfig = (sectionKey: string, fieldKey: string, value: any) => {
    if (!templateDef) return;
    setTemplateDef({
      ...templateDef,
      [sectionKey]: {
        ...(templateDef as any)[sectionKey],
        [fieldKey]: value,
      },
    });
  };

  if (loading || !templateDef || !invoiceData) {
    return (
      <MainLayout>
        <div className="flex h-full w-full items-center justify-center bg-background select-none">
          <div className="text-center font-body-sm text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-[32px] text-primary mb-2 block">design_services</span>
            Entering visual Template Designer Studio...
          </div>
        </div>
      </MainLayout>
    );
  }

  // Styles values
  const themeColors = templateDef.theme.colors;
  const pageMargins = templateDef.page.margins;
  
  // Safe array lists for configurations
  const sortedColumns = [...templateDef.table.columns].sort((a, b) => a.order - b.order);
  const sortedTotals = [...templateDef.totals.rows].sort((a, b) => a.order - b.order);

  return (
    <MainLayout>
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface font-semibold text-body-sm px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center gap-2 select-none">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          {toastMsg}
        </div>
      )}

      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* ======================================================== */}
        {/* LEFT CONFIGURATION PANELS NAVIGATION */}
        {/* ======================================================== */}
        <aside className="w-[220px] bg-surface border-r border-outline-variant flex flex-col h-full shrink-0 select-none">
          <div className="p-4 border-b border-outline-variant flex items-center gap-2 h-12 bg-surface-container-lowest">
            <button onClick={() => router.push('/template-designer')} className="p-0.5 hover:bg-surface-container rounded text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <span className="font-label-md text-label-md font-bold text-on-surface">Layout Blueprint</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-body-sm font-semibold">
            {[
              { id: 'page', label: 'Page & Margins', icon: 'crop_free' },
              { id: 'theme', label: 'Theme & Palette', icon: 'palette' },
              { id: 'logo', label: 'Company Logo', icon: 'image' },
              { id: 'header', label: 'Document Header', icon: 'top_panel_open' },
              { id: 'table', label: 'Line Items Grid', icon: 'table_chart' },
              { id: 'totals', label: 'Totals Block', icon: 'price_check' },
              { id: 'bank', label: 'Bank Details', icon: 'account_balance' },
              { id: 'watermark', label: 'Watermark Stamp', icon: 'approval' },
              { id: 'footer', label: 'Footer info', icon: 'subtitles' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer
                  ${activePanel === item.id 
                    ? 'bg-primary/5 text-primary border border-primary/10' 
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'}`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* MIDDLE LIVE CANVAS HTML PREVIEW */}
        {/* ======================================================== */}
        <section className="flex-1 overflow-y-auto p-8 bg-surface-bright custom-scrollbar flex flex-col items-center">
          
          {/* Document Preview controls */}
          <div className="w-full max-w-[800px] mb-4 bg-surface border border-outline-variant p-3 rounded-lg shadow-xs flex justify-between items-center select-none text-body-sm font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-on-surface-variant">Active Document:</span>
              <select
                value={selectedDocId}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="bg-surface border border-outline-variant/60 rounded px-2 py-1 text-[11px] focus:outline-none"
              >
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.title} ({d.type})</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('docx')}
                disabled={rendering}
                className="bg-surface border border-outline-variant hover:bg-surface-container-low text-[11px] font-bold text-on-surface px-2.5 py-1.2 rounded flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">description</span>
                Export DOCX
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                disabled={rendering}
                className="bg-primary text-on-primary hover:bg-primary-fixed-variant text-[11px] font-bold px-2.5 py-1.2 rounded flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Export PDF
              </button>
            </div>
          </div>

          {/* HTML Invoice Sheet simulating output page */}
          <div 
            style={{
              padding: `${pageMargins.top}pt ${pageMargins.right}pt ${pageMargins.bottom}pt ${pageMargins.left}pt`,
              fontFamily: templateDef.theme.fonts.body.includes('Mono') ? 'monospace' : templateDef.theme.fonts.body.includes('Serif') ? 'serif' : 'sans-serif',
              fontSize: `${templateDef.theme.baseFontSize}pt`,
              color: themeColors.text,
            }}
            className="w-full max-w-[800px] min-h-[960px] bg-white border border-outline-variant shadow-xl rounded-lg relative overflow-hidden flex flex-col select-none text-body-sm font-medium"
          >
            {/* Watermark Visual Overlay */}
            {templateDef.watermark.enabled && (
              <div 
                style={{
                  opacity: templateDef.watermark.opacity,
                  transform: `translate(-50%, -50%) rotate(-${templateDef.watermark.angle}deg)`,
                  color: themeColors.muted,
                }}
                className="absolute left-1/2 top-1/2 font-bold text-[56px] pointer-events-none select-none tracking-wider whitespace-nowrap z-0 font-sans"
              >
                {templateDef.watermark.text}
              </div>
            )}

            {/* Document Title header */}
            {templateDef.header.showTitle && (
              <div className="mb-4">
                <h2 
                  style={{ color: themeColors.primary, fontSize: `${templateDef.theme.baseFontSize + 12}pt` }}
                  className="font-bold uppercase tracking-wide"
                >
                  {invoiceData.documentType}
                </h2>
                {templateDef.header.accentBar && (
                  <div style={{ backgroundColor: themeColors.primary }} className="h-0.5 w-full mt-1"></div>
                )}
              </div>
            )}

            {/* Organizations details & Document Meta */}
            <div className="flex justify-between items-start gap-4 mb-6 z-10">
              <div>
                <h4 style={{ color: themeColors.primary }} className="font-bold mb-1">{invoiceData.organization.name}</h4>
                {invoiceData.organization.lines.map((ln, i) => <p key={i} className="text-on-surface-variant/80 text-[11px] leading-tight">{ln}</p>)}
                {invoiceData.organization.taxId && <p className="text-on-surface-variant/80 text-[11px] mt-1">{invoiceData.organization.taxId}</p>}
              </div>
              <div className="text-right text-[11px] leading-relaxed">
                <p><strong className="font-semibold text-on-surface">Invoice No:</strong> {invoiceData.documentNumber}</p>
                <p><strong className="font-semibold text-on-surface">Issue Date:</strong> {formatDate(invoiceData.issueDate)}</p>
                {invoiceData.dueDate && <p><strong className="font-semibold text-on-surface">Due Date:</strong> {formatDate(invoiceData.dueDate)}</p>}
              </div>
            </div>

            {/* Client address row details */}
            <div className="flex gap-12 mb-8 z-10">
              {templateDef.customer.showBillTo && (
                <div className="flex-1">
                  <h5 style={{ color: themeColors.primary }} className="font-bold text-[10px] uppercase tracking-wider mb-1.5">{templateDef.customer.billToHeading}</h5>
                  <p className="font-bold text-on-surface">{invoiceData.billTo.name}</p>
                  {invoiceData.billTo.lines.map((ln, i) => <p key={i} className="text-on-surface-variant/80 text-[11px] leading-snug">{ln}</p>)}
                  {invoiceData.billTo.taxId && <p className="text-on-surface-variant/80 text-[11px] mt-1 font-semibold">{invoiceData.billTo.taxId}</p>}
                </div>
              )}
              {templateDef.customer.showShipTo && invoiceData.shipTo && (
                <div className="flex-1">
                  <h5 style={{ color: themeColors.primary }} className="font-bold text-[10px] uppercase tracking-wider mb-1.5">{templateDef.customer.shipToHeading}</h5>
                  <p className="font-bold text-on-surface">{invoiceData.shipTo.name}</p>
                  {invoiceData.shipTo.lines.map((ln, i) => <p key={i} className="text-on-surface-variant/80 text-[11px] leading-snug">{ln}</p>)}
                </div>
              )}
            </div>

            {/* Table Line Items */}
            <div className="mb-6 z-10">
              <table className="w-full text-left border-collapse text-[11px] font-semibold">
                <thead>
                  <tr 
                    style={{ backgroundColor: themeColors.tableHeaderBg, color: themeColors.tableHeaderText }}
                    className="border-b border-outline-variant/60"
                  >
                    {sortedColumns.map(col => col.visible && (
                      <th 
                        key={col.key}
                        style={{ width: `${col.width}%`, textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' }}
                        className="p-2"
                      >
                        {col.label.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-on-surface">
                  {invoiceData.items.map((item, rIdx) => (
                    <tr 
                      key={item.index}
                      style={{ backgroundColor: templateDef.table.zebra && rIdx % 2 === 1 ? themeColors.zebraBg : 'transparent' }}
                    >
                      {sortedColumns.map(col => {
                        if (!col.visible) return null;
                        let val = '';
                        if (col.key === 'index') val = String(item.index);
                        else if (col.key === 'sku') val = item.sku;
                        else if (col.key === 'description') val = item.description;
                        else if (col.key === 'quantity') val = String(item.quantity);
                        else if (col.key === 'unit') val = item.unit;
                        else if (col.key === 'rate') val = formatCurrency(item.rate, invoiceData.currencySymbol);
                        else if (col.key === 'tax') val = item.taxLabel;
                        else if (col.key === 'amount') val = formatCurrency(item.amount, invoiceData.currencySymbol);

                        return (
                          <td 
                            key={col.key}
                            style={{ textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left' }}
                            className="p-2.5 align-middle"
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes bottom grid */}
            <div className="grid grid-cols-12 gap-6 mt-4 z-10">
              <div className="col-span-7">
                {templateDef.notes.show && (invoiceData.notes || templateDef.notes.text) && (
                  <div>
                    <h6 style={{ color: themeColors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{templateDef.notes.heading}</h6>
                    <p className="text-[10px] text-on-surface-variant/80 whitespace-pre-line leading-relaxed">{invoiceData.notes || templateDef.notes.text}</p>
                  </div>
                )}
              </div>
              <div className="col-span-5 space-y-1.5 text-[11px] leading-relaxed">
                {sortedTotals.map(row => {
                  if (!row.visible) return null;
                  let val = 0;
                  if (row.key === 'subtotal') val = invoiceData.subtotal;
                  else if (row.key === 'discount') val = invoiceData.discount;
                  else if (row.key === 'tax') val = invoiceData.taxTotal;
                  else if (row.key === 'shipping') val = invoiceData.shipping;
                  else if (row.key === 'grandTotal') val = invoiceData.grandTotal;

                  return (
                    <div 
                      key={row.key} 
                      style={{ color: row.emphasis ? themeColors.primary : themeColors.text }}
                      className={`flex justify-between ${row.emphasis ? 'font-bold text-[12px] border-t border-outline-variant/60 pt-1.5 mt-1.5' : ''}`}
                    >
                      <span>{row.label}:</span>
                      <span>{formatCurrency(val, invoiceData.currencySymbol)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment & Bank instructions details */}
            <div className="grid grid-cols-2 gap-8 border-t border-outline-variant/40 pt-4 mt-8 z-10 text-[10px] leading-tight">
              {templateDef.payment.show && (
                <div>
                  <h6 style={{ color: themeColors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{templateDef.payment.heading}</h6>
                  <p className="text-on-surface-variant/80">{templateDef.payment.instructions}</p>
                </div>
              )}
              {templateDef.bank.show && invoiceData.bank && (
                <div>
                  <h6 style={{ color: themeColors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{templateDef.bank.heading}</h6>
                  {templateDef.bank.fields.map(f => {
                    if (!f.visible) return null;
                    let txt = '';
                    if (f.key === 'bankName') txt = invoiceData.bank?.bankName || '';
                    else if (f.key === 'accountHolder') txt = invoiceData.bank?.accountHolder || '';
                    else if (f.key === 'accountNumber') txt = invoiceData.bank?.accountNumber || '';
                    else if (f.key === 'iban') txt = invoiceData.bank?.iban || '';
                    else if (f.key === 'bic') txt = invoiceData.bank?.bic || '';

                    if (!txt) return null;
                    return (
                      <p key={f.key} className="text-on-surface-variant/80 mb-0.5">
                        <strong className="font-semibold text-on-surface">{f.label}:</strong> {txt}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Signature Area */}
            {templateDef.signature.show && (
              <div className="mt-auto pt-10 self-end text-right z-10 text-[10px]">
                <div className="border-t border-outline-variant w-40 inline-block"></div>
                <p className="font-bold text-on-surface mt-1 pr-6">{templateDef.signature.label}</p>
              </div>
            )}

            {/* Footer */}
            {templateDef.footer.show && (
              <div className="mt-12 pt-2 border-t border-outline-variant/30 text-[9px] text-on-surface-variant/70 text-center flex justify-between z-10">
                <span>{templateDef.footer.text}</span>
                {templateDef.footer.showPageNumbers && <span>Page 1 of 1</span>}
              </div>
            )}

          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT PROPERTY INSPECTORS FOR SELECTIVE CUSTOMIZATIONS */}
        {/* ======================================================== */}
        <ContextualInspector title="Design Settings">
          <div className="flex flex-col gap-4 text-body-sm select-none">
            
            <header className="pb-2 border-b border-outline-variant flex justify-between items-center">
              <div>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wide">ZOho custom styling</span>
                <h3 className="font-headline-md font-bold text-on-surface leading-tight truncate max-w-[160px]">{templateDef.meta.name}</h3>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-3.5 bg-primary hover:bg-primary-fixed-variant text-on-primary font-bold text-[11px] rounded-lg active:scale-95 disabled:opacity-50 flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">save</span>
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            </header>

            {/* PAGE CONFIG PANEL */}
            {activePanel === 'page' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Page Format Size</label>
                  <select
                    value={templateDef.page.size}
                    onChange={(e) => updateNestedConfig('page', 'size', e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm text-on-surface font-semibold focus:outline-none"
                  >
                    <option value="A4">A4 (International)</option>
                    <option value="LETTER">US Letter Size</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Page Orientation</label>
                  <select
                    value={templateDef.page.orientation}
                    onChange={(e) => updateNestedConfig('page', 'orientation', e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm text-on-surface font-semibold focus:outline-none"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                
                {/* Margins */}
                <div className="space-y-2.5">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Margins Spacings (pt)</span>
                  {['top', 'right', 'bottom', 'left'].map(side => (
                    <div key={side} className="flex justify-between items-center gap-2 text-body-sm font-semibold">
                      <span className="capitalize w-12 text-on-surface-variant">{side}</span>
                      <input 
                        type="range"
                        min="10"
                        max="80"
                        value={(templateDef.page.margins as any)[side]}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 20;
                          updateNestedConfig('page', 'margins', {
                            ...templateDef.page.margins,
                            [side]: val,
                          });
                        }}
                        className="flex-1 accent-primary h-1 bg-surface-variant rounded appearance-none cursor-pointer"
                      />
                      <span className="font-mono text-primary w-10 text-right">{(templateDef.page.margins as any)[side]}pt</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* THEME CONFIG PANEL */}
            {activePanel === 'theme' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Primary Theme Accent</span>
                  <div className="flex gap-2.5">
                    {['#3525CD', '#0D9488', '#16a34a', '#d97706', '#dc2626', '#1e293b'].map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setTemplateDef({
                            ...templateDef,
                            theme: {
                              ...templateDef.theme,
                              colors: {
                                ...templateDef.theme.colors,
                                primary: color,
                                tableHeaderBg: `${color}15`,
                                tableHeaderText: color,
                                zebraBg: `${color}05`,
                              },
                            },
                          });
                        }}
                        style={{ backgroundColor: color }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer
                          ${themeColors.primary === color ? 'border-on-surface scale-110 shadow-xs' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Fonts Typography Preset</label>
                  <select
                    value={templateDef.theme.fonts.body}
                    onChange={(e) => {
                      const f = e.target.value;
                      const isMono = f === 'Courier';
                      const isSerif = f === 'Georgia';
                      setTemplateDef({
                        ...templateDef,
                        theme: {
                          ...templateDef.theme,
                          fonts: {
                            heading: isMono ? 'Courier-Bold' : isSerif ? 'Georgia-Bold' : 'Helvetica-Bold',
                            body: f,
                            mono: 'Courier',
                          },
                        },
                      });
                    }}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm text-on-surface font-semibold focus:outline-none"
                  >
                    <option value="Helvetica">Helvetica (Modern Sans)</option>
                    <option value="Georgia">Georgia (Classic Serif)</option>
                    <option value="Courier">Courier (Monospace Code)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Base font size</label>
                  <div className="flex gap-2 items-center font-mono">
                    <input 
                      type="range"
                      min="8"
                      max="14"
                      value={templateDef.theme.baseFontSize}
                      onChange={(e) => updateNestedConfig('theme', 'baseFontSize', Number(e.target.value) || 10)}
                      className="flex-1 accent-primary h-1 bg-surface-variant rounded appearance-none cursor-pointer"
                    />
                    <span className="text-primary font-bold">{templateDef.theme.baseFontSize}pt</span>
                  </div>
                </div>
              </div>
            )}

            {/* LOGO CONFIG PANEL */}
            {activePanel === 'logo' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Display Branding Logo</span>
                  <input
                    type="checkbox"
                    checked={templateDef.logo.enabled}
                    onChange={(e) => updateNestedConfig('logo', 'enabled', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                {templateDef.logo.enabled && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Logo Align Position</label>
                      <select
                        value={templateDef.logo.position}
                        onChange={(e) => updateNestedConfig('logo', 'position', e.target.value)}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm text-on-surface font-semibold focus:outline-none"
                      >
                        <option value="left">Left Align</option>
                        <option value="center">Center Align</option>
                        <option value="right">Right Align</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Max Width</label>
                      <input
                        type="number"
                        value={templateDef.logo.maxWidth}
                        onChange={(e) => updateNestedConfig('logo', 'maxWidth', Number(e.target.value) || 120)}
                        className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* HEADER CONFIG PANEL */}
            {activePanel === 'header' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Show Header Title</span>
                  <input
                    type="checkbox"
                    checked={templateDef.header.showTitle}
                    onChange={(e) => updateNestedConfig('header', 'showTitle', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                {templateDef.header.showTitle && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Header Title Template</label>
                      <input
                        type="text"
                        value={templateDef.header.titleText}
                        onChange={(e) => updateNestedConfig('header', 'titleText', e.target.value)}
                        placeholder="e.g. {document.type}"
                        className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none font-semibold"
                      />
                    </div>
                    <div className="flex items-center justify-between text-body-sm font-semibold">
                      <span>Colored Accent Bar</span>
                      <input
                        type="checkbox"
                        checked={templateDef.header.accentBar}
                        onChange={(e) => updateNestedConfig('header', 'accentBar', e.target.checked)}
                        className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TABLE COLUMNS CONFIG PANEL */}
            {activePanel === 'table' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Zebra Grid BG Rows</span>
                  <input
                    type="checkbox"
                    checked={templateDef.table.zebra}
                    onChange={(e) => updateNestedConfig('table', 'zebra', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Show Table Cell Borders</span>
                  <input
                    type="checkbox"
                    checked={templateDef.table.showBorders}
                    onChange={(e) => updateNestedConfig('table', 'showBorders', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>

                <div className="h-px bg-outline-variant/60 w-full"></div>
                <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Columns Options</span>
                
                <div className="space-y-3.5">
                  {sortedColumns.map((col, idx) => (
                    <div key={col.key} className="border border-outline-variant/50 rounded-lg p-2.5 space-y-2 bg-surface-container-lowest shadow-xs text-[11px] font-semibold">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-on-surface capitalize">{col.key} Column</span>
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={(e) => {
                            const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, visible: e.target.checked } : c);
                            updateNestedConfig('table', 'columns', newCols);
                          }}
                          className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                        />
                      </div>
                      {col.visible && (
                        <div className="grid grid-cols-2 gap-2 text-body-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-on-surface-variant uppercase font-bold">Label</span>
                            <input
                              type="text"
                              value={col.label}
                              onChange={(e) => {
                                const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, label: e.target.value } : c);
                                updateNestedConfig('table', 'columns', newCols);
                              }}
                              className="px-1.5 py-0.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 font-mono">
                            <span className="text-[9px] text-on-surface-variant uppercase font-bold">Width: {col.width}%</span>
                            <input
                              type="range"
                              min="5"
                              max="70"
                              value={col.width}
                              onChange={(e) => {
                                const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, width: Number(e.target.value) || 10 } : c);
                                updateNestedConfig('table', 'columns', newCols);
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
            )}

            {/* TOTALS CONFIG PANEL */}
            {activePanel === 'totals' && (
              <div className="space-y-4">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase block">Totals visibility & Labels</span>
                <div className="space-y-2.5">
                  {sortedTotals.map(row => (
                    <div key={row.key} className="flex justify-between items-center gap-2 text-body-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={row.visible}
                        onChange={(e) => {
                          const newRows = templateDef.totals.rows.map(r => r.key === row.key ? { ...r, visible: e.target.checked } : r);
                          updateNestedConfig('totals', 'rows', newRows);
                        }}
                        className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => {
                          const newRows = templateDef.totals.rows.map(r => r.key === row.key ? { ...r, label: e.target.value } : r);
                          updateNestedConfig('totals', 'rows', newRows);
                        }}
                        className="flex-1 px-2 py-1 bg-surface-container-low border border-outline-variant rounded focus:outline-none"
                        disabled={!row.visible}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BANK DETAILS PANEL */}
            {activePanel === 'bank' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Display Bank Transfer Details</span>
                  <input
                    type="checkbox"
                    checked={templateDef.bank.show}
                    onChange={(e) => updateNestedConfig('bank', 'show', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                {templateDef.bank.show && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Block Heading</label>
                      <input
                        type="text"
                        value={templateDef.bank.heading}
                        onChange={(e) => updateNestedConfig('bank', 'heading', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none font-semibold"
                      />
                    </div>
                    
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase block mt-2">Display Fields</span>
                    <div className="space-y-2">
                      {templateDef.bank.fields.map(f => (
                        <div key={f.key} className="flex justify-between items-center font-semibold text-body-sm">
                          <span className="capitalize">{f.key.replace('bankName', 'Bank').replace('account', 'Account')}</span>
                          <input
                            type="checkbox"
                            checked={f.visible}
                            onChange={(e) => {
                              const newF = templateDef.bank.fields.map(field => field.key === f.key ? { ...field, visible: e.target.checked } : field);
                              updateNestedConfig('bank', 'fields', newF);
                            }}
                            className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* WATERMARK PANEL */}
            {activePanel === 'watermark' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Show Watermark Text</span>
                  <input
                    type="checkbox"
                    checked={templateDef.watermark.enabled}
                    onChange={(e) => updateNestedConfig('watermark', 'enabled', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                {templateDef.watermark.enabled && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Watermark Text</label>
                      <input
                        type="text"
                        value={templateDef.watermark.text}
                        onChange={(e) => updateNestedConfig('watermark', 'text', e.target.value)}
                        placeholder="DRAFT COPY"
                        className="w-full px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Opacity</label>
                      <div className="flex gap-2 items-center font-mono">
                        <input 
                          type="range"
                          min="5"
                          max="50"
                          value={templateDef.watermark.opacity * 100}
                          onChange={(e) => updateNestedConfig('watermark', 'opacity', (Number(e.target.value) || 10) / 100)}
                          className="flex-1 accent-primary h-1 bg-surface-variant rounded appearance-none cursor-pointer"
                        />
                        <span className="text-primary font-bold">{Math.round(templateDef.watermark.opacity * 100)}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FOOTER CONFIG PANEL */}
            {activePanel === 'footer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-body-sm font-semibold">
                  <span>Show Document Footer</span>
                  <input
                    type="checkbox"
                    checked={templateDef.footer.show}
                    onChange={(e) => updateNestedConfig('footer', 'show', e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                  />
                </div>
                {templateDef.footer.show && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Footer Declaration Line</label>
                      <textarea
                        value={templateDef.footer.text}
                        onChange={(e) => updateNestedConfig('footer', 'text', e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none text-[11px]"
                      />
                    </div>
                    <div className="flex items-center justify-between text-body-sm font-semibold">
                      <span>Display Page Numbers</span>
                      <input
                        type="checkbox"
                        checked={templateDef.footer.showPageNumbers}
                        onChange={(e) => updateNestedConfig('footer', 'showPageNumbers', e.target.checked)}
                        className="rounded text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </ContextualInspector>

      </main>
    </MainLayout>
  );
}

// Helpers
function formatCurrency(amount: number, symbol: string): string {
  const sym = symbol === '₹' ? 'Rs. ' : symbol;
  return `${sym}${amount.toFixed(2)}`;
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
