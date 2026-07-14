'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../components/shared/MainLayout';
import ContextualInspector from '../components/shared/ContextualInspector';
import { api } from '../lib/api';
import { DocumentDto, RenewalDto, EmailJobDto, CustomerDto } from '@docflow/shared-types';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

export default function OperationalWorkspacePage() {
  const { user } = useAuth();

  // State arrays
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [renewals, setRenewals] = useState<RenewalDto[]>([]);
  const [emailJobs, setEmailJobs] = useState<EmailJobDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Status message states
  const [toastMsg, setToastMsg] = useState('');
  const [toastError, setToastError] = useState(false);

  const loadWorkspaceData = async () => {
    try {
      const [docList, renList, emailList, custList] = await Promise.all([
        api.documents.list(),
        api.renewals.list(),
        api.emails.listJobs(),
        api.customers.list(),
      ]);

      setDocuments(docList);
      setRenewals(renList);
      setEmailJobs(emailList);
      setCustomers(custList.slice(0, 5)); // show top 5 clients
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const triggerToast = (msg: string, isErr = false) => {
    setToastMsg(msg);
    setToastError(isErr);
    setTimeout(() => {
      setToastMsg('');
    }, 4500);
  };

  const handleRetryEmail = async (id: string) => {
    try {
      await api.emails.retryJob(id);
      triggerToast('SMTP Email job requeued successfully.');
      // Refresh listings
      const updatedJobs = await api.emails.listJobs();
      setEmailJobs(updatedJobs);
    } catch (err: any) {
      triggerToast(err.message || 'Retry queue dispatch failed.', true);
    }
  };

  const handleProcessQueue = async () => {
    try {
      await api.emails.processQueue();
      triggerToast('Manual SMTP email queue sweep triggered.');
      const updatedJobs = await api.emails.listJobs();
      setEmailJobs(updatedJobs);
    } catch (err: any) {
      triggerToast(err.message || 'Queue sweep failed.', true);
    }
  };

  // Helper filters (memoized to prevent redundant calculations on re-render)
  const workDueTodayCount = React.useMemo(() => {
    const today = new Date().toDateString();
    return renewals.filter(r => {
      return new Date(r.renewalDate).toDateString() === today && r.status === 'PENDING';
    }).length;
  }, [renewals]);

  const failedEmailCount = React.useMemo(() => {
    return emailJobs.filter(j => j.status === 'FAILED').length;
  }, [emailJobs]);
  
  const pendingDocs = React.useMemo(() => {
    return documents.filter(d => d.status === 'REVIEW' || d.status === 'SENT');
  }, [documents]);

  const draftDocs = React.useMemo(() => {
    return documents.filter(d => d.status === 'DRAFT');
  }, [documents]);

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'PDF': return { icon: 'picture_as_pdf', bg: 'bg-error-container text-on-error-container' };
      case 'DOCX': return { icon: 'description', bg: 'bg-primary-container text-on-primary-container' };
      case 'ZIP': return { icon: 'inventory_2', bg: 'bg-surface-variant text-on-surface-variant' };
      case 'INVOICE': return { icon: 'receipt_long', bg: 'bg-secondary-container text-on-secondary-container' };
      case 'PROPOSAL': return { icon: 'assignment', bg: 'bg-primary-container text-on-primary-container' };
      default: return { icon: 'draft', bg: 'bg-surface-variant text-on-surface' };
    }
  };

  const getRenewalBadge = (type: string) => {
    switch (type) {
      case 'SOFTWARE': return 'bg-tertiary/10 text-tertiary';
      case 'DOMAIN': return 'bg-primary/10 text-primary';
      case 'HOSTING': return 'bg-secondary/10 text-secondary';
      case 'SSL': return 'bg-error/10 text-error';
      default: return 'bg-surface-variant text-on-surface';
    }
  };

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* Left Pane: Central Scrollable Workspace Canvas */}
        <div className="flex-1 overflow-y-auto p-6 h-full custom-scrollbar">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 pb-12">
            
            {/* Page Header */}
            <div className="flex justify-between items-center select-none">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold">Operational Studio Workspace</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Daily follow-up tasks, scheduled renewals, and document logs queue status.</p>
              </div>
              <button
                onClick={handleProcessQueue}
                className="bg-primary text-on-primary font-semibold text-[11px] px-3 h-8 rounded flex items-center gap-1 hover:bg-primary-fixed-variant transition-colors shadow-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Sweep Email Queue
              </button>
            </div>

            {/* Bento Grid: Today Action Counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Work Due Today */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-4 flex flex-col justify-between shadow-xs min-h-[110px]">
                <div className="flex justify-between items-start select-none">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Renewals Due Today</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">event_busy</span>
                </div>
                <div className="font-display-sm text-display-sm text-on-surface font-semibold">{workDueTodayCount}</div>
                <div className="text-[10px] text-on-surface-variant font-medium mt-1">Requires manual or cron resolution.</div>
              </div>

              {/* Pending Documents */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-4 flex flex-col justify-between shadow-xs min-h-[110px]">
                <div className="flex justify-between items-start select-none">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Review & Sent docs</span>
                  <span className="material-symbols-outlined text-secondary text-[18px]">history_edu</span>
                </div>
                <div className="font-display-sm text-display-sm text-on-surface font-semibold">{pendingDocs.length}</div>
                <div className="text-[10px] text-on-surface-variant font-medium mt-1">Awaiting client approvals or signature rules.</div>
              </div>

              {/* Failed SMTP Jobs */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg p-4 flex flex-col justify-between shadow-xs min-h-[110px]">
                <div className="flex justify-between items-start select-none">
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Failed Emails</span>
                  <span className="material-symbols-outlined text-error text-[18px]">mail_lock</span>
                </div>
                <div className="font-display-sm text-display-sm text-error font-semibold">{failedEmailCount}</div>
                <div className="text-[10px] text-on-surface-variant font-medium mt-1">SMTP errors requiring connection checks.</div>
              </div>

            </div>

            {/* Main Action Split panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Column 1 Card: Pending & Draft Documents */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg overflow-hidden shadow-xs flex flex-col min-h-[300px]">
                <div className="p-3 border-b border-outline-variant/30 bg-surface-container-lowest select-none">
                  <h2 className="font-headline-sm text-headline-sm font-semibold">Active Document Drafts</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-outline-variant/60 custom-scrollbar">
                  {loading ? (
                    <div className="p-4 text-center text-body-sm text-on-surface-variant animate-pulse">Loading documents...</div>
                  ) : draftDocs.length === 0 && pendingDocs.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-on-surface-variant italic">No drafts or pending documents logged.</div>
                  ) : (
                    [...pendingDocs, ...draftDocs].map((doc) => {
                      const meta = getDocIcon(doc.type);
                      return (
                        <div key={doc.id} className="p-2.5 flex items-center justify-between hover:bg-surface-container-low/40 rounded transition-colors group">
                          <Link href={`/documents/${doc.id}/edit`} className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={`w-7 h-7 rounded ${meta.bg} flex items-center justify-center shrink-0`}>
                              <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-label-md text-on-surface truncate group-hover:text-primary transition-colors max-w-[200px]">{doc.title}</div>
                              <div className="text-[10px] text-on-surface-variant/80 font-mono mt-0.5">{doc.type} • {doc.status}</div>
                            </div>
                          </Link>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2 Card: Upcoming Renewals List */}
              <div className="bg-surface border border-outline-variant/30 rounded-lg overflow-hidden shadow-xs flex flex-col min-h-[300px]">
                <div className="p-3 border-b border-outline-variant/30 bg-surface-container-lowest select-none flex justify-between items-center">
                  <h2 className="font-headline-sm text-headline-sm font-semibold">Scheduled Expirations</h2>
                  <Link href="/renewals" className="text-[10px] text-primary font-bold hover:underline">Manage All</Link>
                </div>
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-outline-variant/60 custom-scrollbar">
                  {loading ? (
                    <div className="p-4 text-center text-body-sm text-on-surface-variant animate-pulse">Loading renewals...</div>
                  ) : renewals.length === 0 ? (
                    <div className="p-8 text-center text-[11px] text-on-surface-variant italic">No scheduled renewals found.</div>
                  ) : (
                    renewals.map((r) => (
                      <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-surface-container-low/40 rounded transition-colors">
                        <div className="min-w-0">
                          <div className="font-semibold text-label-md text-on-surface truncate max-w-[220px]">{r.itemName}</div>
                          <div className="flex gap-1.5 items-center mt-0.5 select-none">
                            <span className={`text-[8px] font-bold px-1 rounded ${getRenewalBadge(r.renewalType)}`}>
                              {r.renewalType}
                            </span>
                            <span className="text-[10px] text-on-surface-variant/80 font-mono">${Number(r.amount).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-on-surface font-semibold font-mono">
                            {new Date(r.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <span className={`text-[9px] font-bold ${r.status === 'COMPLETED' ? 'text-primary' : 'text-error'}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3 Full-Width Card: SMTP Email queue alerts logs */}
              <div className="col-span-1 md:col-span-2 bg-surface border border-outline-variant/30 rounded-lg overflow-hidden shadow-xs flex flex-col min-h-[220px]">
                <div className="p-3 border-b border-outline-variant/30 bg-surface-container-lowest select-none">
                  <h2 className="font-headline-sm text-headline-sm font-semibold">SMTP Email Dispatch Queue Logs (Failed/Sent)</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 divide-y divide-outline-variant/60 custom-scrollbar">
                  {loading ? (
                    <div className="p-4 text-center text-body-sm text-on-surface-variant animate-pulse">Loading email jobs...</div>
                  ) : emailJobs.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-on-surface-variant italic">No email queue logs recorded.</div>
                  ) : (
                    emailJobs.map((job) => (
                      <div key={job.id} className="p-2.5 flex items-center justify-between hover:bg-surface-container-low/40 rounded transition-colors">
                        <div className="min-w-0 pr-4">
                          <div className="font-semibold text-label-md text-on-surface truncate max-w-[320px]">To: {job.recipient} | Sub: {job.subject}</div>
                          {job.errorMessage ? (
                            <p className="text-[10px] text-error font-medium leading-snug mt-0.5 max-w-[500px] font-mono select-text">{job.errorMessage}</p>
                          ) : (
                            <p className="text-[10px] text-on-surface-variant/80 truncate mt-0.5 max-w-[500px]">{job.message.slice(0, 100)}...</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase select-none
                            ${job.status === 'SENT' ? 'bg-primary-container text-on-primary-container' : 
                              job.status === 'FAILED' ? 'bg-error-container text-on-error-container animate-pulse' : 'bg-surface-variant text-on-surface-variant'}`}
                          >
                            {job.status}
                          </span>
                          
                          {/* Retry action for failed jobs */}
                          {job.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetryEmail(job.id)}
                              className="bg-surface hover:bg-surface-container border border-outline-variant/30 font-bold text-[9px] px-2 py-1 rounded transition-colors text-primary active:scale-95 flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[11px]">send</span> Retry Dispatch
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right Pane Contextual Inspector Panel */}
        <ContextualInspector title="Quick Shortcuts">
          <div className="flex flex-col gap-4 text-body-sm select-none">
            
            {/* Quick Actions Links */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Workspace Actions</span>
              <Link 
                href="/renewals" 
                className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded font-label-md text-[11px] text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                Spreadsheet Renewals
              </Link>
              <Link 
                href="/products" 
                className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded font-label-md text-[11px] text-on-surface hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                Inventory Products
              </Link>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            {/* Active Customers listing */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Recently Onboarded clients</span>
              {customers.map((c) => (
                <Link 
                  key={c.id} 
                  href="/customers" 
                  className="flex items-center gap-2 hover:bg-surface-container-low p-1.5 rounded transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-[10px]">
                    {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[11px] text-on-surface truncate max-w-[150px]">{c.name}</div>
                    <div className="text-[9px] text-on-surface-variant truncate max-w-[150px]">{c.email}</div>
                  </div>
                </Link>
              ))}
            </div>

          </div>

          {/* Toast alert overlays */}
          {toastMsg && (
            <div 
              style={{ borderLeft: `4px solid ${toastError ? '#b3261e' : '#6750a4'}` }}
              className="p-3 bg-surface-container border border-outline-variant shadow-lg rounded-md mt-auto flex items-center gap-2"
            >
              <span 
                className="material-symbols-outlined text-[18px]"
                style={{ color: toastError ? '#b3261e' : '#6750a4' }}
              >
                {toastError ? 'error' : 'check_circle'}
              </span>
              <span className="text-[11px] font-bold text-on-surface leading-tight">{toastMsg}</span>
            </div>
          )}
        </ContextualInspector>

      </main>
    </MainLayout>
  );
}
