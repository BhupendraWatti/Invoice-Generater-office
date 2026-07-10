'use client';

import React, { useState, useEffect, use } from 'react';
import MainLayout from '../../../components/shared/MainLayout';
import ContextualInspector from '../../../components/shared/ContextualInspector';
import { api } from '../../../lib/api';
import { DocumentDto, UserDto, CompanyDto, CustomerDto, ActivityDto } from '@docflow/shared-types';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocumentHistoryPage({ params }: PageProps) {
  const { id } = use(params);
  
  // Document State
  const [docInfo, setDocInfo] = useState<(DocumentDto & { company?: CompanyDto; customer?: CustomerDto; author: UserDto }) | null>(null);
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocumentHistory = async () => {
    setLoading(true);
    try {
      // 1. Fetch document metadata
      const doc = await api.documents.get(id);
      setDocInfo(doc);
      
      // 2. Fetch global activities and filter for this document (or use custom endpoint if defined, but filtering works perfectly)
      const allActs = await api.activities.list();
      const filtered = allActs.filter((act) => act.documentId === id);
      setActivities(filtered);
    } catch (err) {
      console.error('Failed to load document history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentHistory();
  }, [id]);

  const handleExportCSV = () => {
    if (!docInfo || activities.length === 0) return;
    
    // Generate CSV contents
    const headers = ['Activity ID', 'Timestamp', 'User', 'Action', 'Details'];
    const rows = activities.map((act) => [
      act.id,
      new Date(act.createdAt).toISOString(),
      `${act.user?.firstName || ''} ${act.user?.lastName || ''} (${act.user?.email || ''})`,
      act.actionType,
      act.details,
    ]);

    const csvContent = 
      'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${docInfo.title.replace(/\.[^/.]+$/, "")}_audit_trail.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'EDIT': return 'bg-primary-container/15 text-primary border border-primary/20';
      case 'COMMENT': return 'bg-tertiary-container/15 text-tertiary border border-tertiary/20';
      case 'APPROVE': return 'bg-secondary-container/15 text-secondary border border-secondary/20';
      case 'REJECT': return 'bg-error-container/15 text-error border border-error/20';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'EDIT': return 'edit';
      case 'COMMENT': return 'comment';
      case 'APPROVE': return 'check';
      case 'REJECT': return 'close';
      default: return 'info';
    }
  };

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        {/* Central Workspace Pane */}
        <div className="flex-1 overflow-y-auto p-6 h-full">
          {loading ? (
            <div className="p-8 text-center text-body-md text-on-surface-variant">Loading document log history...</div>
          ) : !docInfo ? (
            <div className="p-8 text-center text-body-md text-on-surface-variant italic">Document history records not found.</div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-stack-lg pb-12">
              
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-body-sm select-none text-on-surface-variant font-medium">
                <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  Workspace
                </Link>
                <span className="text-outline-variant text-[12px]">/</span>
                <span className="hover:text-primary transition-colors cursor-pointer">Documents</span>
                <span className="text-outline-variant text-[12px]">/</span>
                <span className="text-on-surface font-semibold truncate max-w-[150px]">{docInfo.title}</span>
              </nav>

              {/* Document Registry Summary Card */}
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm select-none">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="font-headline-lg text-headline-lg font-semibold text-on-surface mb-1 flex items-center gap-2">
                      {docInfo.title}
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      File type: <span className="font-semibold text-on-surface">{docInfo.type}</span> | Status: <span className="font-semibold text-on-surface">{docInfo.status}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    disabled={activities.length === 0}
                    className="bg-surface border border-outline-variant hover:bg-surface-container-low font-semibold text-label-md px-3.5 py-1.5 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export CSV Log
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6 border-t border-outline-variant/60 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Created By</span>
                    <span className="text-body-sm mt-0.5 font-medium">{docInfo.author.firstName} {docInfo.author.lastName}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Company Group</span>
                    <span className="text-body-sm mt-0.5 font-medium truncate">{docInfo.company?.name || 'Unlinked'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Client Contact</span>
                    <span className="text-body-sm mt-0.5 font-medium truncate">{docInfo.customer?.name || 'Unlinked'}</span>
                  </div>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm">
                <h2 className="font-headline-sm text-headline-sm font-semibold mb-6 text-on-surface select-none">Audit Trail Log</h2>
                
                {activities.length === 0 ? (
                  <div className="text-center text-body-sm text-on-surface-variant py-8 italic select-none">
                    No activity logs recorded for this document.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-outline-variant/60 pl-6 ml-4 space-y-6">
                    {activities.map((act) => (
                      <div key={act.id} className="relative">
                        {/* Circle bullet position relative to absolute line */}
                        <div className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${getBadgeColor(act.actionType)}`}>
                          <span className="material-symbols-outlined text-[12px]">{getActionIcon(act.actionType)}</span>
                        </div>
                        <div className="flex flex-col bg-surface-container-low/40 hover:bg-surface-container-low transition-colors border border-outline-variant/40 rounded-lg p-3">
                          <div className="flex justify-between items-start select-none">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getBadgeColor(act.actionType)}`}>
                              {act.actionType}
                            </span>
                            <span className="text-[11px] text-on-surface-variant/80 font-mono">
                              {new Date(act.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="font-body-md text-body-sm text-on-surface mt-2">
                            {act.details}
                          </p>
                          <div className="text-[11px] text-on-surface-variant font-medium mt-1 select-none">
                            User: {act.user?.firstName} {act.user?.lastName} ({act.user?.email})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Right Pane Contextual Inspector */}
        <ContextualInspector title="File Properties">
          {!docInfo ? (
            <div className="text-center text-body-sm text-on-surface-variant py-4 italic select-none">No document active.</div>
          ) : (
            <div className="flex flex-col gap-4 text-body-sm select-none">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Registry ID</span>
                <span className="text-[11px] text-on-surface-variant font-mono bg-surface-container-low border border-outline-variant/60 px-2 py-1.5 rounded select-all mt-1">
                  {docInfo.id}
                </span>
              </div>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Registered Time</span>
                <span className="text-on-surface mt-0.5">{new Date(docInfo.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>

              <div className="h-px bg-outline-variant/60 w-full"></div>

              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Author Role Scope</span>
                <span className="text-on-surface mt-0.5 font-semibold">{docInfo.author.role}</span>
              </div>
            </div>
          )}
        </ContextualInspector>
      </main>
    </MainLayout>
  );
}
