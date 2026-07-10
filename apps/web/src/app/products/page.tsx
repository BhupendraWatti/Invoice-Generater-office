'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { api } from '../../lib/api';
import { ProductDto, UnitDto, TaxConfigurationDto } from '@docflow/shared-types';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [taxes, setTaxes] = useState<TaxConfigurationDto[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filtering/Sorting State
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'sku' | 'name' | 'rate'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Drawer Edit/Create State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<ProductDto> | null>(null);

  // Form inputs
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rate, setRate] = useState(0);
  const [unitId, setUnitId] = useState('');
  const [taxId, setTaxId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodList, unitList, taxList] = await Promise.all([
        api.products.list(),
        api.units.list(),
        api.taxes.list(),
      ]);
      setProducts(prodList);
      setUnits(unitList);
      setTaxes(taxList);
    } catch (err: any) {
      setError(err.message || 'Failed to load master data products catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setSku('');
    setName('');
    setDescription('');
    setRate(0);
    setUnitId(units[0]?.id || '');
    setTaxId(taxes.find(t => t.isDefault)?.id || taxes[0]?.id || '');
    setDrawerOpen(true);
  };

  const handleOpenEdit = (p: ProductDto) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setDescription(p.description || '');
    setRate(p.rate);
    setUnitId(p.unitId || '');
    setTaxId(p.taxId || '');
    setDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name) {
      triggerToast('SKU and Name are required fields.');
      return;
    }

    try {
      if (editingProduct?.id) {
        // Update existing product
        const updated = await api.products.update(editingProduct.id, {
          sku,
          name,
          description,
          rate: Number(rate) || 0,
          unitId: unitId || undefined,
          taxId: taxId || undefined,
        });
        setProducts(products.map(p => p.id === updated.id ? updated : p));
        triggerToast('Product catalog updated.');
      } else {
        // Create new product
        const created = await api.products.create({
          sku,
          name,
          description,
          rate: Number(rate) || 0,
          unitId: unitId || undefined,
          taxId: taxId || undefined,
        });
        setProducts([...products, created]);
        triggerToast('New product created.');
      }
      setDrawerOpen(false);
    } catch (err: any) {
      triggerToast(err.message || 'Error occurred during save action.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.products.delete(id);
      setProducts(products.filter(p => p.id !== id));
      triggerToast('Product removed from catalog.');
    } catch (err: any) {
      triggerToast(err.message || 'Error occurred during delete action.');
    }
  };

  // Sort & Filter
  const filteredProducts = products
    .filter(p => 
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: 'sku' | 'name' | 'rate') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
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

        {/* Master Data Products Header */}
        <header className="h-14 border-b border-outline-variant bg-surface px-6 flex justify-between items-center shrink-0">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-bold">Products & Services Library</h1>
            <p className="font-body-sm text-[11px] text-on-surface-variant">Autoritative inventory ledger for invoicing and drafting.</p>
          </div>
          <button 
            onClick={handleOpenCreate}
            className="h-8 px-4 rounded bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-label-md text-label-md flex items-center gap-1 font-semibold select-none shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add Product
          </button>
        </header>

        {/* Filters and spreadsheet grid */}
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
          
          {/* Top filter row */}
          <div className="flex gap-4 items-center bg-surface p-3 border border-outline-variant rounded-lg shrink-0">
            <div className="flex-1 max-w-sm relative">
              <span className="material-symbols-outlined absolute left-2 top-2 text-on-surface-variant text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search SKU, name, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm"
              />
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium ml-auto">
              Showing {filteredProducts.length} of {products.length} entries
            </span>
          </div>

          {/* Grid Container */}
          <div className="flex-1 border border-outline-variant rounded-lg bg-surface overflow-hidden flex flex-col shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loading ? (
                <div className="h-48 flex items-center justify-center text-body-md text-on-surface-variant animate-pulse">
                  Querying products ledger...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-error font-semibold text-body-md">{error}</div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-outline mb-2">inventory_2</span>
                  <span className="text-body-md font-medium">No Products Registered</span>
                  <span className="text-[11px] mt-1">Register a service line item to start billing customers.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant select-none uppercase tracking-wider">
                      <th onClick={() => toggleSort('sku')} className="p-3 cursor-pointer hover:bg-surface-container w-[15%]">
                        <div className="flex items-center gap-1">
                          SKU
                          {sortBy === 'sku' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th onClick={() => toggleSort('name')} className="p-3 cursor-pointer hover:bg-surface-container w-[30%]">
                        <div className="flex items-center gap-1">
                          Name
                          {sortBy === 'name' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="p-3 w-[25%]">Description</th>
                      <th onClick={() => toggleSort('rate')} className="p-3 cursor-pointer hover:bg-surface-container w-[12%] text-right">
                        <div className="flex items-center gap-1 justify-end">
                          Rate
                          {sortBy === 'rate' && (
                            <span className="material-symbols-outlined text-[14px]">
                              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="p-3 w-[10%]">Unit</th>
                      <th className="p-3 w-[10%]">Tax Policy</th>
                      <th className="p-3 w-[8%] text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-body-sm font-medium">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors group">
                        <td className="p-3 font-mono text-[11px] text-on-surface font-semibold truncate">{p.sku}</td>
                        <td className="p-3 text-on-surface font-bold truncate">{p.name}</td>
                        <td className="p-3 text-on-surface-variant truncate font-normal">{p.description || '—'}</td>
                        <td className="p-3 text-right text-primary font-bold font-mono">${p.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-on-surface-variant font-semibold">{p.unit?.code || '—'}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide
                            ${p.tax?.isDefault ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                            {p.tax?.code || '—'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEdit(p)}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                              title="Edit Properties"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id)}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                              title="Remove Product"
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

        {/* Sidebar Product/Service Configurator Drawer */}
        {drawerOpen && (
          <aside className="fixed right-0 top-0 h-screen w-[360px] bg-surface border-l border-outline-variant z-50 flex flex-col shadow-lg animate-in slide-in-from-right duration-200 select-none">
            <div className="h-14 border-b border-outline-variant bg-surface-bright px-4 flex items-center justify-between shrink-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                {editingProduct ? 'Edit Product SKU' : 'Add New Product'}
              </h2>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Product SKU (Unique)</label>
                <input 
                  type="text" 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., PRO-SVC-UI"
                  required
                  className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Item Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Enterprise UI Design"
                  required
                  className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Item Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the service details or product specifications..."
                  className="w-full p-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary h-24 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Base Rate / Price ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                  required
                  className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Unit Metric (UOM)</label>
                  <select 
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">No Unit</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.code} ({u.name})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Tax Category</label>
                  <select 
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-lowest text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Exempt</option>
                    {taxes.map(t => (
                      <option key={t.id} value={t.id}>{t.code} ({t.ratePercent}%)</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full h-9 rounded bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-semibold text-body-sm flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              >
                Save Product
              </button>
            </form>
          </aside>
        )}
      </div>
    </MainLayout>
  );
}
