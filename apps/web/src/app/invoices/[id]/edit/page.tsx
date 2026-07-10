'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { DocumentDto, UserDto, CompanyDto, CustomerDto } from '@docflow/shared-types';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  qty: number;
}

export default function InvoiceDesignerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  
  const [doc, setDoc] = useState<(DocumentDto & { company?: CompanyDto; customer?: CustomerDto; author: UserDto }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Editor Form State
  const [clientName, setClientName] = useState('Acme Corporation');
  const [clientEmail, setClientEmail] = useState('billing@acmecorp.com');
  const [clientAddress, setClientAddress] = useState('123 Innovation Drive, Suite 400\nTech City, CA 94016');
  const [issueDate, setIssueDate] = useState('2023-10-24');
  const [dueDate, setDueDate] = useState('2023-11-23');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  
  // Spreadsheet Line Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'UX/UI Design Phase 1', rate: 150, qty: 20 },
    { id: '2', description: 'Design System Setup', rate: 150, qty: 5 },
    { id: '3', description: 'Asset Export & Handoff', rate: 120, qty: 5 },
  ]);

  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      try {
        const data = await api.documents.get(id);
        if (data.type !== 'INVOICE') {
          router.push(`/documents/${id}`);
          return;
        }
        setDoc(data);
        if (data.customer) {
          setClientName(data.customer.name);
          setClientEmail(data.customer.email);
          setClientAddress(`${data.customer.addressLine1 || ''}\n${data.customer.city || ''}, ${data.customer.country || ''}`);
        }
      } catch (err: any) {
        setError(err.message || 'Invoice record not found.');
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [id, router]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: String(Date.now()),
      description: 'New Services Item',
      rate: 100,
      qty: 1,
    };
    setItems([...items, newItem]);
    triggerToast('Line item appended.');
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      triggerToast('Invoice requires at least one line item.');
      return;
    }
    setItems(items.filter((item) => item.id !== itemId));
    triggerToast('Line item removed.');
  };

  const handleUpdateItem = (itemId: string, field: keyof InvoiceItem, val: any) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            [field]: field === 'description' ? val : Number(val) || 0,
          };
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.rate * item.qty, 0);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Serialize items into blocks representation for document database persistence
      const blocks = items.map((item, idx) => ({
        sortOrder: idx,
        blockType: 'LINE_ITEM',
        content: JSON.stringify(item),
      }));
      await api.documents.updateBlocks(id, blocks);
      triggerToast('Invoice draft saved successfully.');
    } catch (err) {
      console.error(err);
      triggerToast('Failed to save document draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoice = async () => {
    try {
      await api.documents.updateStatus(id, 'COMPLETED');
      triggerToast('Invoice sent to client!');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      triggerToast('Failed to send invoice.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background select-none">
        <div className="text-body-md text-on-surface-variant animate-pulse">Loading Invoice Designer...</div>
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

  const subtotal = calculateSubtotal();
  const tax = 0; // 0% default
  const total = subtotal + tax;

  return (
    <div className="flex h-screen overflow-hidden bg-background select-none">
      {/* Toast popup */}
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

      {/* Main container */}
      <div className="flex-1 flex flex-col ml-[64px] min-w-0 h-full">
        {/* Toolbar Header */}
        <header className="h-14 border-b border-outline-variant flex items-center justify-between px-6 bg-surface z-10 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Invoice #{doc.title.split(' ')[0] || 'INV-2023-089'}
            </h1>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-[10px] uppercase tracking-wider font-bold">
              {doc.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSaveDraft}
              disabled={saving}
              className="h-8 px-3 rounded border border-outline-variant text-on-surface bg-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md flex items-center gap-1.5 font-semibold active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              onClick={handleSendInvoice}
              className="h-8 px-4 rounded bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-label-md text-label-md flex items-center gap-1.5 font-semibold shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Send Invoice
            </button>
          </div>
        </header>

        {/* 3-Pane Layout Canvas */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Pane Form Editor */}
          <aside className="w-[340px] border-r border-outline-variant bg-surface flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center gap-2 h-12">
              <span className="material-symbols-outlined text-primary text-[18px]">edit_document</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Invoice Editor</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              <section className="space-y-3">
                <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Client Contact</h3>
                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant">Client Name</label>
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant">Email Address</label>
                  <input 
                    type="email" 
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant">Billing Address</label>
                  <textarea 
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full p-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                  />
                </div>
              </section>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              <section className="space-y-3">
                <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Metadata</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block font-label-sm text-[10px] text-on-surface-variant">Issue Date</label>
                    <input 
                      type="date" 
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface-variant"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-label-sm text-[10px] text-on-surface-variant">Due Date</label>
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface-variant"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant">Payment Terms</label>
                  <select 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </section>

            </div>
          </aside>

          {/* Center Pane: Live Invoice Canvas */}
          <section className="flex-1 bg-surface-container-low overflow-y-auto relative flex justify-center p-6 custom-scrollbar">
            <div className="w-[800px] min-h-[950px] bg-surface-container-lowest shadow-md border border-outline-variant rounded-sm p-12 flex flex-col relative group h-fit">
              
              {/* Document Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="w-16 h-16 bg-surface-container rounded flex items-center justify-center mb-4 text-outline select-none">
                    <span className="material-symbols-outlined text-[32px]">domain</span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">DocFlow Studio</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-snug">
                    456 Design Blvd, Suite A<br />Creative District, NY 10001<br />hello@docflow.studio
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="font-display-sm text-display-sm text-primary font-bold uppercase tracking-widest mb-4">Invoice</h1>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-left inline-grid text-body-sm">
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-bold uppercase">Invoice No:</span>
                    <span className="font-body-sm text-on-surface font-semibold text-right">{doc.title.split(' ')[0] || 'INV-2023-089'}</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-bold uppercase">Issue Date:</span>
                    <span className="font-body-sm text-on-surface font-semibold text-right">{issueDate}</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-bold uppercase">Amount Due:</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold text-right">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Billed To Card */}
              <div className="mb-10 p-5 bg-surface-container/50 rounded-lg border border-outline-variant border-dashed">
                <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1.5">Billed To</h3>
                <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">{clientName}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug whitespace-pre-line">{clientAddress}</p>
                <p className="font-body-sm text-[11px] text-on-surface-variant/80 font-mono mt-1">{clientEmail}</p>
              </div>

              {/* Line Items Table */}
              <div className="mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-on-surface-variant text-[11px]">
                      <th className="py-2.5 px-2 font-label-md text-on-surface-variant uppercase tracking-wider w-[50%]">Description</th>
                      <th className="py-2.5 px-2 font-label-md text-on-surface-variant uppercase tracking-wider text-right w-[15%]">Rate</th>
                      <th className="py-2.5 px-2 font-label-md text-on-surface-variant uppercase tracking-wider text-right w-[12%]">Qty</th>
                      <th className="py-2.5 px-2 font-label-md text-on-surface-variant uppercase tracking-wider text-right w-[18%]">Amount</th>
                      <th className="py-2.5 px-2 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors group/row">
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                            className="bg-transparent border-none outline-none font-medium text-on-surface focus:bg-surface focus:ring-1 focus:ring-primary w-full p-1 rounded"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <input 
                            type="number" 
                            value={item.rate}
                            onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value)}
                            className="bg-transparent border-none outline-none text-right text-on-surface-variant focus:bg-surface focus:ring-1 focus:ring-primary w-20 p-1 rounded font-mono"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <input 
                            type="number" 
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(item.id, 'qty', e.target.value)}
                            className="bg-transparent border-none outline-none text-right text-on-surface-variant focus:bg-surface focus:ring-1 focus:ring-primary w-12 p-1 rounded font-mono"
                          />
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-on-surface font-mono">
                          ${(item.rate * item.qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover/row:opacity-100 p-0.5 rounded hover:bg-surface-container"
                            title="Remove Row"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add Item trigger */}
                <button 
                  onClick={handleAddItem}
                  className="mt-4 flex items-center gap-1.5 font-label-md text-label-md text-primary hover:text-primary-fixed-variant transition-colors font-semibold select-none cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span> 
                  Add Line Item
                </button>
              </div>

              {/* Invoice Totals */}
              <div className="flex justify-end mb-10 mt-auto">
                <div className="w-1/2 select-none">
                  <div className="flex justify-between py-2 border-b border-outline-variant font-body-sm text-body-sm">
                    <span className="text-on-surface-variant font-medium">Subtotal</span>
                    <span className="text-on-surface font-semibold font-mono">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-outline-variant font-body-sm text-body-sm">
                    <span className="text-on-surface-variant font-medium">Tax (0%)</span>
                    <span className="text-on-surface font-semibold font-mono">$0.00</span>
                  </div>
                  <div className="flex justify-between py-4 font-headline-sm text-headline-sm text-on-surface">
                    <span className="font-bold">Total Due</span>
                    <span className="font-bold text-primary font-mono">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Notes terms */}
              <div className="pt-6 border-t border-outline-variant select-none">
                <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Notes &amp; Terms</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Please remit payment within 30 days of the invoice date. Late payments may be subject to a 1.5% monthly fee. Thank you for your business!
                </p>
              </div>

            </div>
          </section>

          {/* Right Pane Preview and exports */}
          <aside className="w-[320px] border-l border-outline-variant bg-surface flex flex-col h-full shrink-0 select-none">
            <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between h-12">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">visibility</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Preview Details</h2>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface-variant font-mono">100% Zoom</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-container-lowest">
              
              {/* Miniature Layout */}
              <div className="w-full aspect-[1/1.3] bg-surface-container border border-outline-variant rounded flex items-center justify-center relative overflow-hidden shadow-sm">
                <div className="w-[80%] h-[90%] bg-surface-container-lowest border border-outline-variant opacity-70 p-4 flex flex-col gap-2">
                  <div className="w-1/3 h-2 bg-outline-variant rounded"></div>
                  <div className="w-1/2 h-2 bg-outline-variant rounded mb-4"></div>
                  <div className="w-full h-1 bg-surface-variant"></div>
                  <div className="w-full h-1 bg-surface-variant"></div>
                  <div className="w-4/5 h-1 bg-surface-variant"></div>
                  <div className="w-1/2 h-3 bg-outline-variant rounded mt-auto self-end"></div>
                </div>
              </div>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              <div className="space-y-2">
                <h3 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-2">Export Options</h3>
                <button 
                  onClick={() => triggerToast('Compiling and downloading PDF asset...')}
                  className="w-full h-8 rounded border border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> 
                  Download PDF
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    triggerToast('Link copied to clipboard!');
                  }}
                  className="w-full h-8 rounded border border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span> 
                  Copy Link
                </button>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
