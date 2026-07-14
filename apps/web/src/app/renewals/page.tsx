'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import ContextualInspector from '../../components/shared/ContextualInspector';
import { api } from '../../lib/api';
import { RenewalDto } from '@docflow/shared-types';

export default function RenewalsSpreadsheetPage() {
  const [renewals, setRenewals] = useState<RenewalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Multi-select bulk action states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Quick Action form state
  const [addingRow, setAddingRow] = useState(false);
  const [newRowName, setNewRowName] = useState('');
  const [newRowType, setNewRowType] = useState('SOFTWARE');
  const [newRowDate, setNewRowDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRowAmount, setNewRowAmount] = useState(100);
  const [newRowVendor, setNewRowVendor] = useState('');
  const [newRowEmail, setNewRowEmail] = useState('');
  const [newRowPassword, setNewRowPassword] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const currencySymbol = currency === 'INR' ? '₹' : '$';

  const loadRenewals = async () => {
    setLoading(true);
    try {
      const list = await api.renewals.list();
      setRenewals(list);
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRenewals();
  }, []);

  // Inline update handler
  const handleCellChange = async (id: string, field: keyof RenewalDto, value: any) => {
    setSavingId(id);
    const updated = renewals.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRenewals(updated);

    try {
      // Find the specific item's payload parameters
      const matched = updated.find(r => r.id === id);
      if (matched) {
        await api.renewals.update(id, matched);
      }
    } catch (err) {
      console.error('Failed to update inline cell:', err);
    } finally {
      setSavingId(null);
    }
  };

  // Bulk action complete
  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const updates = selectedIds.map(id => ({
        id,
        data: { status: 'COMPLETED', paymentStatus: 'PAID' }
      }));
      await api.renewals.bulkUpdate(updates);
      setSelectedIds([]);
      loadRenewals();
    } catch (err) {
      console.error('Bulk completed updates failed:', err);
    }
  };

  // Bulk action delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Permanently delete the ${selectedIds.length} selected renewal rows?`)) return;
    try {
      await Promise.all(selectedIds.map(id => api.renewals.delete(id)));
      setSelectedIds([]);
      loadRenewals();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  const handleAddNewRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowName.trim()) return;
    try {
      const created = await api.renewals.create({
        itemName: newRowName,
        renewalType: newRowType,
        renewalDate: newRowDate,
        amount: newRowAmount,
        vendor: newRowVendor,
        emailId: newRowEmail,
        password: newRowPassword,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
      });
      setRenewals([...renewals, created]);
      setNewRowName('');
      setNewRowVendor('');
      setNewRowEmail('');
      setNewRowPassword('');
      setAddingRow(false);
    } catch (err) {
      console.error('Failed to append renewal row:', err);
    }
  };

  // Select all helper
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRenewals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRenewals.map(r => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Filtering calculations (memoized to optimize performance)
  const filteredRenewals = React.useMemo(() => {
    return renewals.filter((r) => {
      const matchesCategory = categoryFilter === 'ALL' || r.renewalType === categoryFilter;
      let matchesStatus = true;
      if (statusFilter === 'PENDING') {
        matchesStatus = r.status === 'PENDING';
      } else if (statusFilter === 'COMPLETED') {
        matchesStatus = r.status === 'COMPLETED';
      } else if (statusFilter === 'OVERDUE') {
        matchesStatus = r.paymentStatus === 'OVERDUE';
      }
      return matchesCategory && matchesStatus;
    });
  }, [renewals, categoryFilter, statusFilter]);

  const totalPendingAmount = React.useMemo(() => {
    return renewals
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + Number(r.amount), 0);
  }, [renewals]);

  const categories = [
    'SOFTWARE', 'LEASE', 'INSURANCE', 'CONTRACT', 'DOMAIN', 'HOSTING', 'SSL', 'AMC', 'MAINTENANCE'
  ];

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* Central Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6 h-full custom-scrollbar">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-5 pb-12">
            
            {/* Header info */}
            <div className="flex justify-between items-center select-none">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1 font-semibold">Renewals Ledger Workspace</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Configure expirations, payment schedules, and grace thresholds inline.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-surface border border-outline-variant rounded-lg px-4 py-2.5 shadow-sm flex flex-col">
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Unpaid Commitments</span>
                  <span className="text-headline-sm font-bold text-error font-mono mt-0.5">{currencySymbol}{totalPendingAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Filter toolbars row */}
            <div className="flex flex-wrap justify-between items-center gap-3 select-none border-b border-outline-variant pb-3 text-body-sm font-semibold">
              <div className="flex gap-2 flex-wrap">
                {/* Status Toggles */}
                {([
                  { id: 'ALL', label: 'All States' },
                  { id: 'PENDING', label: 'Pending' },
                  { id: 'COMPLETED', label: 'Completed' },
                  { id: 'OVERDUE', label: 'Overdue Expiries' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1 rounded-full border transition-all text-[11px] cursor-pointer
                      ${statusFilter === tab.id 
                        ? 'bg-primary text-on-primary border-primary shadow-sm' 
                        : 'bg-surface text-on-surface-variant border-outline-variant/60 hover:bg-surface-container-low'}`}
                  >
                    {tab.label}
                  </button>
                ))}

                {/* Category Select filter dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1 bg-surface border border-outline-variant/60 rounded-full text-[11px] font-semibold focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Currency select toggle */}
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
                  className="px-3 py-1 bg-surface border border-outline-variant/60 rounded-full text-[11px] font-bold text-primary focus:outline-none"
                >
                  <option value="INR">🇮🇳 INR (₹)</option>
                  <option value="USD">🇺🇸 USD ($)</option>
                </select>
              </div>

              {/* Add row template trigger */}
              <button
                onClick={() => setAddingRow(!addingRow)}
                className="bg-primary text-on-primary text-[11px] px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-primary-fixed-variant transition-colors shadow-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                Add Renewal Row
              </button>
            </div>

            {/* Slide Down Form to Add New Row */}
            {addingRow && (
              <form onSubmit={handleAddNewRow} className="bg-surface border border-outline-variant rounded-lg p-4 shadow-md grid grid-cols-2 md:grid-cols-7 gap-3 text-body-sm animate-fade-in select-none">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Website Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. vyomhometutor.com"
                    value={newRowName}
                    onChange={(e) => setNewRowName(e.target.value)}
                    required
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Category</label>
                  <select 
                    value={newRowType}
                    onChange={(e) => setNewRowType(e.target.value)}
                    className="h-8 px-2 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px]"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Gmail Email ID</label>
                  <input 
                    type="email" 
                    placeholder="name@gmail.com"
                    value={newRowEmail}
                    onChange={(e) => setNewRowEmail(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Password</label>
                  <input 
                    type="text" 
                    placeholder="Access secret"
                    value={newRowPassword}
                    onChange={(e) => setNewRowPassword(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px] font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Renewal Date</label>
                  <input 
                    type="date"
                    value={newRowDate}
                    onChange={(e) => setNewRowDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Amount ({currencySymbol})</label>
                  <input 
                    type="number"
                    value={newRowAmount}
                    onChange={(e) => setNewRowAmount(Number(e.target.value) || 0)}
                    required
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none font-mono text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-on-surface-variant font-bold uppercase">Domain Company</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Hostinger"
                    value={newRowVendor}
                    onChange={(e) => setNewRowVendor(e.target.value)}
                    className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none text-[11px]"
                  />
                </div>
                <button 
                  type="submit" 
                  className="col-span-2 md:col-span-7 bg-primary text-on-primary py-1.5 rounded hover:bg-primary-fixed-variant transition-colors font-bold mt-2 shadow active:scale-95 text-[11px]"
                >
                  Save Renewal Row
                </button>
              </form>
            )}

            {/* Bulk actions row bar */}
            {selectedIds.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 flex justify-between items-center select-none text-body-sm font-semibold animate-fade-in shadow-sm">
                <span className="text-primary font-mono">{selectedIds.length} row(s) selected</span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleBulkComplete}
                    className="bg-primary text-on-primary text-[11px] px-3.5 py-1.5 rounded hover:bg-primary-fixed-variant transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span> Mark Completed
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="bg-error-container text-on-error-container text-[11px] px-3.5 py-1.5 rounded hover:bg-error-container/80 transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span> Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* High-density spreadsheet ledger table */}
            <div className="bg-surface border border-outline-variant rounded-lg flex flex-col overflow-hidden shadow-sm">
              <div className="flex-1 overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-body-sm text-on-surface-variant animate-pulse">Entering Spreadsheet Ledger...</div>
                ) : filteredRenewals.length === 0 ? (
                  <div className="p-8 text-center text-body-sm text-on-surface-variant italic">No renewal ledger matches filter properties.</div>
                ) : (
                  <table className="w-full text-left border-collapse table-fixed min-w-[850px]">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant select-none text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-2 w-[4%] text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length === filteredRenewals.length}
                            onChange={handleToggleSelectAll}
                            className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                        </th>
                        <th className="p-2 w-[18%]">Website Name</th>
                        <th className="p-2 w-[15%]">Gmail Email ID</th>
                        <th className="p-2 w-[11%]">Renewal Date</th>
                        <th className="p-2 w-[10%]">Password</th>
                        <th className="p-2 w-[12%]">Domain Company</th>
                        <th className="p-2 w-[10%] text-right">Amount</th>
                        <th className="p-2 w-[10%] text-center">Payment</th>
                        <th className="p-2 w-[10%] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60 font-medium">
                      {filteredRenewals.map((r) => {
                        const isOverdue = r.paymentStatus === 'OVERDUE';
                        const isSaving = savingId === r.id;
                        return (
                          <tr 
                            key={r.id} 
                            className={`hover:bg-surface-container-lowest transition-colors text-[11px]
                              ${isOverdue ? 'bg-error-container/10 border-l-2 border-l-error' : ''}
                              ${selectedIds.includes(r.id) ? 'bg-primary-container/10' : ''}`}
                          >
                            
                            {/* Checkbox select */}
                            <td className="p-2 text-center align-middle">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(r.id)}
                                onChange={() => handleToggleSelect(r.id)}
                                className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5"
                              />
                            </td>

                            {/* Item name (Website Name) cell */}
                            <td className="p-2 align-middle">
                              <input 
                                type="text" 
                                value={r.itemName}
                                onChange={(e) => handleCellChange(r.id, 'itemName', e.target.value)}
                                className="w-full bg-transparent focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1.5 py-0.5 text-on-surface font-semibold focus:outline-none"
                              />
                            </td>
 
                            {/* Gmail email id cell */}
                            <td className="p-2 align-middle">
                              <input 
                                type="text" 
                                value={r.emailId || ''}
                                onChange={(e) => handleCellChange(r.id, 'emailId', e.target.value)}
                                placeholder="name@gmail.com"
                                className="w-full bg-transparent focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1.5 py-0.5 text-on-surface-variant focus:outline-none"
                              />
                            </td>
 
                            {/* Due date cell */}
                            <td className="p-2 align-middle">
                              <input 
                                type="date"
                                value={new Date(r.renewalDate).toISOString().split('T')[0]}
                                onChange={(e) => handleCellChange(r.id, 'renewalDate', e.target.value)}
                                className="w-full bg-transparent focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1.5 py-0.5 text-on-surface-variant font-mono focus:outline-none text-[10px]"
                              />
                            </td>

                            {/* Password cell */}
                            <td className="p-2 align-middle">
                              <input 
                                type="text" 
                                value={r.password || ''}
                                onChange={(e) => handleCellChange(r.id, 'password', e.target.value)}
                                placeholder="Password"
                                className="w-full bg-transparent focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1.5 py-0.5 text-on-surface-variant font-mono focus:outline-none"
                              />
                            </td>
 
                            {/* Domain Company (vendor) cell */}
                            <td className="p-2 align-middle">
                              <input 
                                type="text" 
                                value={r.vendor || ''}
                                onChange={(e) => handleCellChange(r.id, 'vendor', e.target.value)}
                                placeholder="Hostinger / GoDaddy"
                                className="w-full bg-transparent focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1.5 py-0.5 text-on-surface-variant focus:outline-none"
                              />
                            </td>
 
                            {/* Amount cell in Rupees/USD */}
                            <td className="p-2 text-right align-middle font-mono font-bold text-primary flex items-center justify-end gap-0.5">
                              <span>{currencySymbol}</span>
                              <input 
                                type="number" 
                                value={r.amount}
                                onChange={(e) => handleCellChange(r.id, 'amount', Number(e.target.value) || 0)}
                                className="w-14 bg-transparent text-right focus:bg-surface-container-low border border-transparent hover:border-outline-variant/60 focus:border-primary rounded px-1 py-0.5 focus:outline-none text-[11px]"
                              />
                            </td>

                            {/* Payment Status cell */}
                            <td className="p-2 align-middle text-center">
                              <select 
                                value={r.paymentStatus}
                                onChange={(e) => handleCellChange(r.id, 'paymentStatus', e.target.value)}
                                className={`px-1.5 py-0.5 border border-outline-variant/60 rounded text-[9px] font-bold text-center focus:outline-none
                                  ${r.paymentStatus === 'PAID' ? 'bg-primary-container text-on-primary-container' : 
                                    r.paymentStatus === 'OVERDUE' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'}`}
                              >
                                <option value="UNPAID">UNPAID</option>
                                <option value="PAID">PAID</option>
                                <option value="OVERDUE">OVERDUE</option>
                              </select>
                            </td>

                            {/* General workflow status */}
                            <td className="p-2 align-middle text-center">
                              <select 
                                value={r.status}
                                onChange={(e) => handleCellChange(r.id, 'status', e.target.value)}
                                className={`px-1.5 py-0.5 border border-outline-variant/60 rounded text-[9px] font-bold text-center focus:outline-none
                                  ${r.status === 'COMPLETED' ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'}`}
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="COMPLETED">COMPLETED</option>
                              </select>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane Contextual Inspector */}
        <ContextualInspector title="Automation Operations">
          <div className="flex flex-col gap-4 text-body-sm select-none">
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-tertiary font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 bg-tertiary h-2 rounded-full"></span>
                Idempotent reminders
              </span>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Scheduler scans expiring items daily. Alerts run at 30, 15, 7, 3, and 1-day intervals to log reminders log checks and prevent spam.
              </p>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 bg-primary h-2 rounded-full"></span>
                Hostinger configurations
              </span>
              <p className="text-[11px] text-on-surface-variant leading-snug font-mono">
                Port: 465 (SMTP Secure)<br/>
                Server: smtp.hostinger.com<br/>
                Address: billing@docflow-workspace.com
              </p>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 bg-secondary h-2 rounded-full"></span>
                Recurring Auto-billing
              </span>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Configurations fetch invoice templates and automatically spawn monthly, quarterly, or annual drafts when matching periods elapse.
              </p>
            </div>
          </div>
        </ContextualInspector>

      </main>
    </MainLayout>
  );
}
