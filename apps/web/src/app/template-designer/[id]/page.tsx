'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '../../../components/shared/MainLayout';
import ContextualInspector from '../../../components/shared/ContextualInspector';
import { api } from '../../../lib/api';
import { TemplateDefinitionDto, DocumentDto, InvoiceData, buildRenderModel } from '@docflow/shared-types';


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

      // Seed default footer layout blocks if undefined
      if (!def.footerBlocks) {
        def.footerBlocks = [
          { key: 'payment', label: 'Payment Instructions', visible: def.payment?.show ?? true, order: 0 },
          { key: 'bank', label: 'Bank Details', visible: def.bank?.show ?? true, order: 1 },
          { key: 'qr', label: 'QR Code', visible: true, order: 2 },
          { key: 'signature', label: 'Signature', visible: def.signature?.show ?? true, order: 3 },
          { key: 'footer', label: 'Footer Declaration', visible: def.footer?.show ?? true, order: 4 },
        ];
      }

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

  // Build shared render model
  const renderModel = (invoiceData && templateDef) ? buildRenderModel(invoiceData, templateDef) : null;

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
              { id: 'footerBlocks', label: 'Footer Layout Blocks', icon: 'reorder' },
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
          <p>THis is the part i adding for checking the pdf</p>
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
              fontFamily: renderModel?.theme.fonts.body.includes('Mono') ? 'monospace' : renderModel?.theme.fonts.body.includes('Serif') ? 'serif' : 'sans-serif',
              fontSize: `${renderModel?.theme.baseFontSize}pt`,
              color: renderModel?.theme.colors.text,
            }}
            className="w-full max-w-[800px] min-h-[960px] bg-white border border-outline-variant shadow-xl rounded-lg relative overflow-hidden flex flex-col select-none text-body-sm font-medium"
          >
            {/* Watermark Visual Overlay */}
            {renderModel?.watermark.enabled && (
              <div
                style={{
                  opacity: renderModel.watermark.opacity,
                  transform: `translate(-50%, -50%) rotate(-${renderModel.watermark.angle}deg)`,
                  color: renderModel.theme.colors.muted,
                }}
                className="absolute left-1/2 top-1/2 font-bold text-[56px] pointer-events-none select-none tracking-wider whitespace-nowrap z-0 font-sans"
              >
                {renderModel.watermark.text}
              </div>
            )}

            {/* Redesigned Document Header */}
            <div className="grid grid-cols-2 gap-8 mb-8 z-10">
              {/* Left Column: Logo + Bill To */}
              <div className="space-y-6">
                {renderModel?.logo.enabled && renderModel.logo.url && (
                  <div className={`flex justify-${renderModel.logo.position === 'right' ? 'end' : renderModel.logo.position === 'center' ? 'center' : 'start'}`}>
                    <img
                      src={renderModel.logo.url}
                      alt="Logo"
                      style={{ maxWidth: `${renderModel.logo.maxWidth}px`, maxHeight: '60px' }}
                      className="object-contain"
                    />
                  </div>
                )}
                {renderModel?.customer.showBillTo && (
                  <div>
                    <h5 style={{ color: renderModel.theme.colors.primary }} className="font-bold text-[10px] uppercase tracking-wider mb-1.5">{renderModel.customer.heading}</h5>
                    <p className="font-bold text-on-surface">{renderModel.customer.name}</p>
                    {renderModel.customer.lines.map((ln, i) => <p key={i} className="text-on-surface-variant/80 text-[11px] leading-snug">{ln}</p>)}
                    {renderModel.customer.fields.map(f => f.value && (
                      <p key={f.key} className="text-on-surface-variant/80 text-[11px] leading-snug">{f.value}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Title + Company Info */}
              <div className="text-right space-y-4">
                {renderModel?.header.showTitle && (
                  <div>
                    <h2
                      style={{ color: renderModel.theme.colors.primary, fontSize: `${renderModel.theme.baseFontSize + 12}pt` }}
                      className="font-bold uppercase tracking-wide"
                    >
                      {renderModel.header.titleText}
                    </h2>
                    {renderModel.header.accentBar && (
                      <div style={{ backgroundColor: renderModel.theme.colors.primary }} className="h-0.5 w-full mt-1"></div>
                    )}
                  </div>
                )}

                {/* Meta details */}
                <div className="text-[11px] leading-relaxed">
                  {renderModel?.metadata.fields.map(f => (
                    <p key={f.key}><strong className="font-semibold text-on-surface">{f.label}:</strong> {f.value}</p>
                  ))}
                </div>

                {/* Company details */}
                <div className="text-[11px] leading-relaxed text-on-surface-variant/90 space-y-0.5">
                  <p className="font-bold text-on-surface text-[12px]">{renderModel?.company.name}</p>
                  {renderModel?.company.lines.map((ln, i) => <p key={i} className="leading-tight">{ln}</p>)}
                  {renderModel?.company.fields.map(f => {
                    const labelMapping: Record<string, string> = {
                      email: 'Email: ',
                      website: 'Website: ',
                      phone: 'Phone: ',
                      taxId: 'GSTIN/VAT: ',
                      cin: 'CIN: ',
                      pan: 'PAN: '
                    };
                    const prefix = labelMapping[f.key] || `${f.label}: `;
                    return f.value && (
                      <p key={f.key}><span className="font-semibold">{prefix}</span>{f.value}</p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Table Line Items */}
            <div className="mb-6 z-10">
              <table className="w-full text-left border-collapse text-[11px] font-semibold">
                <thead>
                  <tr
                    style={{ backgroundColor: renderModel?.theme.colors.tableHeaderBg, color: renderModel?.theme.colors.tableHeaderText }}
                    className="border-b border-outline-variant/60"
                  >
                    {renderModel?.table.columns.map(col => (
                      <th
                        key={col.key}
                        style={{ width: `${col.width}%`, textAlign: col.align }}
                        className="p-2"
                      >
                        {col.label.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-on-surface">
                  {renderModel?.table.rows.map((row, rIdx) => (
                    <tr
                      key={row.index}
                      style={{ backgroundColor: renderModel.table.zebra && rIdx % 2 === 1 ? renderModel.theme.colors.zebraBg : 'transparent' }}
                    >
                      {renderModel.table.columns.map(col => (
                        <td
                          key={col.key}
                          style={{ textAlign: col.align }}
                          className="p-2.5 align-middle"
                        >
                          {row.cells[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes bottom grid */}
            <div className="grid grid-cols-12 gap-6 mt-4 mb-6 z-10">
              <div className="col-span-7">
                {renderModel?.notes.show && renderModel.notes.text && (
                  <div>
                    <h6 style={{ color: renderModel.theme.colors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{renderModel.notes.heading}</h6>
                    <p className="text-[10px] text-on-surface-variant/80 whitespace-pre-line leading-relaxed">{renderModel.notes.text}</p>
                  </div>
                )}
              </div>
              <div className="col-span-5 space-y-1.5 text-[11px] leading-relaxed">
                {renderModel?.totals.rows.map(row => (
                  <div
                    key={row.key}
                    style={{ color: row.emphasis ? renderModel.theme.colors.primary : renderModel.theme.colors.text }}
                    className={`flex justify-between ${row.emphasis ? 'font-bold text-[12px] border-t border-outline-variant/60 pt-1.5 mt-1.5' : ''}`}
                  >
                    <span>{row.label}:</span>
                    <span>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Movable Footer Blocks */}
            <div className="mt-auto space-y-6 z-10">
              {renderModel?.footerBlocks.map(block => {
                if (block.key === 'payment' && block.data.show && block.data.instructions) {
                  return (
                    <div key={block.key} className="border-t border-outline-variant/40 pt-4 text-[10px] leading-relaxed">
                      <h6 style={{ color: renderModel.theme.colors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{block.data.heading}</h6>
                      <p className="text-on-surface-variant/80">{block.data.instructions}</p>
                    </div>
                  );
                }

                if (block.key === 'bank' && block.data.show && block.data.fields && block.data.fields.length > 0) {
                  return (
                    <div key={block.key} className="border-t border-outline-variant/40 pt-4 text-[10px] leading-relaxed">
                      <h6 style={{ color: renderModel.theme.colors.primary }} className="font-bold text-[9px] uppercase tracking-wider mb-1">{block.data.heading}</h6>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {block.data.fields.map((f: any) => (
                          <p key={f.key} className="text-on-surface-variant/80">
                            <strong className="font-semibold text-on-surface">{f.label}:</strong> {f.value}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (block.key === 'qr' && block.data.show && block.data.url) {
                  return (
                    <div key={block.key} className="pt-2">
                      <img
                        src={block.data.url}
                        alt="QR Code"
                        className="w-20 h-20 object-contain border border-outline-variant rounded p-1"
                      />
                    </div>
                  );
                }

                if (block.key === 'signature' && block.data.show) {
                  return (
                    <div key={block.key} className="pt-6 text-right text-[10px]">
                      {block.data.signatureUrl ? (
                        <div className="inline-block text-center space-y-1">
                          <img
                            src={block.data.signatureUrl}
                            alt="Signature"
                            className="h-10 object-contain mx-auto"
                          />
                          {block.data.stampUrl && block.data.showStamp && (
                            <div className="relative inline-block">
                              <img
                                src={block.data.stampUrl}
                                alt="Stamp"
                                className="h-10 object-contain mx-auto absolute -top-12 -left-12 opacity-80"
                              />
                            </div>
                          )}
                          <div className="border-t border-outline-variant w-40 inline-block"></div>
                          <p className="font-bold text-on-surface mt-1 pr-6">{block.data.label}</p>
                        </div>
                      ) : (
                        <div className="inline-block">
                          {block.data.stampUrl && block.data.showStamp && (
                            <div className="relative inline-block">
                              <img
                                src={block.data.stampUrl}
                                alt="Stamp"
                                className="h-10 object-contain mx-auto absolute -top-12 -left-12 opacity-80"
                              />
                            </div>
                          )}
                          <div className="border-t border-outline-variant w-40 inline-block"></div>
                          <p className="font-bold text-on-surface mt-1 pr-6">{block.data.label}</p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (block.key === 'footer' && block.data.show) {
                  return (
                    <div key={block.key} className="pt-2 border-t border-outline-variant/30 text-[9px] text-on-surface-variant/70 text-center flex justify-between">
                      <span>{block.data.text}</span>
                      {block.data.showPageNumbers && <span>Page 1 of 1</span>}
                    </div>
                  );
                }

                return null;
              })}
            </div>
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
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                      Page Layout
                    </span>
                    <button
                      onClick={() => {
                        updateNestedConfig('page', 'size', 'A4');
                        updateNestedConfig('page', 'orientation', 'portrait');
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Page
                    </button>
                  </div>
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
                </div>

                {/* Margins Card */}
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">margin</span>
                      Margin Spacing (pt)
                    </span>
                    <button
                      onClick={() => {
                        updateNestedConfig('page', 'margins', { top: 36, right: 36, bottom: 36, left: 36 });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Margins
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {['top', 'right', 'bottom', 'left'].map(side => (
                      <div key={side} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[11px] font-semibold text-on-surface-variant">
                          <span className="capitalize">{side}</span>
                        </div>
                        <div className="flex items-center gap-3">
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
                            className="flex-1 accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="10"
                            max="80"
                            value={(templateDef.page.margins as any)[side]}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 10;
                              val = Math.max(10, Math.min(80, val));
                              updateNestedConfig('page', 'margins', {
                                ...templateDef.page.margins,
                                [side]: val,
                              });
                            }}
                            className="w-14 h-7 px-1.5 border border-outline-variant rounded bg-surface-container-low text-center text-body-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* THEME CONFIG PANEL */}
            {activePanel === 'theme' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">palette</span>
                      Theme Color Accent
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          theme: {
                            ...templateDef.theme,
                            colors: {
                              ...templateDef.theme.colors,
                              primary: '#3525CD',
                              tableHeaderBg: '#3525CD15',
                              tableHeaderText: '#3525CD',
                              zebraBg: '#3525CD05',
                            },
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Color
                    </button>
                  </div>
                  <div className="flex gap-2.5 flex-wrap">
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
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer hover:scale-105
                          ${themeColors.primary === color ? 'border-on-surface scale-110 shadow-xs' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">text_fields</span>
                      Typography Preset
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          theme: {
                            ...templateDef.theme,
                            fonts: {
                              heading: 'Helvetica-Bold',
                              body: 'Helvetica',
                              mono: 'Courier',
                            },
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Font
                    </button>
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
                </div>

                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">text_fields</span>
                      Base Font Size (pt)
                    </span>
                    <button
                      onClick={() => updateNestedConfig('theme', 'baseFontSize', 10)}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Size
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="8"
                      max="16"
                      value={templateDef.theme.baseFontSize}
                      onChange={(e) => updateNestedConfig('theme', 'baseFontSize', Number(e.target.value) || 10)}
                      className="flex-1 accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min="8"
                      max="16"
                      value={templateDef.theme.baseFontSize}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (isNaN(val)) val = 8;
                        val = Math.max(8, Math.min(16, val));
                        updateNestedConfig('theme', 'baseFontSize', val);
                      }}
                      className="w-14 h-7 px-1.5 border border-outline-variant rounded bg-surface-container-low text-center text-body-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LOGO CONFIG PANEL */}
            {activePanel === 'logo' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">image</span>
                      Branding Logo
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          logo: {
                            enabled: true,
                            position: 'left',
                            maxWidth: 120,
                            maxHeight: 50,
                            source: 'branding',
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Logo
                    </button>
                  </div>
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
              </div>
            )}

            {/* HEADER CONFIG PANEL */}
            {activePanel === 'header' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">top_panel_open</span>
                      Document Header
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          header: {
                            showTitle: true,
                            titleText: '{document.type}',
                            showDocMeta: true,
                            accentBar: true,
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Header
                    </button>
                  </div>
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
              </div>
            )}

            {/* TABLE COLUMNS CONFIG PANEL */}
            {activePanel === 'table' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">table_chart</span>
                      Line Items Options
                    </span>
                  </div>
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
                </div>

                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">view_week</span>
                      Columns Configurations
                    </span>
                    <button
                      onClick={() => {
                        const newKey = `col_${Date.now()}`;
                        const newCol = {
                          key: newKey,
                          label: 'New Column',
                          visible: true,
                          width: 15,
                          align: 'left',
                          order: templateDef.table.columns.length
                        };
                        const newCols = [...templateDef.table.columns, newCol];
                        updateNestedConfig('table', 'columns', newCols);
                      }}
                      className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      <span className="material-symbols-outlined text-[12px]">add</span> Add
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {sortedColumns.map((col, idx) => (
                      <div key={col.key} className="border border-outline-variant/50 rounded-lg p-2.5 space-y-2 bg-surface-container-lowest shadow-xs text-[11px] font-semibold">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={col.visible}
                              onChange={(e) => {
                                const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, visible: e.target.checked } : c);
                                updateNestedConfig('table', 'columns', newCols);
                              }}
                              className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                            />
                            <span className="font-bold text-on-surface truncate max-w-[100px]">{col.label || col.key}</span>
                          </div>

                          <div className="flex items-center gap-0.5">
                            {/* Move Up */}
                            <button
                              disabled={idx === 0}
                              onClick={() => {
                                const prev = sortedColumns[idx - 1];
                                if (!prev) return;
                                const newCols = templateDef.table.columns.map(c => {
                                  if (c.key === col.key) return { ...c, order: prev.order };
                                  if (c.key === prev.key) return { ...c, order: col.order };
                                  return c;
                                });
                                updateNestedConfig('table', 'columns', newCols);
                              }}
                              className="text-on-surface-variant hover:text-primary disabled:opacity-30 cursor-pointer bg-transparent border-none"
                              title="Move Column Left"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                            </button>
                            {/* Move Down */}
                            <button
                              disabled={idx === sortedColumns.length - 1}
                              onClick={() => {
                                const next = sortedColumns[idx + 1];
                                if (!next) return;
                                const newCols = templateDef.table.columns.map(c => {
                                  if (c.key === col.key) return { ...c, order: next.order };
                                  if (c.key === next.key) return { ...c, order: col.order };
                                  return c;
                                });
                                updateNestedConfig('table', 'columns', newCols);
                              }}
                              className="text-on-surface-variant hover:text-primary disabled:opacity-30 cursor-pointer bg-transparent border-none"
                              title="Move Column Right"
                            >
                              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                            </button>
                            <button
                              onClick={() => {
                                const newCols = templateDef.table.columns.filter(c => c.key !== col.key);
                                updateNestedConfig('table', 'columns', newCols);
                              }}
                              className="text-on-surface-variant hover:text-error cursor-pointer bg-transparent border-none"
                              title="Delete Column"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          </div>
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
                                    const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, label: e.target.value } : c);
                                    updateNestedConfig('table', 'columns', newCols);
                                  }}
                                  className="px-1.5 py-0.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] text-on-surface-variant uppercase font-bold">Align</span>
                                <select
                                  value={col.align || 'left'}
                                  onChange={(e) => {
                                    const newCols = templateDef.table.columns.map(c => c.key === col.key ? { ...c, align: e.target.value } : c);
                                    updateNestedConfig('table', 'columns', newCols);
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
              </div>
            )}

            {/* TOTALS CONFIG PANEL */}
            {activePanel === 'totals' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">price_check</span>
                      Totals Layout Rows
                    </span>
                  </div>
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
              </div>
            )}

            {/* BANK DETAILS PANEL */}
            {activePanel === 'bank' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                      Bank Transfer Details
                    </span>
                  </div>
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
              </div>
            )}

            {/* WATERMARK PANEL */}
            {activePanel === 'watermark' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">approval</span>
                      Watermark Stamp
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          watermark: {
                            enabled: false,
                            text: 'DRAFT COPY',
                            opacity: 0.15,
                            angle: 45,
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Watermark
                    </button>
                  </div>
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

                      {/* Opacity with synced inputs */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-bold uppercase">
                          <span>Opacity (%)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="5"
                            max="50"
                            value={Math.round(templateDef.watermark.opacity * 100)}
                            onChange={(e) => updateNestedConfig('watermark', 'opacity', (Number(e.target.value) || 10) / 100)}
                            className="flex-1 accent-primary h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer"
                          />
                          <input
                            type="number"
                            min="5"
                            max="50"
                            value={Math.round(templateDef.watermark.opacity * 100)}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 5;
                              val = Math.max(5, Math.min(50, val));
                              updateNestedConfig('watermark', 'opacity', val / 100);
                            }}
                            className="w-14 h-7 px-1.5 border border-outline-variant rounded bg-surface-container-low text-center text-body-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FOOTER CONFIG PANEL */}
            {activePanel === 'footer' && (
              <div className="space-y-4">
                <div className="bg-surface border border-outline-variant rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                    <span className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">subtitles</span>
                      Footer Details
                    </span>
                    <button
                      onClick={() => {
                        setTemplateDef({
                          ...templateDef,
                          footer: {
                            show: true,
                            text: 'Granth Infotech Private Limited — Services & Software Delivery Division',
                            showPageNumbers: true,
                          },
                        });
                      }}
                      className="text-[10px] text-primary hover:text-primary-fixed-variant font-bold uppercase transition-colors"
                    >
                      Reset Footer
                    </button>
                  </div>
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
                          className="w-full p-2 bg-surface-container-low border border-outline-variant rounded text-body-sm text-on-surface focus:outline-none font-semibold text-[11px]"
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
              </div>
            )}

          </div>
        </ContextualInspector>

      </main>
    </MainLayout>
  );
}
