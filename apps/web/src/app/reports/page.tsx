'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { api } from '../../lib/api';
import { DocumentDto } from '@docflow/shared-types';

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalPending: 0,
  });

  const loadReportData = async () => {
    setLoading(true);
    try {
      const allDocs = await api.documents.list();
      const invoiceDocs = allDocs.filter((d) => d.type === 'INVOICE');

      // Fetch blocks for each invoice to calculate exact totals
      const detailedInvoices = await Promise.all(
        invoiceDocs.map(async (inv) => {
          try {
            const docDetails = await api.documents.get(inv.id);
            const tableBlock = docDetails.blocks?.find((b) => b.blockType === 'TABLE');
            let total = 0;
            if (tableBlock && tableBlock.content) {
              const content = typeof tableBlock.content === 'string' ? JSON.parse(tableBlock.content) : tableBlock.content;
              const items = content.items || [];
              total = items.reduce(
                (sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
                0
              );
            }
            return { ...inv, total };
          } catch {
            return { ...inv, total: 0 };
          }
        })
      );

      let totalBilled = 0;
      let totalPaid = 0;
      let totalPending = 0;

      detailedInvoices.forEach((inv) => {
        totalBilled += inv.total;
        if (inv.status === 'PAID') {
          totalPaid += inv.total;
        } else if (inv.status === 'SENT' || inv.status === 'APPROVED' || inv.status === 'REVIEW') {
          totalPending += inv.total;
        }
      });

      setInvoices(detailedInvoices);
      setStats({ totalBilled, totalPaid, totalPending });
    } catch (err) {
      console.error('Failed to aggregate billing reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Mock monthly revenue for visualization when database is fresh
  const mockMonthlyData = [
    { month: 'Jan', amount: 12500 },
    { month: 'Feb', amount: 15400 },
    { month: 'Mar', amount: 18900 },
    { month: 'Apr', amount: 22100 },
    { month: 'May', amount: 24500 },
    { month: 'Jun', amount: 29800 },
  ];

  const maxMockAmount = Math.max(...mockMonthlyData.map((d) => d.amount));

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-w-0 bg-background relative h-full">
        <header className="h-14 border-b border-outline-variant bg-surface px-6 flex justify-between items-center shrink-0">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Billing Reports & Analytics</h1>
            <p className="font-body-sm text-[11px] text-on-surface-variant">Aggregate billing reports, collection funnels, and revenue metrics.</p>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar select-none">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-xs flex flex-col gap-1">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Total Volume Invoiced</span>
              <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono">
                ${stats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-on-surface-variant/80 mt-1">Aggregated across all generated invoices</span>
            </div>

            <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-xs flex flex-col gap-1">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Collected Cash (Paid)</span>
              <span className="font-display-sm text-display-sm font-bold text-primary font-mono">
                ${stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-primary/80 mt-1 font-semibold">Cleared into billing bank details</span>
            </div>

            <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-xs flex flex-col gap-1">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Outstanding Receivables</span>
              <span className="font-display-sm text-display-sm font-bold text-amber-600 font-mono">
                ${stats.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-amber-600/80 mt-1 font-semibold">Pending approval or client payment clearing</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Analytics Chart */}
            <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-xs flex flex-col gap-4">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Monthly Services Revenue</h3>
                <p className="font-body-sm text-[11px] text-on-surface-variant">Billing trends and monthly software services performance.</p>
              </div>

              <div className="h-48 flex items-end justify-between gap-4 pt-4 border-b border-outline-variant/60 font-mono text-[10px] text-on-surface-variant">
                {mockMonthlyData.map((d) => {
                  const percentHeight = (d.amount / maxMockAmount) * 80;
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-bold text-[9px] text-primary">${d.amount.toLocaleString()}</span>
                      <div 
                        style={{ height: `${percentHeight}%` }}
                        className="w-full bg-primary/10 border-t-2 border-primary rounded-t-sm transition-all hover:bg-primary/20"
                      />
                      <span className="font-semibold block py-1">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invoices List table summary */}
            <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-xs flex flex-col gap-4">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Receivables Register</h3>
                <p className="font-body-sm text-[11px] text-on-surface-variant">Recent generated billing invoices in the workspace.</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-48 custom-scrollbar">
                {loading ? (
                  <div className="p-4 text-center text-body-sm text-on-surface-variant animate-pulse">Loading data...</div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center text-body-sm italic text-on-surface-variant/80">No active invoices generated yet.</div>
                ) : (
                  <table className="w-full text-left text-[11px] font-semibold text-on-surface-variant">
                    <thead>
                      <tr className="border-b border-outline-variant pb-2 uppercase tracking-wider text-[9px] text-on-surface-variant/65">
                        <th className="py-1">Invoice</th>
                        <th className="py-1">Status</th>
                        <th className="py-1 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-surface-container-low/40">
                          <td className="py-2 text-on-surface font-bold">{inv.title}</td>
                          <td className="py-2">
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-surface-container-highest uppercase">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono text-primary font-bold">
                            ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
      </div>
    </MainLayout>
  );
}
