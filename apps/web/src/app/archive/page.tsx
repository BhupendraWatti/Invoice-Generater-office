'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { api } from '../../lib/api';
import { DocumentDto } from '@docflow/shared-types';
import Link from 'next/link';

export default function ArchivePage() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadArchiveDocs = async () => {
    setLoading(true);
    try {
      const allDocs = await api.documents.list();
      // Archive holds completed, cancelled, or rejected records
      const archiveStatuses = ['PAID', 'CANCELLED', 'REJECTED'];
      setDocuments(allDocs.filter((d) => archiveStatuses.includes(d.status)));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch archived document vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchiveDocs();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <MainLayout>
      <div className="flex-1 flex flex-col min-w-0 bg-background relative h-full">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface font-semibold text-body-sm px-4 py-2 rounded-lg shadow-lg z-50 transition-all">
            {toast}
          </div>
        )}

        <header className="h-14 border-b border-outline-variant bg-surface px-6 flex justify-between items-center shrink-0">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Document Archive Vault</h1>
            <p className="font-body-sm text-[11px] text-on-surface-variant">Archived database of completed, cancelled, or rejected workspace transactions.</p>
          </div>
        </header>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 border border-outline-variant rounded-lg bg-surface overflow-hidden flex flex-col shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-body-md text-on-surface-variant animate-pulse">
                  Unlocking archive vault...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-error font-semibold text-body-md">{error}</div>
              ) : documents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant select-none">
                  <span className="material-symbols-outlined text-[48px] text-outline mb-2">archive</span>
                  <span className="text-body-md font-bold text-on-surface">Archive Vault is Empty</span>
                  <span className="text-[11px] mt-1 text-on-surface-variant">Only documents marked as Paid, Cancelled, or Rejected will appear in this ledger.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                      <th className="p-3 w-[40%]">Document Title</th>
                      <th className="p-3 w-[15%]">Type</th>
                      <th className="p-3 w-[25%]">Archive Date</th>
                      <th className="p-3 w-[20%]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-sm font-medium">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="p-3 text-on-surface font-bold truncate">
                          <Link href={`/documents/${doc.id}/edit`} className="hover:text-primary hover:underline">
                            {doc.title}
                          </Link>
                        </td>
                        <td className="p-3 text-on-surface-variant font-semibold">
                          <span className="px-2 py-0.5 rounded bg-surface-container-highest text-[10px] uppercase font-mono">
                            {doc.type}
                          </span>
                        </td>
                        <td className="p-3 text-on-surface-variant font-mono text-[11px]">
                          {new Date(doc.updatedAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide
                            ${doc.status === 'PAID' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant/70'}`}>
                            {doc.status}
                          </span>
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
    </MainLayout>
  );
}
