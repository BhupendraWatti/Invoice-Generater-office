'use client';

import React, { useState, useEffect } from 'react';
import SidebarRail from './SidebarRail';
import TopHeader from './TopHeader';
import GlobalSearch from './GlobalSearch';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '../../lib/api';
import { CompanyDto, CustomerDto } from '@docflow/shared-types';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  
  // Document creation form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('PROPOSAL');
  const [companyId, setCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { user } = useAuth();

  // Load companies and customers for selection dropdown
  useEffect(() => {
    if (!newDocOpen) return;
    const loadData = async () => {
      try {
        const [compList, custList] = await Promise.all([
          api.companies.list(),
          api.customers.list(),
        ]);
        setCompanies(compList);
        setCustomers(custList);
        if (compList.length > 0) setCompanyId(compList[0].id);
        if (custList.length > 0) setCustomerId(custList[0].id);
      } catch (err) {
        console.error('Failed to load companies/customers:', err);
      }
    };
    loadData();
  }, [newDocOpen]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const doc = await api.documents.create({
        title,
        type,
        companyId: companyId || undefined,
        customerId: customerId || undefined,
      });

      // Clear state and close
      setTitle('');
      setNewDocOpen(false);

      // Redirect to the universal Document Editor Studio
      router.push(`/documents/${doc.id}/edit`);
    } catch (err: any) {
      setError(err.message || 'Failed to create document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans antialiased">
      {/* Sidebar Rail Navigation */}
      <SidebarRail />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-[64px] min-w-0 h-full relative">
        {/* Sticky Top Header */}
        <TopHeader
          onSearchClick={() => setSearchOpen(true)}
          onNewDocumentClick={() => setNewDocOpen(true)}
        />

        {/* Central Workspace Content */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </div>

      {/* Global Command Search Overlay */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* New Document Creation Modal */}
      <Dialog.Root open={newDocOpen} onOpenChange={setNewDocOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-md bg-surface border border-outline-variant rounded-xl shadow-xl z-50 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
              <Dialog.Title className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Create New Document
              </Dialog.Title>
              <Dialog.Close className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Dialog.Close>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container text-body-sm p-3 rounded border border-error/20">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateDocument} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Financial Proposal"
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface"
                >
                  <option value="PROPOSAL">Proposal (Interactive Editor)</option>
                  <option value="INVOICE">Invoice (Financial Calculator)</option>
                  <option value="QUOTATION">Quotation (Pricing Estimate)</option>
                  <option value="RECEIPT">Receipt (Payment Proof)</option>
                  <option value="PURCHASE_ORDER">Purchase Order (PO)</option>
                  <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                  <option value="AGREEMENT">Agreement / Contract</option>
                  <option value="SPREADSHEET">Spreadsheet (Grid View)</option>
                  <option value="PDF">PDF (Static File Upload)</option>
                  <option value="DOCX">Microsoft Word (Docx)</option>
                  <option value="ZIP">Archive Asset (ZIP)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Link to Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface"
                >
                  <option value="">No Company Link</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-medium">Link to Client</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface"
                >
                  <option value="">No Client Link</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} ({cust.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary font-semibold py-2 rounded hover:bg-primary-fixed-variant transition-colors text-body-sm mt-2 disabled:bg-primary/50"
              >
                {loading ? 'Generating draft...' : 'Create Draft'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
