'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import ContextualInspector from '../../components/shared/ContextualInspector';
import { api } from '../../lib/api';
import { CompanyDto, AddressDto, ContactDto, BankAccountDto } from '@docflow/shared-types';
import * as Dialog from '@radix-ui/react-dialog';

interface CustomFieldEntry {
  key: string;
  value: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyDto[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ADDRESS' | 'BANKING' | 'CONTACTS' | 'CUSTOM'>('ADDRESS');

  // Form Modal Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // General Company Fields
  const [name, setName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');

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

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const list = await api.companies.list();
      setCompanies(list);
      if (list.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Fetch detailed info when selected company changes
  useEffect(() => {
    if (!selectedCompanyId) {
      setSelectedCompanyDetail(null);
      return;
    }
    const loadDetails = async () => {
      setDetailsLoading(true);
      try {
        const detail = await api.companies.get(selectedCompanyId);
        setSelectedCompanyDetail(detail);
      } catch (err) {
        console.error('Failed to load company details:', err);
      } finally {
        setDetailsLoading(false);
      }
    };
    loadDetails();
  }, [selectedCompanyId]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setError('');
    setName('');
    setRegistrationNumber('');
    setTaxId('');
    setAddresses([{ type: 'BILLING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: true }]);
    setContacts([{ firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', isDefault: true }]);
    setBankAccounts([{ bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: true }]);
    setCustomFields([]);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (comp: any) => {
    setIsEditing(true);
    setError('');
    setName(comp.name);
    setRegistrationNumber(comp.registrationNumber || '');
    setTaxId(comp.taxId || '');

    // Map nested fields if present, else fallback
    setAddresses(comp.addresses?.length ? comp.addresses : [{ type: 'BILLING', line1: '', line2: '', city: '', postalCode: '', country: '', isDefault: true }]);
    setContacts(comp.contacts?.length ? comp.contacts : [{ firstName: '', lastName: '', email: '', phone: '', role: 'PRIMARY', isDefault: true }]);
    setBankAccounts(comp.bankAccounts?.length ? comp.bankAccounts : [{ bankName: '', accountHolder: '', accountNumber: '', iban: '', bic: '', gstNumber: '', isDefault: true }]);

    // Map JSON custom fields
    if (comp.customFields) {
      const mapped = Object.entries(comp.customFields).map(([k, v]) => ({ key: k, value: String(v) }));
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
    if (!name.trim()) {
      setError('Please specify the company legal name.');
      return;
    }

    setFormLoading(true);
    setError('');

    // Serialize custom fields into key-value JSON
    const customFieldsObj: Record<string, string> = {};
    customFields.forEach(entry => {
      if (entry.key.trim()) {
        customFieldsObj[entry.key.trim()] = entry.value;
      }
    });

    // Validate addresses: must have at least one line1/city/country
    const validAddresses = addresses.filter(addr => addr.line1?.trim() && addr.city?.trim() && addr.country?.trim());
    if (validAddresses.length === 0) {
      setError('At least one complete Address block is required.');
      setFormLoading(false);
      return;
    }

    const payload = {
      name,
      registrationNumber: registrationNumber || undefined,
      taxId: taxId || undefined,
      // Fallback baseline fields to first address to satisfy existing db schema validation parameters
      addressLine1: validAddresses[0].line1 || '',
      addressLine2: validAddresses[0].line2 || undefined,
      city: validAddresses[0].city || '',
      postalCode: validAddresses[0].postalCode || '',
      country: validAddresses[0].country || '',
      // Banking
      bankName: bankAccounts[0]?.bankName || undefined,
      bankIban: bankAccounts[0]?.iban || undefined,
      bankBic: bankAccounts[0]?.bic || undefined,
      // Nested relational write arrays
      addresses: validAddresses,
      contacts: contacts.filter(c => c.firstName?.trim() && c.email?.trim()),
      bankAccounts: bankAccounts.filter(b => b.bankName?.trim() && b.accountNumber?.trim()),
      customFields: customFieldsObj,
    };

    try {
      if (isEditing && selectedCompanyId) {
        await api.companies.update(selectedCompanyId, payload);
      } else {
        const newComp = await api.companies.create(payload);
        setSelectedCompanyId(newComp.id);
      }
      setDrawerOpen(false);
      loadCompanies();
    } catch (err: any) {
      setError(err.message || 'Failed to save company entity.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company entity? This will unlink associated records.')) return;
    try {
      await api.companies.delete(id);
      if (selectedCompanyId === id) {
        setSelectedCompanyId(null);
      }
      loadCompanies();
    } catch (err) {
      console.error('Failed to delete company:', err);
    }
  };

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* Central Grid workspace */}
        <div className="flex-1 overflow-y-auto p-6 h-full custom-scrollbar">
          <div className="max-w-5xl mx-auto flex flex-col gap-stack-lg pb-12">
            
            {/* Header info */}
            <div className="flex justify-between items-center select-none">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1 font-semibold">Corporate Registry</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Configure corporate entities, address rosters, and billing parameters.</p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="bg-primary text-on-primary font-label-md text-[12px] px-3.5 py-1.5 rounded flex items-center gap-1 hover:bg-primary-fixed-variant transition-colors shadow-sm font-semibold active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Entity
              </button>
            </div>

            {/* Companies ledger table */}
            <div className="bg-surface border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
              <div className="flex-1 overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-body-sm text-on-surface-variant animate-pulse">Loading entities...</div>
                ) : companies.length === 0 ? (
                  <div className="p-8 text-center text-body-sm text-on-surface-variant italic">No corporate entities registered yet.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant select-none">
                        <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Company Name</th>
                        <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Reg Number</th>
                        <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Tax ID</th>
                        <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium">Primary Location</th>
                        <th className="p-3 font-label-sm text-label-sm text-on-surface-variant font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {companies.map((comp) => (
                        <tr 
                          key={comp.id} 
                          onClick={() => setSelectedCompanyId(comp.id)}
                          className={`hover:bg-surface-container-lowest transition-colors cursor-pointer group
                            ${selectedCompanyId === comp.id ? 'bg-surface-container-low' : ''}`}
                        >
                          <td className="p-3">
                            <div className="font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                              {comp.name}
                            </div>
                          </td>
                          <td className="p-3 font-body-sm text-body-sm text-on-surface-variant select-none">
                            {comp.registrationNumber || '—'}
                          </td>
                          <td className="p-3 font-body-sm text-body-sm text-on-surface-variant select-none">
                            {comp.taxId || '—'}
                          </td>
                          <td className="p-3 font-body-sm text-body-sm text-on-surface-variant select-none">
                            {comp.city}, {comp.country}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1 select-none">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(comp);
                                }}
                                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(comp.id);
                                }}
                                className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane Contextual Inspector */}
        <ContextualInspector title="Company Details">
          {detailsLoading ? (
            <div className="text-center text-body-sm text-on-surface-variant py-4 select-none">Loading details...</div>
          ) : !selectedCompanyDetail ? (
            <div className="text-center text-body-sm text-on-surface-variant py-4 italic select-none">No entity selected.</div>
          ) : (
            <div className="flex flex-col gap-4 select-none">
              <div className="flex flex-col">
                <div className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate">
                  {selectedCompanyDetail.name}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  ID: {selectedCompanyDetail.id.slice(0, 8)}...
                </div>
              </div>

              {/* Tonal detail summary cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Active Docs</div>
                  <div className="text-headline-sm font-bold text-on-surface mt-0.5">
                    {selectedCompanyDetail._count.documents}
                  </div>
                </div>
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Linked Clients</div>
                  <div className="text-headline-sm font-bold text-on-surface mt-0.5">
                    {selectedCompanyDetail._count.customers}
                  </div>
                </div>
              </div>

              <div className="h-px bg-outline-variant/60 w-full"></div>

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
                  {selectedCompanyDetail.addresses?.map((addr: any, idx: number) => (
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
                </div>
              )}

              {/* BANKING TAB */}
              {activeTab === 'BANKING' && (
                <div className="space-y-4 text-body-sm">
                  {selectedCompanyDetail.bankAccounts?.map((bank: any, idx: number) => (
                    <div key={bank.id} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-lg space-y-1">
                      <div className="font-semibold text-on-surface">Account #{idx + 1} {bank.isDefault && '(Default)'}</div>
                      <div className="text-on-surface-variant"><span className="font-semibold">Bank:</span> {bank.bankName}</div>
                      <div className="text-on-surface-variant"><span className="font-semibold">Holder:</span> {bank.accountHolder}</div>
                      <div className="text-on-surface-variant font-mono"><span className="font-sans font-semibold">Account:</span> {bank.accountNumber}</div>
                      {bank.iban && <div className="text-on-surface-variant font-mono text-[11px] break-all"><span className="font-sans font-semibold">IBAN:</span> {bank.iban}</div>}
                      {bank.bic && <div className="text-on-surface-variant font-mono text-[11px]"><span className="font-sans font-semibold">SWIFT:</span> {bank.bic}</div>}
                      {bank.gstNumber && <div className="text-on-surface font-bold text-[11px] mt-1"><span className="font-semibold text-on-surface-variant">GSTIN:</span> {bank.gstNumber}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* CONTACTS TAB */}
              {activeTab === 'CONTACTS' && (
                <div className="space-y-3 text-body-sm">
                  {selectedCompanyDetail.contacts?.map((c: any) => (
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
                  {(!selectedCompanyDetail.contacts || selectedCompanyDetail.contacts.length === 0) && (
                    <div className="text-center text-[11px] text-on-surface-variant italic py-4">No roster contacts.</div>
                  )}
                </div>
              )}

              {/* CUSTOM FIELDS TAB */}
              {activeTab === 'CUSTOM' && (
                <div className="space-y-2 text-body-sm">
                  {selectedCompanyDetail.customFields && Object.keys(selectedCompanyDetail.customFields).length > 0 ? (
                    Object.entries(selectedCompanyDetail.customFields).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center bg-surface-container-low border border-outline-variant/60 rounded px-2.5 py-1.5 font-mono text-[11px]">
                        <span className="font-sans font-semibold text-on-surface-variant">{k}</span>
                        <span className="text-primary font-bold">{String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[11px] text-on-surface-variant/80 italic py-4">No custom fields assigned.</div>
                  )}
                </div>
              )}

            </div>
          )}
        </ContextualInspector>
      </main>

      {/* Onboarding Form Drawer */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed top-0 right-0 h-full w-[450px] bg-surface border-l border-outline-variant shadow-xl z-50 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar select-none">
            
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant shrink-0">
              <Dialog.Title className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {isEditing ? 'Modify Entity Profile' : 'Onboard Corporate Entity'}
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
              
              {/* Profile details */}
              <section className="space-y-3">
                <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Entity Registration</h3>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Legal Company Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Acme Technologies LLC"
                    className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Reg Number</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="REG-98765"
                      className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Tax ID / VAT Code</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="VAT-45678"
                      className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Dynamic Addresses List */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Billing & Shipping Addresses</h3>
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
                        placeholder="123 Corporate Blvd"
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
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Contact Roster</h3>
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
                      placeholder="Role (e.g. PRIMARY, FINANCE)"
                      className="w-full h-8 px-2 border border-outline-variant rounded text-body-sm focus:outline-none"
                    />
                  </div>
                ))}
              </section>

              {/* Dynamic Bank Accounts List */}
              <section className="space-y-4 border-t border-outline-variant/60 pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider">Bank Accounts & GST Details</h3>
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
                {formLoading ? 'Saving entity registry...' : isEditing ? 'Update Corporate Entity' : 'Onboard Corporate Entity'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </MainLayout>
  );
}
