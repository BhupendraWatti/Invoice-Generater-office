'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { CompanyDto, CustomerDto, DocumentDto, TemplateDto } from '@docflow/shared-types';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch search directories on open
  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [cList, custList, dList, tList] = await Promise.all([
          api.companies.list(),
          api.customers.list(),
          api.documents.list({ limit: 20 }),
          api.templates.list(),
        ]);
        setCompanies(cList);
        setCustomers(custList);
        setDocuments(dList);
        setTemplates(tList);
      } catch (err) {
        console.error('Failed to load search data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open]);

  // Global Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const filteredNav = [
    { name: 'Workspace Home', path: '/', icon: 'home', category: 'Pages' },
    { name: 'Company Master Directory', path: '/companies', icon: 'corporate_fare', category: 'Pages' },
    { name: 'Customer Directory', path: '/customers', icon: 'groups', category: 'Pages' },
    { name: 'Workspace Settings & Profile', path: '/settings', icon: 'settings', category: 'Pages' },
    { name: 'Template Library Designer', path: '/templates', icon: 'grid_view', category: 'Pages' },
  ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    (c.city && c.city.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(query.toLowerCase()) || 
    cust.email.toLowerCase().includes(query.toLowerCase())
  );

  const filteredDocuments = documents.filter(d => 
    d.title.toLowerCase().includes(query.toLowerCase()) || 
    d.type.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTemplates = templates.filter(temp => 
    temp.name.toLowerCase().includes(query.toLowerCase()) || 
    temp.category.toLowerCase().includes(query.toLowerCase())
  );

  const hasResults = 
    filteredNav.length > 0 || 
    filteredCompanies.length > 0 || 
    filteredCustomers.length > 0 || 
    filteredDocuments.length > 0 || 
    filteredTemplates.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity duration-200" />
        <Dialog.Content 
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[500px]"
        >
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-outline-variant p-3 relative bg-surface-container-lowest shrink-0">
            <span className="material-symbols-outlined text-on-surface-variant mr-3 text-[20px]">
              search
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents, templates, companies, clients, pages..."
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-body-md text-on-surface placeholder-on-surface-variant/60"
              type="text"
            />
            <Dialog.Close className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </Dialog.Close>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {loading && query === '' ? (
              <div className="py-8 text-center text-body-sm text-on-surface-variant">
                Loading index data...
              </div>
            ) : !hasResults ? (
              <div className="py-8 text-center text-body-sm text-on-surface-variant italic">
                No matching results found
              </div>
            ) : (
              <>
                {/* Pages */}
                {filteredNav.length > 0 && (
                  <div>
                    <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant px-2 mb-1 text-[10px]">
                      Navigation
                    </h3>
                    <div className="space-y-0.5">
                      {filteredNav.map((item) => (
                        <div
                          key={item.path}
                          onClick={() => handleSelect(item.path)}
                          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm text-on-surface group"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">
                            {item.icon}
                          </span>
                          <span className="font-medium group-hover:text-primary transition-colors">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates */}
                {filteredTemplates.length > 0 && (
                  <div>
                    <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant px-2 mb-1 text-[10px]">
                      Templates
                    </h3>
                    <div className="space-y-0.5">
                      {filteredTemplates.map((temp) => (
                        <div
                          key={temp.id}
                          onClick={() => handleSelect('/templates')}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm text-on-surface group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span 
                              className="material-symbols-outlined text-[18px] shrink-0"
                              style={{ color: temp.accentColor }}
                            >
                              grid_view
                            </span>
                            <span className="font-semibold truncate group-hover:text-primary transition-colors">{temp.name}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded shrink-0">
                            {temp.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {filteredDocuments.length > 0 && (
                  <div>
                    <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant px-2 mb-1 text-[10px]">
                      Recent Documents
                    </h3>
                    <div className="space-y-0.5">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleSelect(`/documents/${doc.id}`)}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm text-on-surface group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="material-symbols-outlined text-[18px] text-error shrink-0">
                              description
                            </span>
                            <span className="font-semibold truncate group-hover:text-primary transition-colors">{doc.title}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded shrink-0">
                            {doc.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Companies */}
                {filteredCompanies.length > 0 && (
                  <div>
                    <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant px-2 mb-1 text-[10px]">
                      Companies
                    </h3>
                    <div className="space-y-0.5">
                      {filteredCompanies.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelect('/companies')}
                          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm text-on-surface group"
                        >
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            corporate_fare
                          </span>
                          <div>
                            <div className="font-semibold group-hover:text-primary transition-colors">{c.name}</div>
                            {c.city && <div className="text-[11px] text-on-surface-variant">{c.city}, {c.country}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers */}
                {filteredCustomers.length > 0 && (
                  <div>
                    <h3 className="text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant px-2 mb-1 text-[10px]">
                      Clients
                    </h3>
                    <div className="space-y-0.5">
                      {filteredCustomers.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => handleSelect('/customers')}
                          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer text-body-sm text-on-surface group"
                        >
                          <span className="material-symbols-outlined text-[18px] text-tertiary">
                            account_box
                          </span>
                          <div>
                            <div className="font-semibold group-hover:text-primary transition-colors">{cust.name}</div>
                            <div className="text-[11px] text-on-surface-variant">{cust.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Footer Shortcuts */}
          <div className="border-t border-outline-variant p-2.5 bg-surface-container-low flex justify-between items-center text-[11px] text-on-surface-variant/80 shrink-0 select-none">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              Press <kbd className="font-bold border px-1 py-0.2 bg-surface rounded">Enter</kbd> to select
            </span>
            <span className="flex items-center gap-1">
              Press <kbd className="font-bold border px-1 py-0.2 bg-surface rounded">Esc</kbd> to close
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
