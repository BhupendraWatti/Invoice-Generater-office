'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import ContextualInspector from '../../components/shared/ContextualInspector';
import { api } from '../../lib/api';
import { CustomerDto, CompanyDto, DocumentDto, AddressDto, ContactDto, BankAccountDto } from '@docflow/shared-types';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

interface CustomFieldEntry {
  key: string;
  value: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
  const [linkedDocuments, setLinkedDocuments] = useState<DocumentDto[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ADDRESS' | 'BANKING' | 'CONTACTS' | 'CUSTOM'>('ADDRESS');

  // Form Drawer Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [companyId, setCompanyId] = useState('');

  // Child lists in Form Editor
  const [addresses, setAddresses] = useState<Partial<AddressDto>[]>([
    { type: 'BILLING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: true }
  ]);
  const [contacts, setContacts] = useState<Partial<ContactDto>[]>([
    { firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', isDefault: true }
  ]);
  const [bankAccounts, setBankAccounts] = useState<Partial<BankAccountDto>[]>([
    { bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: true }
  ]);
  const [customFields, setCustomFields] = useState<CustomFieldEntry[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, compList] = await Promise.all([
        api.customers.list(),
        api.companies.list(),
      ]);
      setCustomers(custList);
      setCompanies(compList);
      if (compList.length > 0) setCompanyId(compList[0].id);
      if (custList.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custList[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch detail info and documents when selection changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerDetail(null);
      setLinkedDocuments([]);
      return;
    }

    const fetchDetails = async () => {
      setDetailLoading(true);
      try {
        const [detail, docs] = await Promise.all([
          api.customers.get(selectedCustomerId),
          api.documents.list({ customerId: selectedCustomerId }),
        ]);
        setSelectedCustomerDetail(detail);
        setLinkedDocuments(docs);
      } catch (err) {
        console.error('Failed to load customer details:', err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetails();
  }, [selectedCustomerId]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setError('');
    setName('');
    setEmail('');
    setPhone('');
    setStatus('ACTIVE');
    if (companies.length > 0) setCompanyId(companies[0].id);
    setAddresses([{ type: 'BILLING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: true }]);
    setContacts([{ firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', isDefault: true }]);
    setBankAccounts([{ bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: true }]);
    setCustomFields([]);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setIsEditing(true);
    setError('');
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone || '');
    setStatus(c.status);
    setCompanyId(c.companyId);

    // Map nested fields if present, else fallback
    setAddresses(c.addresses?.length ? c.addresses : [{ type: 'BILLING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: true }]);
    setContacts(c.contacts?.length ? c.contacts : [{ firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', isDefault: true }]);
    setBankAccounts(c.bankAccounts?.length ? c.bankAccounts : [{ bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: true }]);

    // Map JSON custom fields
    if (c.customFields) {
      const mapped = Object.entries(c.customFields).map(([k, v]) => ({ key: k, value: String(v) }));
      setCustomFields(mapped);
    } else {
      setCustomFields([]);
    }

    setDrawerOpen(true);
  };

  // Form List Modifiers
  const addAddressField = () => {
    setAddresses([...addresses, { type: 'SHIPPING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: false }]);
  };
  const removeAddressField = (idx: number) => {
    setAddresses(addresses.filter((_, i) => i !== idx));
  };
  const updateAddressField = (idx: number, field: keyof AddressDto, val: any) => {
    setAddresses(addresses.map((addr, i) => i === idx ? { ...addr, [field]: val } : addr));
  };

  const addContactField = () => {
    setContacts([...contacts, { firstName: '', lastName: '', email: '', phone: '', role: 'BILLING', isDefault: false }]);
  };
  const removeContactField = (idx: number) => {
    setContacts(contacts.filter((_, i) => i !== idx));
  };
  const updateContactField = (idx: number, field: keyof ContactDto, val: any) => {
    setContacts(contacts.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  };

  const addBankField = () => {
    setBankAccounts([...bankAccounts, { bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: false }]);
  };
  const removeBankField = (idx: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== idx));
  };
  const updateBankField = (idx: number, field: keyof BankAccountDto, val: any) => {
    setBankAccounts(bankAccounts.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: 'Custom Field', value: 'Value' }]);
  };
  const removeCustomField = (idx: number) => {
    setCustomFields(customFields.filter((_, i) => i !== idx));
  };
  const updateCustomField = (idx: number, field: keyof CustomFieldEntry, val: string) => {
    setCustomFields(customFields.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !companyId) {
      setError('Please fill in all required fields.');
      return;
    }

    setFormLoading(true);
    setError('');

    // Serialize custom fields
    const customFieldsObj: Record<string, string> = {};
    customFields.forEach(entry => {
      if (entry.key.trim()) {
        customFieldsObj[entry.key.trim()] = entry.value;
      }
    });

    const validAddresses = addresses.filter(addr => addr.line1?.trim() && addr.city?.trim() && addr.country?.trim());

    const payload = {
      companyId,
      name,
      email,
      phone: phone || undefined,
      // Fallback baseline fields to first address to satisfy existing db schema validation parameters
      addressLine1: validAddresses[0]?.line1 || undefined,
      addressLine2: validAddresses[0]?.line2 || undefined,
      city: validAddresses[0]?.city || undefined,
      postalCode: validAddresses[0]?.postalCode || undefined,
      country: validAddresses[0]?.country || undefined,
      status,
      // Child arrays
      addresses: validAddresses,
      contacts: contacts.filter(c => c.firstName?.trim() && c.email?.trim()),
      bankAccounts: bankAccounts.filter(b => b.bankName?.trim() && b.accountNumber?.trim()),
      customFields: customFieldsObj,
    };

    try {
      if (isEditing && selectedCustomerId) {
        await api.customers.update(selectedCustomerId, payload);
      } else {
        const newCust = await api.customers.create(payload);
        setSelectedCustomerId(newCust.id);
      }
      setDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save client.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this client? This will unlink associated document history.')) return;
    try {
      await api.customers.delete(id);
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const getDocBadge = (type: string) => {
    switch (type) {
      case 'INVOICE': return 'bg-secondary-container text-on-secondary-container';
      case 'PROPOSAL': return 'bg-primary-container text-on-primary-container';
      default: return 'bg-surface-variant text-on-surface';
    }
  };

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* Master Column: Contacts Directory Pane */}
        <div className="w-[280px] bg-surface border-r border-outline-variant flex flex-col h-full shrink-0 select-none">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest h-12">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Client Directory</h2>
            <button
              onClick={handleOpenCreate}
              className="text-primary hover:text-primary-fixed-variant transition-colors flex items-center justify-center p-1 rounded hover:bg-surface-container"
              title="Add Customer"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-body-sm text-on-surface-variant animate-pulse">Loading clients...</div>
            ) : customers.length === 0 ? (
              <div className="p-4 text-center text-body-sm text-on-surface-variant italic">No clients registered.</div>
            ) : (
              customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`flex flex-col p-3 rounded-lg cursor-pointer transition-colors border
                    ${selectedCustomerId === c.id 
                      ? 'bg-surface-container-low border-primary/30' 
                      : 'border-transparent hover:bg-surface-container-low/60'}`}
                >
                  <div className="font-label-md text-label-md font-semibold text-on-surface truncate">{c.name}</div>
                  <div className="text-[11px] text-on-surface-variant truncate mt-0.5">{c.email}</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase
                      ${c.status === 'ACTIVE' ? 'bg-primary-container/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                      {c.status}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/70 font-mono">
                      {c.phone || '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Column: Main Center Pane (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 h-full custom-scrollbar">
          {detailLoading ? (
            <div className="p-8 text-center text-body-md text-on-surface-variant animate-pulse">Loading client portfolio...</div>
          ) : !selectedCustomerDetail ? (
            <div className="p-8 text-center text-body-md text-on-surface-variant italic select-none">No client selected in directory.</div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-stack-lg pb-12">
              
              {/* Profile Block */}
              <div className="bg-surface border border-outline-variant rounded-lg p-5 flex justify-between items-start shadow-sm">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-headline-lg font-bold select-none shadow-sm">
                    {selectedCustomerDetail.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex flex-col">
                    <div className="font-headline-lg text-headline-lg font-semibold text-on-surface flex items-center gap-2">
                      {selectedCustomerDetail.name}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase select-none
                        ${selectedCustomerDetail.status === 'ACTIVE' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {selectedCustomerDetail.status}
                      </span>
                    </div>
                    <span className="text-body-md text-on-surface-variant mt-0.5">{selectedCustomerDetail.email}</span>
                    {selectedCustomerDetail.phone && (
                      <span className="text-body-sm text-on-surface-variant/80 font-mono mt-0.5">{selectedCustomerDetail.phone}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 select-none">
                  <button
                    onClick={() => handleOpenEdit(selectedCustomerDetail)}
                    className="bg-surface border border-outline-variant hover:bg-surface-container-low font-semibold text-label-md px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Modify Client
                  </button>
                  <button
                    onClick={() => handleDelete(selectedCustomerDetail.id)}
                    className="bg-error-container text-on-error-container hover:bg-error-container/80 font-semibold text-label-md px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Remove
                  </button>
                </div>
              </div>

              {/* Linked Company Registry */}
              <div className="bg-surface border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col gap-2 select-none">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Associated Company (Billing Entity)</span>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">corporate_fare</span>
                    <span className="font-label-md text-label-md font-semibold text-on-surface">
                      {selectedCustomerDetail.company?.name || 'Unassigned'}
                    </span>
                  </div>
                  {selectedCustomerDetail.company && (
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {selectedCustomerDetail.company.city}, {selectedCustomerDetail.company.country}
                    </span>
                  )}
                </div>
              </div>

              {/* Linked Documents Table */}
              <div className="bg-surface border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b border-outline-variant bg-surface-container-lowest select-none">
                  <h2 className="font-headline-sm text-headline-sm font-semibold">Active Invoices & Proposals</h2>
                </div>
                <div className="flex-1 overflow-x-auto">
                  {linkedDocuments.length === 0 ? (
                    <div className="p-8 text-center text-body-sm text-on-surface-variant italic">No documents linked to this client portfolio.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                          <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Doc Title</th>
                          <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Type</th>
                          <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Status</th>
                          <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium text-right">Last Modified</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {linkedDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                            <td className="p-3">
                              <Link href={`/documents/${doc.id}/edit`} className="font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                                {doc.title}
                              </Link>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-1.5 py-0.2 rounded font-label-sm text-[10px] font-bold ${getDocBadge(doc.type)}`}>
                                {doc.type}
                              </span>
                            </td>
                            <td className="p-3 select-none">
                              <span className="font-body-sm text-body-sm text-on-surface-variant">{doc.status}</span>
                            </td>
                            <td className="p-3 font-body-sm text-body-sm text-on-surface-variant text-right select-none">
                              {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane Contextual Inspector */}
        <ContextualInspector title="Customer Profile">
          {!selectedCustomerDetail ? (
            <div className="text-center text-body-sm text-on-surface-variant py-4 italic select-none">No client selected.</div>
          ) : (
            <div className="flex flex-col gap-4 text-body-sm select-none">
              
              {/* Multi-Tab Selector */}
              <div className="flex bg-surface-container border border-outline-variant rounded-md p-0.5 text-[11px] font-semibold overflow-x-auto scrollbar-none">
                {([
                  { id: 'ADDRESS', label: 'Addresses' },
                  { id: 'BANKING', label: 'Bank Details' },
                  { id: 'CONTACTS', label: 'Contacts' },
                  { id: 'CUSTOM', label: 'Custom Fields' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 text-center py-1 px-2 rounded transition-colors whitespace-nowrap
                      ${activeTab === tab.id ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ADDRESS TAB */}
              {activeTab === 'ADDRESS' && (
                <div className="space-y-4 text-body-sm">
                  {selectedCustomerDetail.addresses?.map((addr: any, idx: number) => (
                    <div key={addr.id} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg relative">
                      <div className="absolute top-2 right-2 text-[9px] font-bold uppercase px-1 rounded bg-primary-container text-on-primary-container">
                        {addr.type}
                      </div>
                      <div className="font-semibold text-on-surface">Address #{idx + 1} {addr.isDefault && '(Default)'}</div>
                      <div className="text-on-surface mt-1 leading-tight">{addr.line1}</div>
                      {addr.line2 && <div className="text-on-surface-variant leading-tight">{addr.line2}</div>}
                      <div className="text-on-surface-variant mt-0.5">{addr.city}, {addr.postalCode}</div>
                      <div className="text-on-surface font-semibold">{addr.country}</div>
                    </div>
                  ))}
                  {(!selectedCustomerDetail.addresses || selectedCustomerDetail.addresses.length === 0) && (
                    <div className="text-center text-[11px] text-on-surface-variant/80 italic py-4">No custom addresses cataloged.</div>
                  )}
                </div>
              )}

              {/* BANKING TAB */}
              {activeTab === 'BANKING' && (
                <div className="space-y-4 text-body-sm">
                  {selectedCustomerDetail.bankAccounts?.map((bank: any, idx: number) => (
                    <div key={bank.id} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-1">
                      <div className="font-semibold text-on-surface">Account #{idx + 1} {bank.isDefault && '(Default)'}</div>
                      <div className="text-on-surface-variant"><span className="font-semibold">Bank:</span> {bank.bankName}</div>
                      <div className="text-on-surface-variant"><span className="font-semibold">Holder:</span> {bank.accountHolder}</div>
                      <div className="text-on-surface-variant font-mono"><span className="font-sans font-semibold">Account:</span> {bank.accountNumber}</div>
                      {bank.gstNumber && <div className="text-on-surface font-bold text-[11px] mt-1"><span className="font-semibold text-on-surface-variant">GSTIN:</span> {bank.gstNumber}</div>}
                    </div>
                  ))}
                  {(!selectedCustomerDetail.bankAccounts || selectedCustomerDetail.bankAccounts.length === 0) && (
                    <div className="text-center text-[11px] text-on-surface-variant/80 italic py-4">No custom bank accounts configured.</div>
                  )}
                </div>
              )}

              {/* CONTACTS TAB */}
              {activeTab === 'CONTACTS' && (
                <div className="space-y-3 text-body-sm">
                  {selectedCustomerDetail.contacts?.map((c: any) => (
                    <div key={c.id} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">contact_mail</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-on-surface truncate">{c.firstName} {c.lastName}</div>
                        <div className="text-[10px] text-primary uppercase font-bold tracking-wider">{c.role} {c.isDefault && '• DEFAULT'}</div>
                        <div className="text-on-surface-variant font-mono mt-1 text-[11px] truncate select-all">{c.email}</div>
                        {c.phone && <div className="text-on-surface-variant text-[11px] font-semibold mt-0.5">{c.phone}</div>}
                      </div>
                    </div>
                  ))}
                  {(!selectedCustomerDetail.contacts || selectedCustomerDetail.contacts.length === 0) && (
                    <div className="text-center text-[11px] text-on-surface-variant italic py-4">No custom contact points.</div>
                  )}
                </div>
              )}

              {/* CUSTOM FIELDS TAB */}
              {activeTab === 'CUSTOM' && (
                <div className="space-y-2 text-body-sm">
                  {selectedCustomerDetail.customFields && Object.keys(selectedCustomerDetail.customFields).length > 0 ? (
                    Object.entries(selectedCustomerDetail.customFields).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center bg-surface-container-low border border-outline-variant/60 rounded px-2.5 py-1.5 font-mono text-[11px]">
                        <span className="font-sans font-semibold text-on-surface-variant">{k}</span>
                        <span className="text-primary font-bold">{String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[11px] text-on-surface-variant/80 italic py-4">No custom variables assigned.</div>
                  )}
                </div>
              )}

            </div>
          )}
        </ContextualInspector>
      </main>

      {/* Customer Onboarding/Edit Drawer Modal */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-0 right-0 h-full w-[450px] bg-surface border-l border-outline-variant shadow-xl z-50 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar select-none">
            
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant shrink-0">
              <Dialog.Title className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {isEditing ? 'Modify Customer Profile' : 'Onboard Customer Contact'}
              </Dialog.Title>
              <Dialog.Close className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Dialog.Close>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container text-body-sm p-3 rounded border border-error/20 shrink-0">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 text-body-sm pb-12">
              
              {/* Primary Contact Details */}
              <section className="space-y-3">
                <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Primary Profile</h3>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Customer/Client Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. John Doe"
                    className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Primary Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="john.doe@client.com"
                    className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Phone number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555-0100"
                      className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Linked Company *</label>
                    <select
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      required
                      className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm text-on-surface"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Dynamic Addresses List */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Client Addresses</h3>
                  <button type="button" onClick={addAddressField} className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Address
                  </button>
                </div>
                {addresses.map((addr, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-2 relative">
                    <button type="button" onClick={() => removeAddressField(idx)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold">Address Type</label>
                        <select 
                          value={addr.type} 
                          onChange={(e) => updateAddressField(idx, 'type', e.target.value)}
                          className="h-8 border border-outline-variant rounded text-body-sm px-2 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface"
                        >
                          <option value="BILLING">Billing Address</option>
                          <option value="SHIPPING">Shipping Address</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5 mt-5">
                        <input 
                          type="checkbox" 
                          checked={addr.isDefault} 
                          onChange={(e) => updateAddressField(idx, 'isDefault', e.target.checked)}
                          className="rounded text-primary focus:ring-primary h-4 w-4"
                        />
                        <label className="text-[10px] font-semibold text-on-surface-variant">Default</label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold">Street Address *</label>
                      <input 
                        type="text" 
                        value={addr.line1} 
                        onChange={(e) => updateAddressField(idx, 'line1', e.target.value)}
                        placeholder="456 client lane"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold">City *</label>
                        <input 
                          type="text" 
                          value={addr.city} 
                          onChange={(e) => updateAddressField(idx, 'city', e.target.value)}
                          placeholder="City"
                          className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold">Zip Code *</label>
                        <input 
                          type="text" 
                          value={addr.postalCode} 
                          onChange={(e) => updateAddressField(idx, 'postalCode', e.target.value)}
                          placeholder="Zip"
                          className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold">Country *</label>
                        <input 
                          type="text" 
                          value={addr.country} 
                          onChange={(e) => updateAddressField(idx, 'country', e.target.value)}
                          placeholder="Country"
                          className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Dynamic Contacts List */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Associated Contacts</h3>
                  <button type="button" onClick={addContactField} className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Contact
                  </button>
                </div>
                {contacts.map((c, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-2 relative">
                    <button type="button" onClick={() => removeContactField(idx)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={c.firstName} 
                        onChange={(e) => updateContactField(idx, 'firstName', e.target.value)}
                        placeholder="First Name *"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={c.lastName} 
                        onChange={(e) => updateContactField(idx, 'lastName', e.target.value)}
                        placeholder="Last Name"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="email" 
                        value={c.email} 
                        onChange={(e) => updateContactField(idx, 'email', e.target.value)}
                        placeholder="Email Address *"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none font-mono text-[11px]"
                      />
                      <input 
                        type="text" 
                        value={c.phone || ''} 
                        onChange={(e) => updateContactField(idx, 'phone', e.target.value)}
                        placeholder="Phone Number"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none text-[11px]"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={c.role || ''} 
                      onChange={(e) => updateContactField(idx, 'role', e.target.value)}
                      placeholder="Role (e.g. PRIMARY, BILLING)"
                      className="w-full h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                    />
                  </div>
                ))}
              </section>

              {/* Dynamic Bank Accounts List */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Bank Details</h3>
                  <button type="button" onClick={addBankField} className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Bank Account
                  </button>
                </div>
                {bankAccounts.map((bank, idx) => (
                  <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-2 relative">
                    <button type="button" onClick={() => removeBankField(idx)} className="absolute top-2 right-2 text-on-surface-variant hover:text-error">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={bank.bankName} 
                        onChange={(e) => updateBankField(idx, 'bankName', e.target.value)}
                        placeholder="Bank Name *"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                      />
                      <input 
                        type="text" 
                        value={bank.accountHolder} 
                        onChange={(e) => updateBankField(idx, 'accountHolder', e.target.value)}
                        placeholder="Account Holder *"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={bank.accountNumber} 
                        onChange={(e) => updateBankField(idx, 'accountNumber', e.target.value)}
                        placeholder="Account Number *"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none font-mono"
                      />
                      <input 
                        type="text" 
                        value={bank.gstNumber || ''} 
                        onChange={(e) => updateBankField(idx, 'gstNumber', e.target.value)}
                        placeholder="GSTIN Code (If applicable)"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        value={bank.iban || ''} 
                        onChange={(e) => updateBankField(idx, 'iban', e.target.value)}
                        placeholder="IBAN"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none font-mono text-[11px]"
                      />
                      <input 
                        type="text" 
                        value={bank.bic || ''} 
                        onChange={(e) => updateBankField(idx, 'bic', e.target.value)}
                        placeholder="BIC (SWIFT)"
                        className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none font-mono text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </section>

              {/* Dynamic JSON Custom Fields */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Dynamic Custom Fields</h3>
                  <button type="button" onClick={addCustomField} className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">add_circle</span> Add Custom Field
                  </button>
                </div>
                {customFields.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-center relative">
                    <input 
                      type="text" 
                      value={entry.key} 
                      onChange={(e) => updateCustomField(idx, 'key', e.target.value)}
                      placeholder="Field Label"
                      className="flex-1 h-8 px-2 border border-outline-variant rounded text-body-sm font-semibold"
                    />
                    <input 
                      type="text" 
                      value={entry.value} 
                      onChange={(e) => updateCustomField(idx, 'value', e.target.value)}
                      placeholder="Field Value"
                      className="flex-1 h-8 px-2 border border-outline-variant rounded text-body-sm"
                    />
                    <button type="button" onClick={() => removeCustomField(idx)} className="text-on-surface-variant hover:text-error shrink-0">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </section>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-primary text-on-primary font-bold py-2.5 rounded hover:bg-primary-fixed-variant transition-colors text-body-sm mt-4 disabled:bg-primary/50 shadow-sm active:scale-95 transition-transform"
              >
                {formLoading ? 'Saving client registry...' : isEditing ? 'Update Client Profile' : 'Onboard Client'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </MainLayout>
  );
}
