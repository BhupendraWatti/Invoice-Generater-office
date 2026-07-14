'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { api } from '../../lib/api';
import { TemplateDefinitionDto } from '@docflow/shared-types';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

export default function TemplateDesignerListPage() {
  const [definitions, setDefinitions] = useState<TemplateDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [extendsId, setExtendsId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const loadDefinitions = async () => {
    setLoading(true);
    try {
      const data = await api.templateEngine.listDefinitions();
      setDefinitions(data);
    } catch (e) {
      console.error('Failed to list template definitions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinitions();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setFormLoading(true);
    try {
      const id = `tmpl-${Date.now()}`;
      await api.templateEngine.createDefinition({
        meta: {
          id,
          name,
          extends: extendsId || undefined,
          category: 'INVOICE',
          version: 1,
        },
      });
      setName('');
      setExtendsId('');
      setCreateOpen(false);
      triggerToast('Template layout drafted successfully.');
      loadDefinitions();
    } catch (err: any) {
      console.error('Failed to create template:', err);
      triggerToast(err.message || 'Failed to create template.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this template definition?')) return;
    try {
      await api.templateEngine.deleteDefinition(id);
      triggerToast('Template definition deleted.');
      loadDefinitions();
    } catch (e) {
      console.error('Failed to delete template:', e);
      triggerToast('Failed to delete template.');
    }
  };

  return (
    <MainLayout>
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface font-semibold text-body-sm px-4 py-2.5 rounded-lg shadow-lg z-50 flex items-center gap-2 select-none">
          <span className="material-symbols-outlined text-primary text-[18px]">info</span>
          {toastMsg}
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-6 h-full bg-surface-bright custom-scrollbar">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
          
          <header className="flex justify-between items-center select-none border-b border-outline-variant pb-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Zoho Document Template Designer</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Design, manage, and edit professional Word (DOCX) and PDF invoice print layout specifications.</p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-on-primary text-[11px] px-3.5 py-1.8 rounded-lg flex items-center gap-1.5 hover:bg-primary-fixed-variant transition-colors shadow-sm font-bold active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              Create Template Config
            </button>
          </header>

          {loading ? (
            <div className="p-8 text-center text-body-sm text-on-surface-variant animate-pulse">Loading template definitions...</div>
          ) : definitions.length === 0 ? (
            <div className="p-8 text-center text-body-sm text-on-surface-variant italic select-none">
              No template layouts defined yet. Click "Create Template Config" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
              {definitions.map((def, idx) => (
                <div
                  key={def.meta?.id || `tmpl-${idx}`}
                  className="bg-surface border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col h-[260px] group relative"
                >
                  {/* Decorative Header Canvas mockup */}
                  <div className="flex-1 bg-surface-container-lowest relative overflow-hidden flex items-center justify-center p-4">
                    <div className="w-full h-full bg-white border border-outline-variant/60 shadow-xs rounded-md flex flex-col p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                      <div 
                        className="w-1/3 h-3 rounded mb-3"
                        style={{ backgroundColor: `${def.theme?.colors?.primary || '#3525CD'}25` }}
                      ></div>
                      <div className="w-2/3 h-1.5 bg-surface-variant rounded mb-1.5"></div>
                      <div className="w-1/2 h-1.5 bg-surface-variant rounded mb-4"></div>
                      <div className="flex-1 border-t border-outline-variant/60 pt-3 flex flex-col gap-1.5">
                        <div className="w-full h-1 bg-surface-container rounded"></div>
                        <div className="w-full h-1 bg-surface-container rounded"></div>
                      </div>
                      <div 
                        className="mt-auto self-end w-1/4 h-3 rounded"
                        style={{ backgroundColor: `${def.theme?.colors?.primary || '#3525CD'}20` }}
                      ></div>
                    </div>
                  </div>

                  {/* Body Metadata details */}
                  <div className="p-4 border-t border-outline-variant bg-surface flex justify-between items-center">
                    <div>
                      <h3 className="font-headline-sm text-[13px] font-bold text-on-surface truncate max-w-[180px]">{def.meta?.name || 'Unnamed Template'}</h3>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 font-mono">
                        {def.meta?.extends ? `Extends: ${def.meta.extends}` : 'Base Blueprint'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/template-designer/${def.meta?.id || ''}`}
                        className="h-7 px-3 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[11px] rounded flex items-center justify-center transition-colors"
                      >
                        Design
                      </Link>
                      <button
                        onClick={() => handleDelete(def.meta?.id || '')}
                        className="w-7 h-7 rounded hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
                        title="Delete Template Layout"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Creation Modal Dialog */}
      <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-inverse-on-surface/40 backdrop-blur-sm z-50 transition-opacity animate-fade-in" />
          <Dialog.Content className="fixed top-[25%] left-1/2 -translate-x-1/2 w-full max-w-sm bg-surface border border-outline-variant rounded-xl shadow-xl z-50 p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant select-none">
              <Dialog.Title className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Create Template Layout
              </Dialog.Title>
              <Dialog.Close className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </Dialog.Close>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4 text-body-sm">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Layout Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Modern Minimalist Slate"
                  className="px-3 py-1.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-1 select-none">
                <label className="text-label-md text-on-surface-variant font-bold uppercase text-[9px] tracking-wider">Base Blueprint (Inherits from)</label>
                <select
                  value={extendsId}
                  onChange={(e) => setExtendsId(e.target.value)}
                  className="px-3 py-1.8 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary text-body-sm text-on-surface font-semibold"
                >
                  <option value="">None (Standalone Base)</option>
                  {definitions.map(d => (
                    <option key={d.meta.id} value={d.meta.id}>{d.meta.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-primary text-on-primary font-bold py-2 rounded-lg hover:bg-primary-fixed-variant transition-colors text-body-sm mt-2 disabled:bg-primary/50"
              >
                {formLoading ? 'Creating...' : 'Create Blueprint'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </MainLayout>
  );
}
