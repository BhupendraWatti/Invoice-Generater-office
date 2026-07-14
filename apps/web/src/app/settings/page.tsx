'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import ContextualInspector from '../../components/shared/ContextualInspector';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  TaxConfigurationDto, 
  PaymentTermDto, 
  CurrencyDto, 
  UnitDto, 
  DocumentNumberingDto,
  CustomFieldConfigDto,
  CustomDocumentTypeDto,
} from '@docflow/shared-types';

type SettingsTab = 'general' | 'products' | 'taxes' | 'payment-terms' | 'currencies' | 'units' | 'numbering' | 'customization' | 'users' | 'audit' | 'health';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // General tab states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [archivePeriod, setArchivePeriod] = useState(12);
  const [fileLimit, setFileLimit] = useState(50);

  // Taxes tab states
  const [taxes, setTaxes] = useState<TaxConfigurationDto[]>([]);
  const [newTaxCode, setNewTaxCode] = useState('');
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState(0);
  const [newTaxDefault, setNewTaxDefault] = useState(false);

  // Payment Terms states
  const [terms, setTerms] = useState<PaymentTermDto[]>([]);
  const [newTermName, setNewTermName] = useState('');
  const [newTermDays, setNewTermDays] = useState(30);
  const [newTermDesc, setNewTermDesc] = useState('');
  const [newTermDefault, setNewTermDefault] = useState(false);

  // Currencies states
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [newCurrCode, setNewCurrCode] = useState('INR');
  const [newCurrName, setNewCurrName] = useState('Indian Rupee');
  const [newCurrSymbol, setNewCurrSymbol] = useState('₹');
  const [newCurrRate, setNewCurrRate] = useState(1.0);
  const [newCurrDefault, setNewCurrDefault] = useState(false);

  // Product Master states
  const [products, setProducts] = useState<any[]>([]);
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdRate, setNewProdRate] = useState(0);
  const [newProdUnitId, setNewProdUnitId] = useState('');
  const [newProdTaxId, setNewProdTaxId] = useState('');
  const [editingProdId, setEditingProdId] = useState<string | null>(null);

  // Units UOM states
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  // Numbering states
  const [numberings, setNumberings] = useState<DocumentNumberingDto[]>([]);
  const [numType, setNumType] = useState('INVOICE');
  const [numPrefix, setNumPrefix] = useState('INV-');
  const [numSuffix, setNumSuffix] = useState('');
  const [numCurrent, setNumCurrent] = useState(1);
  const [numDigits, setNumDigits] = useState(4);

  // Customization builder states
  const [fieldConfigs, setFieldConfigs] = useState<CustomFieldConfigDto[]>([]);
  const [customDocTypes, setCustomDocTypes] = useState<CustomDocumentTypeDto[]>([]);
  const [activeEntity, setActiveEntity] = useState<'COMPANY' | 'CUSTOMER' | 'DOCUMENT'>('DOCUMENT');

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('TEXT');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [newDocTypeLabel, setNewDocTypeLabel] = useState('');
  const [newDocTypePrefix, setNewDocTypePrefix] = useState('');

  // Admin & Compliance states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPagesCount, setAuditPagesCount] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEmailFilter, setAuditEmailFilter] = useState('');
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Sync user profile settings
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setMfaEnabled(user.mfaEnabled);
    }
  }, [user]);

  // Initial Load based on tab changes
  useEffect(() => {
    const loadTabDetails = async () => {
      setSuccess('');
      setError('');
      try {
        if (activeTab === 'general') {
          const sys = await api.settings.getSystem();
          setArchivePeriod(sys.archivePeriodMonths);
          setFileLimit(sys.maxFileSizeMb);
        } else if (activeTab === 'products') {
          const [prodList, unitsList, taxList] = await Promise.all([
            api.products.list(),
            api.units.list(),
            api.taxes.list()
          ]);
          setProducts(prodList);
          setUnits(unitsList);
          setTaxes(taxList);
        } else if (activeTab === 'taxes') {
          const taxList = await api.taxes.list();
          setTaxes(taxList);
        } else if (activeTab === 'payment-terms') {
          const termsList = await api.paymentTerms.list();
          setTerms(termsList);
        } else if (activeTab === 'currencies') {
          const currList = await api.currencies.list();
          setCurrencies(currList);
        } else if (activeTab === 'units') {
          const unitsList = await api.units.list();
          setUnits(unitsList);
        } else if (activeTab === 'numbering') {
          const numList = await api.numberings.list();
          setNumberings(numList);
          const current = numList.find(n => n.documentType === numType);
          if (current) {
            setNumPrefix(current.prefix);
            setNumSuffix(current.suffix || '');
            setNumCurrent(current.currentNumber);
            setNumDigits(current.paddingDigits);
          } else {
            setNumPrefix(numType === 'INVOICE' ? 'INV-' : 'PROP-');
            setNumSuffix('');
            setNumCurrent(1);
            setNumDigits(4);
          }
        } else if (activeTab === 'customization') {
          const [fields, types] = await Promise.all([
            api.customization.listFields(),
            api.customization.listTypes(),
          ]);
          setFieldConfigs(fields);
          setCustomDocTypes(types);
        } else if (activeTab === 'users') {
          const list = await api.adminUsers.list();
          setUsersList(list);
        } else if (activeTab === 'audit') {
          const res = await api.auditLogs.list(auditPage, 20, auditActionFilter, auditEmailFilter);
          setAuditLogs(res.logs);
          setAuditTotal(res.total);
          setAuditPagesCount(res.pagesCount);
        } else if (activeTab === 'health') {
          const check = await api.health.check();
          setSystemHealth(check);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch settings configs.');
      }
    };
    loadTabDetails();
  }, [activeTab, numType, auditPage, auditActionFilter, auditEmailFilter]);

  // Toast handlers
  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
  };

  // General profile update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.updateSettings({ firstName, lastName, mfaEnabled });
      showToast('Profile and settings updated successfully!');
      refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaToggle = async () => {
    setLoading(true);
    const newMfa = !mfaEnabled;
    try {
      await api.auth.updateSettings({ mfaEnabled: newMfa });
      setMfaEnabled(newMfa);
      showToast(newMfa ? 'TOTP MFA Security activated!' : 'TOTP MFA deactivated.');
      refreshUser();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle MFA settings.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleArchivePeriodChange = async (val: number) => {
    setArchivePeriod(val);
    try {
      await api.settings.updateSystem({ archivePeriodMonths: val });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileLimitChange = async (val: number) => {
    setFileLimit(val);
    try {
      await api.settings.updateSystem({ maxFileSizeMb: val });
    } catch (err) {
      console.error(err);
    }
  };

  // Tax Configurations CRUD
  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxCode || !newTaxName) return;
    try {
      const created = await api.taxes.create({
        code: newTaxCode,
        name: newTaxName,
        ratePercent: Number(newTaxRate) || 0,
        isDefault: newTaxDefault,
      });
      setTaxes([...taxes, created]);
      setNewTaxCode('');
      setNewTaxName('');
      setNewTaxRate(0);
      setNewTaxDefault(false);
      showToast('Tax Configuration appended.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save tax policy.', true);
    }
  };

  const handleDeleteTax = async (id: string) => {
    try {
      await api.taxes.delete(id);
      setTaxes(taxes.filter(t => t.id !== id));
      showToast('Tax Configuration removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete tax policy.', true);
    }
  };

  // Payment Terms CRUD
  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName) return;
    try {
      const created = await api.paymentTerms.create({
        name: newTermName,
        daysDue: Number(newTermDays) || 0,
        description: newTermDesc,
        isDefault: newTermDefault,
      });
      setTerms([...terms, created]);
      setNewTermName('');
      setNewTermDays(30);
      setNewTermDesc('');
      setNewTermDefault(false);
      showToast('Payment term saved successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save term.', true);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    try {
      await api.paymentTerms.delete(id);
      setTerms(terms.filter(t => t.id !== id));
      showToast('Payment term removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete payment term.', true);
    }
  };

  // Currencies CRUD
  const handleCreateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrCode || !newCurrName) return;
    try {
      const created = await api.currencies.create({
        code: newCurrCode,
        name: newCurrName,
        symbol: newCurrSymbol,
        exchangeRate: Number(newCurrRate) || 1.0,
        isDefault: newCurrDefault,
      });
      setCurrencies([...currencies, created]);
      setNewCurrCode('INR');
      setNewCurrName('Indian Rupee');
      setNewCurrSymbol('₹');
      setNewCurrRate(1.0);
      setNewCurrDefault(false);
      showToast('Currency currency mapping created.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save currency.', true);
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    try {
      await api.currencies.delete(id);
      setCurrencies(currencies.filter(c => c.id !== id));
      showToast('Currency mapping deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete currency.', true);
    }
  };

  // Product Master CRUD
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdSku || !newProdName) return;
    try {
      if (editingProdId) {
        const updated = await api.products.update(editingProdId, {
          sku: newProdSku,
          name: newProdName,
          description: newProdDesc,
          rate: Number(newProdRate) || 0,
          unitId: newProdUnitId || undefined,
          taxId: newProdTaxId || undefined,
        });
        setProducts(products.map(p => p.id === editingProdId ? updated : p));
        setEditingProdId(null);
        showToast('Product master entry updated.');
      } else {
        const created = await api.products.create({
          sku: newProdSku,
          name: newProdName,
          description: newProdDesc,
          rate: Number(newProdRate) || 0,
          unitId: newProdUnitId || undefined,
          taxId: newProdTaxId || undefined,
        });
        setProducts([...products, created]);
        showToast('Product master entry registered.');
      }
      setNewProdSku('');
      setNewProdName('');
      setNewProdDesc('');
      setNewProdRate(0);
      setNewProdUnitId(units[0]?.id || '');
      setNewProdTaxId(taxes[0]?.id || '');
    } catch (err: any) {
      showToast(err.message || 'Failed to save product.', true);
    }
  };

  const handleEditProduct = (p: any) => {
    setEditingProdId(p.id);
    setNewProdSku(p.sku);
    setNewProdName(p.name);
    setNewProdDesc(p.description || '');
    setNewProdRate(p.rate);
    setNewProdUnitId(p.unitId || '');
    setNewProdTaxId(p.taxId || '');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product/service from the master?')) return;
    try {
      await api.products.delete(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Product master entry removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product.', true);
    }
  };

  // Units UOM CRUD
  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode || !newUnitName) return;
    try {
      const created = await api.units.create({
        code: newUnitCode,
        name: newUnitName,
      });
      setUnits([...units, created]);
      setNewUnitCode('');
      setNewUnitName('');
      showToast('UOM Unit metric appended.');
    } catch (err: any) {
      showToast(err.message || 'Failed to create Unit.', true);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      await api.units.delete(id);
      setUnits(units.filter(u => u.id !== id));
      showToast('UOM Unit removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete unit.', true);
    }
  };

  // Numbering Configuration updates
  const handleSaveNumbering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await api.numberings.save({
        documentType: numType,
        prefix: numPrefix,
        suffix: numSuffix,
        currentNumber: Number(numCurrent) || 1,
        paddingDigits: Number(numDigits) || 4,
      });
      setNumberings(numberings.map(n => n.documentType === numType ? saved : n));
    } catch (err: any) {
      showToast(err.message || 'Failed to save numbering prefix configurations.', true);
    }
  };

  // Customization CRUD Actions
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName || !newFieldLabel) return;
    try {
      const created = await api.customization.createField({
        entityType: activeEntity,
        fieldName: newFieldName,
        fieldLabel: newFieldLabel,
        fieldType: newFieldType,
        isRequired: newFieldRequired,
        options: newFieldOptions,
      });
      setFieldConfigs([...fieldConfigs, created]);
      setNewFieldName('');
      setNewFieldLabel('');
      setNewFieldOptions('');
      setNewFieldRequired(false);
      showToast(`Custom Field "${newFieldLabel}" registered successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save custom field.', true);
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      await api.customization.deleteField(id);
      setFieldConfigs(fieldConfigs.filter(f => f.id !== id));
      showToast('Custom Field configuration deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete custom field.', true);
    }
  };

  const handleCreateDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTypeName || !newDocTypeLabel || !newDocTypePrefix) return;
    try {
      const created = await api.customization.createType({
        name: newDocTypeName,
        label: newDocTypeLabel,
        prefix: newDocTypePrefix,
      });
      setCustomDocTypes([...customDocTypes, created]);
      setNewDocTypeName('');
      setNewDocTypeLabel('');
      setNewDocTypePrefix('');
      showToast(`Custom Document Type "${newDocTypeLabel}" created.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create document type.', true);
    }
  };

  const handleDeleteDocType = async (id: string) => {
    try {
      await api.customization.deleteType(id);
      setCustomDocTypes(customDocTypes.filter(d => d.id !== id));
      showToast('Custom Document Type deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document type.', true);
    }
  };

  // User Management Admin actions
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.adminUsers.changeRole(userId, newRole);
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast(`User role successfully changed to ${newRole}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role.', true);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      showToast('You cannot delete your own active administrator profile.', true);
      return;
    }
    if (!confirm('Are you sure you want to delete this user from the workspace?')) return;
    try {
      await api.adminUsers.delete(userId);
      setUsersList(usersList.filter(u => u.id !== userId));
      showToast('User profile deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user.', true);
    }
  };

  const tabs: Array<{ id: SettingsTab; title: string; icon: string }> = [
    { id: 'general', title: 'General & Profile', icon: 'manage_accounts' },
    { id: 'products', title: 'Product/Service Master', icon: 'inventory_2' },
    { id: 'taxes', title: 'Tax Config', icon: 'percent' },
    { id: 'payment-terms', title: 'Payment Terms', icon: 'credit_card' },
    { id: 'currencies', title: 'Currencies', icon: 'payments' },
    { id: 'units', title: 'Billing Units', icon: 'square_foot' },
    { id: 'numbering', title: 'Auto Numbering', icon: 'tag' },
    { id: 'customization', title: 'Customizer Builder', icon: 'dashboard_customize' },
    ...(user?.role === 'ADMIN' ? [
      { id: 'users' as SettingsTab, title: 'Team Access & Roles', icon: 'shield_person' },
      { id: 'audit' as SettingsTab, title: 'Workspace Audit Trail', icon: 'history_toggle_off' },
      { id: 'health' as SettingsTab, title: 'System Diagnostics', icon: 'health_and_safety' },
    ] : []),
  ];

  return (
    <MainLayout>
      <main className="flex h-full w-full overflow-hidden bg-background">
        
        {/* Central tab wrapper layout */}
        <div className="flex-1 overflow-y-auto p-6 h-full custom-scrollbar select-none">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6 pb-12">
            
            {/* Page header title details */}
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Workspace Configuration Settings</h1>
              <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Define authoritative constants for document calculations, templates, and currency structures.</p>
            </div>

            {/* Tab header buttons row */}
            <div className="flex border-b border-outline-variant bg-surface rounded-t-lg overflow-x-auto text-body-sm font-semibold scrollbar-none">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 border-b-2 hover:bg-surface-container-low transition-all
                    ${activeTab === t.id ? 'border-primary text-primary bg-surface-container-low' : 'border-transparent text-on-surface-variant'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                  {t.title}
                </button>
              ))}
            </div>

            {/* Response Alerts */}
            {success && (
              <div className="bg-primary-container/20 text-primary border border-primary/20 text-body-sm p-3.5 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {success}
              </div>
            )}
            {error && (
              <div className="bg-error-container text-on-error-container border border-error/20 text-body-sm p-3.5 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* ======================================================== */}
            {/* GENERAL TAB CONTENT */}
            {/* ======================================================== */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                
                {/* Profile update details */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">UserProfile Info</h2>
                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 text-body-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Email Address (Read-Only)</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="px-3 py-1.5 bg-surface-container-low/50 border border-outline-variant rounded text-on-surface-variant/80 text-body-sm cursor-not-allowed select-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-primary text-on-primary font-bold py-1.5 rounded hover:bg-primary-fixed-variant transition-colors text-body-sm mt-2 disabled:bg-primary/50 self-start px-6 active:scale-95 transition-transform"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                </div>

                {/* MFA status toggle details */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm flex justify-between items-center">
                  <div className="flex flex-col gap-1 pr-6">
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Multi-Factor Authentication (MFA)</h2>
                    <p className="font-body-sm text-[11px] text-on-surface-variant leading-snug">
                      Require verification code prompts from auth apps like Google Authenticator when signing in.
                    </p>
                  </div>
                  <button
                    onClick={handleMfaToggle}
                    disabled={loading}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary
                      ${mfaEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out
                        ${mfaEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Document preservation variables */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm flex flex-col gap-5">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">System parameters</h2>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-body-sm">
                      <span className="font-medium text-on-surface-variant">Archive Period Threshold</span>
                      <span className="font-bold text-primary font-mono">{archivePeriod} Months</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="36"
                      value={archivePeriod}
                      onChange={(e) => handleArchivePeriodChange(Number(e.target.value))}
                      className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="h-px bg-outline-variant/60 w-full"></div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-body-sm">
                      <span className="font-medium text-on-surface-variant">Maximum File Size Upload constraints</span>
                      <span className="font-bold text-primary font-mono">{fileLimit} MB</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={fileLimit}
                      onChange={(e) => handleFileLimitChange(Number(e.target.value))}
                      className="w-full h-1 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* PRODUCT / SERVICE MASTER CATALOG TAB */}
            {/* ======================================================== */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                
                {/* Form configuration panel */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {editingProdId ? 'Edit Master Product / Service' : 'Add Product / Service to Master'}
                  </h2>
                  <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">SKU / Item ID (Unique)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., SOFT-CALC-PLUGIN" 
                        value={newProdSku}
                        onChange={(e) => setNewProdSku(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Product / Service Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Age Calculator Plugin" 
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Description / Details</label>
                      <textarea 
                        placeholder="Detail service parameters, features, delivery periods, etc." 
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        rows={2}
                        className="p-3 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Base Rate / Price</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="1500.00" 
                        value={newProdRate}
                        onChange={(e) => setNewProdRate(Number(e.target.value) || 0)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase">Unit (UOM)</label>
                        <select
                          value={newProdUnitId}
                          onChange={(e) => setNewProdUnitId(e.target.value)}
                          className="px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                        >
                          <option value="">No Unit</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.code} ({u.name})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase">Tax Policy</label>
                        <select
                          value={newProdTaxId}
                          onChange={(e) => setNewProdTaxId(e.target.value)}
                          className="px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                        >
                          <option value="">Exempt</option>
                          {taxes.map(t => (
                            <option key={t.id} value={t.id}>{t.code} ({Number(t.ratePercent)}%)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="col-span-2 flex gap-2 justify-start mt-2">
                      <button 
                        type="submit"
                        className="bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 px-6 rounded flex items-center justify-center shadow-sm select-none active:scale-95"
                      >
                        {editingProdId ? 'Save Product Changes' : 'Register Product / Service'}
                      </button>
                      {editingProdId && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingProdId(null);
                            setNewProdSku('');
                            setNewProdName('');
                            setNewProdDesc('');
                            setNewProdRate(0);
                            setNewProdUnitId('');
                            setNewProdTaxId('');
                          }}
                          className="bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors font-semibold h-8 px-4 rounded flex items-center justify-center select-none active:scale-95"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Master table listing */}
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3 w-[15%]">SKU</th>
                        <th className="p-3 w-[30%]">Product / Service</th>
                        <th className="p-3 w-[25%]">Description</th>
                        <th className="p-3 w-[12%] text-right">Price</th>
                        <th className="p-3 w-[10%] text-center">Unit</th>
                        <th className="p-3 w-[8%] text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="p-3 font-mono text-[11px] font-semibold truncate">{p.sku}</td>
                          <td className="p-3 font-bold truncate">{p.name}</td>
                          <td className="p-3 text-on-surface-variant font-normal truncate">{p.description || '—'}</td>
                          <td className="p-3 text-right font-mono text-primary font-bold">
                            ${Number(p.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-center text-on-surface-variant font-semibold">{p.unit?.code || '—'}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditProduct(p)}
                                className="text-on-surface-variant hover:text-primary transition-colors p-1"
                                title="Edit product"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1"
                                title="Delete product"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-on-surface-variant/70 italic bg-surface-container-lowest">
                            No product or service catalog entries registered in the master list.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TAX CONFIGURATION TAB */}
            {/* ======================================================== */}
            {activeTab === 'taxes' && (
              <div className="space-y-6">
                
                {/* Register new tax structure form */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Add Tax Policy Configuration</h2>
                  <form onSubmit={handleCreateTax} className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Tax Code (Unique)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., GST-18" 
                        value={newTaxCode}
                        onChange={(e) => setNewTaxCode(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Policy Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., India GST 18%" 
                        value={newTaxName}
                        onChange={(e) => setNewTaxName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Tax Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="18.0" 
                        value={newTaxRate}
                        onChange={(e) => setNewTaxRate(Number(e.target.value) || 0)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4 ml-2">
                      <input 
                        type="checkbox" 
                        checked={newTaxDefault}
                        onChange={(e) => setNewTaxDefault(e.target.checked)}
                        className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                      />
                      <label className="font-semibold text-on-surface-variant">Default Tax Type</label>
                    </div>

                    <button 
                      type="submit"
                      className="col-span-2 mt-2 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95"
                    >
                      Save Tax Policy
                    </button>
                  </form>
                </div>

                {/* Taxes catalog listing */}
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3">Tax Code</th>
                        <th className="p-3">Policy Name</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {taxes.map(t => (
                        <tr key={t.id} className="hover:bg-surface-container-lowest">
                          <td className="p-3 font-mono text-[11px] font-semibold">{t.code}</td>
                          <td className="p-3">{t.name}</td>
                          <td className="p-3 text-right font-mono text-primary font-bold">{t.ratePercent}%</td>
                          <td className="p-3 text-center">
                            {t.isDefault ? (
                              <span className="bg-primary-container text-on-primary-container font-bold text-[9px] px-1.5 py-0.5 rounded">Default</span>
                            ) : (
                              <span className="text-on-surface-variant/40 font-normal">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteTax(t.id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete tax rule"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* PAYMENT TERMS TAB */}
            {/* ======================================================== */}
            {activeTab === 'payment-terms' && (
              <div className="space-y-6">
                
                {/* Register payment schedule option */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Add Payment Term</h2>
                  <form onSubmit={handleCreateTerm} className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Term Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Net 30" 
                        value={newTermName}
                        onChange={(e) => setNewTermName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Days Due</label>
                      <input 
                        type="number" 
                        placeholder="30" 
                        value={newTermDays}
                        onChange={(e) => setNewTermDays(Number(e.target.value) || 0)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Description / Notes</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Payment must be processed within 30 calendar days." 
                        value={newTermDesc}
                        onChange={(e) => setNewTermDesc(e.target.value)}
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 ml-1">
                      <input 
                        type="checkbox" 
                        checked={newTermDefault}
                        onChange={(e) => setNewTermDefault(e.target.checked)}
                        className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                      />
                      <label className="font-semibold text-on-surface-variant">Default Payment Term</label>
                    </div>

                    <button 
                      type="submit"
                      className="col-span-2 mt-2 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95"
                    >
                      Save Payment Term
                    </button>
                  </form>
                </div>

                {/* Terms listing table */}
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3">Term Title</th>
                        <th className="p-3 text-right">Days Due</th>
                        <th className="p-3">Terms Description</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {terms.map(t => (
                        <tr key={t.id} className="hover:bg-surface-container-lowest">
                          <td className="p-3 font-semibold text-on-surface">{t.name}</td>
                          <td className="p-3 text-right font-mono text-primary font-bold">{t.daysDue} Days</td>
                          <td className="p-3 text-on-surface-variant font-normal">{t.description || '—'}</td>
                          <td className="p-3 text-center">
                            {t.isDefault ? (
                              <span className="bg-primary-container text-on-primary-container font-bold text-[9px] px-1.5 py-0.5 rounded">Default</span>
                            ) : (
                              <span className="text-on-surface-variant/40 font-normal">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteTerm(t.id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete schedule"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* CURRENCIES CONFIGURATION TAB */}
            {/* ======================================================== */}
            {activeTab === 'currencies' && (
              <div className="space-y-6">
                
                {/* Register currency exchange rate mapping */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Add Currency Mapping</h2>
                  <form onSubmit={handleCreateCurrency} className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Currency Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g., EUR" 
                        value={newCurrCode}
                        onChange={(e) => setNewCurrCode(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Symbol</label>
                      <input 
                        type="text" 
                        placeholder="e.g., €" 
                        value={newCurrSymbol}
                        onChange={(e) => setNewCurrSymbol(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Exchange Rate (vs USD)</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        placeholder="0.92" 
                        value={newCurrRate}
                        onChange={(e) => setNewCurrRate(Number(e.target.value) || 1.0)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Euro" 
                        value={newCurrName}
                        onChange={(e) => setNewCurrName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 ml-1">
                      <input 
                        type="checkbox" 
                        checked={newCurrDefault}
                        onChange={(e) => setNewCurrDefault(e.target.checked)}
                        className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                      />
                      <label className="font-semibold text-on-surface-variant">Default Workspace Currency</label>
                    </div>

                    <button 
                      type="submit"
                      className="col-span-2 mt-2 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95"
                    >
                      Save Currency
                    </button>
                  </form>
                </div>

                {/* Currency rates table */}
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3">Code</th>
                        <th className="p-3">Symbol</th>
                        <th className="p-3">Currency Name</th>
                        <th className="p-3 text-right">Exchange Rate</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {currencies.map(c => (
                        <tr key={c.id} className="hover:bg-surface-container-lowest">
                          <td className="p-3 font-mono text-[11px] font-semibold text-on-surface">{c.code}</td>
                          <td className="p-3 text-on-surface-variant font-bold text-headline-sm">{c.symbol}</td>
                          <td className="p-3 text-on-surface">{c.name}</td>
                          <td className="p-3 text-right font-mono text-primary font-bold">{c.exchangeRate}</td>
                          <td className="p-3 text-center">
                            {c.isDefault ? (
                              <span className="bg-primary-container text-on-primary-container font-bold text-[9px] px-1.5 py-0.5 rounded">Default</span>
                            ) : (
                              <span className="text-on-surface-variant/40 font-normal">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteCurrency(c.id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete Currency"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* UNITS UOM TAB */}
            {/* ======================================================== */}
            {activeTab === 'units' && (
              <div className="space-y-6">
                
                {/* UOM Unit metrics appender */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Add Unit of Measurement (UOM)</h2>
                  <form onSubmit={handleCreateUnit} className="grid grid-cols-2 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Unit Code</label>
                      <input 
                        type="text" 
                        placeholder="e.g., HR" 
                        value={newUnitCode}
                        onChange={(e) => setNewUnitCode(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Description Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Hour" 
                        value={newUnitName}
                        onChange={(e) => setNewUnitName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="col-span-2 mt-2 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95"
                    >
                      Save UOM Unit
                    </button>
                  </form>
                </div>

                {/* Units checklist */}
                <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="p-3">Unit Code</th>
                        <th className="p-3">UOM Description Name</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {units.map(u => (
                        <tr key={u.id} className="hover:bg-surface-container-lowest">
                          <td className="p-3 font-mono text-[11px] font-semibold text-on-surface">{u.code}</td>
                          <td className="p-3 text-on-surface-variant">{u.name}</td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteUnit(u.id)}
                              className="text-on-surface-variant hover:text-error transition-colors p-1"
                              title="Delete unit UOM"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* AUTO-NUMBERING TAB */}
            {/* ======================================================== */}
            {activeTab === 'numbering' && (
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Auto-Numbering Sequences</h2>
                <form onSubmit={handleSaveNumbering} className="space-y-4 text-body-sm">
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Document Type</label>
                    <select 
                      value={numType}
                      onChange={(e) => setNumType(e.target.value)}
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface-container-low text-body-sm focus:outline-none focus:ring-1 focus:ring-primary text-on-surface font-semibold"
                    >
                      <option value="INVOICE">Invoices</option>
                      <option value="PROPOSAL">Proposals</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Prefix Code</label>
                      <input 
                        type="text" 
                        value={numPrefix}
                        onChange={(e) => setNumPrefix(e.target.value)}
                        placeholder="e.g., INV-"
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Suffix Code</label>
                      <input 
                        type="text" 
                        value={numSuffix}
                        onChange={(e) => setNumSuffix(e.target.value)}
                        placeholder="e.g., -2026"
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Starting / Next Number</label>
                      <input 
                        type="number" 
                        value={numCurrent}
                        onChange={(e) => setNumCurrent(Number(e.target.value) || 1)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Digit Padding length</label>
                      <input 
                        type="number" 
                        value={numDigits}
                        onChange={(e) => setNumDigits(Number(e.target.value) || 4)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded p-3 text-body-sm font-semibold border border-outline-variant">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-bold">Sequence Preview Representation</span>
                    <span className="text-primary font-mono text-headline-sm block mt-1">
                      {numPrefix}{String(numCurrent).padStart(numDigits, '0')}{numSuffix}
                    </span>
                  </div>

                  <button 
                    type="submit"
                    className="bg-primary text-on-primary font-bold h-8 rounded px-6 hover:bg-primary-fixed-variant transition-colors text-body-sm shadow-sm select-none active:scale-95"
                  >
                    Save Auto-Numbering Setup
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* CUSTOMIZATION & WORKSPACE BUILDER TAB */}
            {/* ======================================================== */}
            {activeTab === 'customization' && (
              <div className="space-y-6">
                
                {/* 1. Custom Document Types Manager */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Custom Document Types</h2>
                  <p className="text-[11px] text-on-surface-variant leading-snug">Register dynamic document types that instantly inherit sequence auto-numbering and templates layouts.</p>
                  
                  <form onSubmit={handleCreateDocType} className="grid grid-cols-3 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Type Key</label>
                      <input 
                        type="text" 
                        placeholder="WORK_ORDER" 
                        value={newDocTypeName}
                        onChange={(e) => setNewDocTypeName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Display Label</label>
                      <input 
                        type="text" 
                        placeholder="Work Order" 
                        value={newDocTypeLabel}
                        onChange={(e) => setNewDocTypeLabel(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Prefix Code</label>
                      <input 
                        type="text" 
                        placeholder="WO-" 
                        value={newDocTypePrefix}
                        onChange={(e) => setNewDocTypePrefix(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-semibold"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="col-span-3 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95 mt-1"
                    >
                      Register Document Type
                    </button>
                  </form>

                  {/* Types list */}
                  <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-bright">
                    <table className="w-full text-left border-collapse text-body-sm">
                      <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                          <th className="p-2.5">Key</th>
                          <th className="p-2.5">Display Label</th>
                          <th className="p-2.5">Prefix Code</th>
                          <th className="p-2.5 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant font-semibold">
                        {customDocTypes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-center text-on-surface-variant/80 italic font-normal text-[11px]">No custom document types registered.</td>
                          </tr>
                        ) : (
                          customDocTypes.map(type => (
                            <tr key={type.id} className="hover:bg-surface-container-lowest text-[11px]">
                              <td className="p-2.5 font-mono text-primary">{type.name}</td>
                              <td className="p-2.5">{type.label}</td>
                              <td className="p-2.5 font-mono">{type.prefix}</td>
                              <td className="p-2.5 text-right">
                                <button 
                                  onClick={() => handleDeleteDocType(type.id)}
                                  className="text-on-surface-variant hover:text-error transition-colors p-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">delete</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Custom Fields Engine & Form layouts builder */}
                <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center select-none border-b border-outline-variant pb-2.5">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Dynamic Form Customizer</h2>
                      <p className="text-[11px] text-on-surface-variant leading-snug">Drag and configure dynamic metadata fields for company profiles, client portfolios, or invoice layouts.</p>
                    </div>
                    {/* Entity Switcher */}
                    <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant/60 font-semibold text-[10px]">
                      {(['COMPANY', 'CUSTOMER', 'DOCUMENT'] as const).map(entity => (
                        <button
                          key={entity}
                          type="button"
                          onClick={() => setActiveEntity(entity)}
                          className={`px-3 py-1 rounded transition-colors cursor-pointer
                            ${activeEntity === entity ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant'}`}
                        >
                          {entity}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form to add field */}
                  <form onSubmit={handleCreateField} className="grid grid-cols-2 md:grid-cols-4 gap-3 text-body-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Field Key Name</label>
                      <input 
                        type="text" 
                        placeholder="vat_number" 
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Display Label</label>
                      <input 
                        type="text" 
                        placeholder="VAT Tax Number" 
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        required
                        className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase">Field Type</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value)}
                        className="h-8 px-2 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm text-on-surface font-semibold"
                      >
                        <option value="TEXT">Short Text</option>
                        <option value="NUMBER">Numeric Number</option>
                        <option value="CURRENCY">Currency Amount</option>
                        <option value="DATE">Calendar Date</option>
                        <option value="DROPDOWN">Dropdown List</option>
                        <option value="CHECKBOX">Boolean Checkbox</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-4 ml-1">
                      <input 
                        type="checkbox" 
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                      />
                      <label className="font-semibold text-on-surface-variant">Required Field</label>
                    </div>
                    
                    {newFieldType === 'DROPDOWN' && (
                      <div className="col-span-2 md:col-span-4 flex flex-col gap-1">
                        <label className="text-[10px] text-on-surface-variant font-bold uppercase">Dropdown Options (Comma separated)</label>
                        <input 
                          type="text" 
                          placeholder="Standard, Premium, Enterprise" 
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm"
                        />
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="col-span-2 md:col-span-4 bg-primary text-on-primary hover:bg-primary-fixed-variant transition-colors font-bold h-8 rounded flex items-center justify-center shadow-sm select-none active:scale-95 mt-1"
                    >
                      Add Custom Form Field
                    </button>
                  </form>

                  <div className="h-px bg-outline-variant/60 w-full my-2"></div>

                  {/* Configured fields mapping & dynamic preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* List config */}
                    <div className="border border-outline-variant rounded-lg p-3 bg-surface-bright flex flex-col gap-2">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block select-none">Active Fields Registry</span>
                      <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px] custom-scrollbar">
                        {fieldConfigs.filter(f => f.entityType === activeEntity).length === 0 ? (
                          <div className="text-center text-[10px] text-on-surface-variant/80 italic py-6 select-none">No custom metadata fields registered for {activeEntity}.</div>
                        ) : (
                          fieldConfigs.filter(f => f.entityType === activeEntity).map(field => (
                            <div key={field.id} className="p-2 bg-surface border border-outline-variant rounded flex justify-between items-center text-[11px]">
                              <div>
                                <div className="font-bold text-on-surface">{field.fieldLabel}</div>
                                <div className="font-mono text-on-surface-variant/85 text-[10px] mt-0.5">{field.fieldName} • {field.fieldType} {field.isRequired && '• REQUIRED'}</div>
                              </div>
                              <button 
                                onClick={() => handleDeleteField(field.id)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Live layout rendering simulator */}
                    <div className="border border-outline-variant rounded-lg p-3 bg-surface-bright flex flex-col">
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block mb-3 select-none">Live published Form Preview</span>
                      <div className="flex-1 bg-surface border border-outline-variant/60 rounded p-4 flex flex-col gap-3 max-h-[220px] overflow-y-auto custom-scrollbar select-none opacity-85">
                        
                        {/* Standard default fields sample */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-on-surface-variant uppercase font-bold">Standard Name Identifier</label>
                          <div className="h-7 border border-outline-variant bg-surface-container-low rounded px-2.5 flex items-center text-on-surface-variant/60 text-[10px]">Pre-configured baseline input</div>
                        </div>

                        {/* Custom fields rendered dynamic sample */}
                        {fieldConfigs.filter(f => f.entityType === activeEntity).map(field => (
                          <div key={field.id} className="flex flex-col gap-1">
                            <label className="text-[9px] text-primary font-bold uppercase flex justify-between">
                              {field.fieldLabel} {field.isRequired && <span className="text-error font-semibold font-mono text-[9px]">*</span>}
                            </label>
                            {field.fieldType === 'DROPDOWN' ? (
                              <div className="h-7 border border-primary/30 bg-surface-container-low rounded px-2.5 flex items-center justify-between text-on-surface-variant/60 text-[10px]">
                                <span>Choose option...</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                              </div>
                            ) : field.fieldType === 'CHECKBOX' ? (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-3.5 h-3.5 border border-primary/40 rounded flex items-center justify-center"></div>
                                <span className="text-[10px] text-on-surface-variant/70">Checkbox choice</span>
                              </div>
                            ) : (
                              <div className="h-7 border border-primary/30 bg-surface-container-low rounded px-2.5 flex items-center text-on-surface-variant/60 text-[10px]">
                                {field.fieldType} inputs field
                              </div>
                            )}
                          </div>
                        ))}

                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* USER MANAGEMENT & RBAC TAB */}
            {/* ======================================================== */}
            {activeTab === 'users' && (
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">User Access & Role Matrix</h2>
                <p className="text-[11px] text-on-surface-variant leading-snug">Manage employee access, assign roles, and delegate permissions across the corporate workspace.</p>
                
                <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-bright">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                        <th className="p-3">User Email</th>
                        <th className="p-3">First Name</th>
                        <th className="p-3">Last Name</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-medium">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-surface-container-lowest text-[11px]">
                          <td className="p-3 font-semibold text-on-surface">{usr.email}</td>
                          <td className="p-3 text-on-surface-variant">{usr.firstName}</td>
                          <td className="p-3 text-on-surface-variant">{usr.lastName}</td>
                          <td className="p-3">
                            <select
                              value={usr.role}
                              onChange={(e) => handleChangeRole(usr.id, e.target.value)}
                              disabled={usr.id === user?.id}
                              className="h-7 px-1.5 bg-surface border border-outline-variant rounded text-[10px] font-bold text-on-surface cursor-pointer focus:outline-none"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="USER">USER</option>
                              <option value="AUDITOR">AUDITOR</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(usr.id)}
                              disabled={usr.id === user?.id}
                              className={`p-1 transition-colors ${usr.id === user?.id ? 'text-on-surface-variant/40 cursor-not-allowed' : 'text-on-surface-variant hover:text-error'}`}
                              title="Revoke access"
                            >
                              <span className="material-symbols-outlined text-[15px]">person_remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* AUDIT LOGS & COMPLIANCE TAB */}
            {/* ======================================================== */}
            {activeTab === 'audit' && (
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center select-none">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Compliance Audit Trail</h2>
                    <p className="text-[11px] text-on-surface-variant leading-snug">Track login status, database modifications, version updates, and admin overrides.</p>
                  </div>
                  <a
                    href={api.auditLogs.getExportUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3 bg-primary text-on-primary font-semibold text-label-md rounded flex items-center gap-1.5 hover:bg-primary-fixed-variant transition-colors shadow-sm active:scale-95 text-body-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Export CSV
                  </a>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 gap-3 text-body-sm bg-surface-container-low p-3 rounded-lg border border-outline-variant/60">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-on-surface-variant font-bold uppercase">Filter by Action</label>
                    <input 
                      type="text" 
                      placeholder="e.g. LOGIN_SUCCESS" 
                      value={auditActionFilter}
                      onChange={(e) => {
                        setAuditActionFilter(e.target.value);
                        setAuditPage(1);
                      }}
                      className="px-3 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm font-mono font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-on-surface-variant font-bold uppercase">Filter by User Email</label>
                    <input 
                      type="text" 
                      placeholder="e.g. alex@docflow.studio" 
                      value={auditEmailFilter}
                      onChange={(e) => {
                        setAuditEmailFilter(e.target.value);
                        setAuditPage(1);
                      }}
                      className="px-3 py-1 bg-surface border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-body-sm"
                    />
                  </div>
                </div>

                {/* Audit table list */}
                <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-bright">
                  <table className="w-full text-left border-collapse text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5">User</th>
                        <th className="p-2.5">Action Code</th>
                        <th className="p-2.5">Metadata Details</th>
                        <th className="p-2.5">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-semibold">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-on-surface-variant/80 italic font-normal text-[11px]">No audit trails recorded matching current query parameters.</td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-surface-container-lowest text-[10px]">
                            <td className="p-2.5 font-mono text-on-surface-variant">{new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td className="p-2.5 text-on-surface max-w-[120px] truncate" title={log.userEmail}>{log.userEmail}</td>
                            <td className="p-2.5"><span className="px-1.5 py-0.5 rounded font-mono text-[9px] bg-primary/10 text-primary uppercase font-bold">{log.action}</span></td>
                            <td className="p-2.5 text-on-surface-variant max-w-[200px] truncate" title={log.details}>{log.details || '-'}</td>
                            <td className="p-2.5 font-mono text-on-surface-variant">{log.ipAddress || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {auditPagesCount > 1 && (
                  <div className="flex justify-between items-center select-none text-[11px] pt-2 border-t border-outline-variant/60 font-semibold text-on-surface-variant">
                    <span>Showing page {auditPage} of {auditPagesCount} ({auditTotal} total records)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                        disabled={auditPage === 1}
                        className="px-2 py-1 border border-outline-variant rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setAuditPage(prev => Math.min(auditPagesCount, prev + 1))}
                        disabled={auditPage === auditPagesCount}
                        className="px-2 py-1 border border-outline-variant rounded hover:bg-surface-container disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* SYSTEM DIAGNOSTICS & HEALTH TAB */}
            {/* ======================================================== */}
            {activeTab === 'health' && systemHealth && (
              <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-sm space-y-4">
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">System Diagnostics & Node Uptime</h2>
                <p className="text-[11px] text-on-surface-variant leading-snug">Review server instance settings, memory allocation footprints, and database connectivity states.</p>
                
                <div className="grid grid-cols-3 gap-4">
                  {/* Database Card */}
                  <div className="border border-outline-variant p-4 rounded-lg bg-surface-bright flex flex-col gap-2 shadow-xs">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Database Connection</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${systemHealth.details.database === 'UP' ? 'bg-primary' : 'bg-error animate-pulse'}`}></span>
                      <span className="font-mono text-headline-sm font-semibold text-on-surface">
                        {systemHealth.details.database === 'UP' ? 'CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                  </div>

                  {/* Uptime Card */}
                  <div className="border border-outline-variant p-4 rounded-lg bg-surface-bright flex flex-col gap-2 shadow-xs">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Instance Uptime</span>
                    <span className="font-mono text-headline-sm font-semibold text-on-surface mt-1">
                      {Math.floor(systemHealth.uptimeSeconds / 60)}m {Math.floor(systemHealth.uptimeSeconds % 60)}s
                    </span>
                  </div>

                  {/* Memory Card */}
                  <div className="border border-outline-variant p-4 rounded-lg bg-surface-bright flex flex-col gap-2 shadow-xs">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">RSS Memory Usage</span>
                    <span className="font-mono text-headline-sm font-semibold text-on-surface mt-1">
                      {Math.round(systemHealth.details.memoryUsage.rss / 1024 / 1024)} MB
                    </span>
                  </div>
                </div>

                {/* Additional system properties */}
                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/60 font-semibold text-[11px] text-on-surface-variant space-y-2">
                  <div className="flex justify-between">
                    <span>Diagnostic Test Time:</span>
                    <span className="font-mono">{new Date(systemHealth.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Node.js Engine Version:</span>
                    <span className="font-mono">v22.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment Mode:</span>
                    <span className="font-mono text-primary font-bold">PRODUCTION</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right contextual inspector */}
        <ContextualInspector title="Security Profile">
          <div className="flex flex-col gap-4 text-body-sm select-none">
            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Access Scope</span>
              <span className="text-on-surface mt-0.5 font-semibold">{user?.role || 'USER'}</span>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Created At</span>
              <span className="text-on-surface mt-0.5">
                {user ? new Date(user.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '-'}
              </span>
            </div>

            <div className="h-px bg-outline-variant/60 w-full"></div>

            <div className="flex flex-col">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">MFA Security key</span>
              <span className="text-[11px] text-on-surface-variant font-mono bg-surface-container-low border border-outline-variant/60 px-2 py-1.5 rounded select-all mt-1">
                {mfaEnabled ? (user?.mfaSecret || 'Generating...') : 'Disabled'}
              </span>
            </div>
          </div>
        </ContextualInspector>

      </main>
    </MainLayout>
  );
}
