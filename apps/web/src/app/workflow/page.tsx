'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { api } from '../../lib/api';
import { DocumentDto } from '@docflow/shared-types';
import Link from 'next/link';

export default function WorkflowPage() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const allDocs = await api.documents.list();
      // Filter only documents currently in REVIEW state
      setDocuments(allDocs.filter((d) => d.status === 'REVIEW'));
    } catch (err: any) {
      setError(err.message || 'Failed to query active workflows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.documents.updateStatus(id, 'APPROVED');
      setDocuments(documents.filter((d) => d.id !== id));
      triggerToast('Document successfully approved and released.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to approve document.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.documents.updateStatus(id, 'REJECTED');
      setDocuments(documents.filter((d) => d.id !== id));
      triggerToast('Document rejected and sent back to draft.');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to reject document.');
    }
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
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Workspace Workflow Queue</h1>
            <p className="font-body-sm text-[11px] text-on-surface-variant">Review and release invoices or proposals pending corporate approval.</p>
          </div>
        </header>

        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 border border-outline-variant rounded-lg bg-surface overflow-hidden flex flex-col shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-body-md text-on-surface-variant animate-pulse">
                  Querying workflow status...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-error font-semibold text-body-md">{error}</div>
              ) : documents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant select-none">
                  <span className="material-symbols-outlined text-[48px] text-primary/30 mb-2">fact_check</span>
                  <span className="text-body-md font-bold text-on-surface">Queue is Clear!</span>
                  <span className="text-[11px] mt-1 text-on-surface-variant">No invoices or proposals are currently awaiting administrator review.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                      <th className="p-3 w-[30%]">Document Title</th>
                      <th className="p-3 w-[15%]">Type</th>
                      <th className="p-3 w-[20%]">Last Updated</th>
                      <th className="p-3 w-[15%]">Status</th>
                      <th className="p-3 w-[20%] text-right">Review Decisions</th>
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
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase tracking-wide">
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReject(doc.id)}
                              className="h-7 px-2.5 rounded border border-outline-variant text-error hover:bg-error/5 transition-colors font-semibold text-[11px]"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(doc.id)}
                              className="h-7 px-3.5 rounded bg-primary text-on-primary hover:bg-primary-fixed-variant transition-all font-semibold text-[11px] shadow-sm"
                            >
                              Approve & Release
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
    </MainLayout>
  );
}
