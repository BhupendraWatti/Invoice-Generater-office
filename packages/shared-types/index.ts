export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR';
  mfaEnabled: boolean;
  mfaSecret?: string | null;
  createdAt: string;
}

export interface AuthResponseDto {
  token?: string;
  user?: UserDto;
  status: 'SUCCESS' | 'MFA_REQUIRED';
  mfaToken?: string;
}

export interface DocumentVersionDto {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  type: string; // Dynamic support for standard and custom document types
  customType?: string | null;
  status: 'DRAFT' | 'REVIEW' | 'COMPLETED' | 'ARCHIVED' | 'SENT' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
  fileUrl?: string;
  companyId?: string;
  customerId?: string;
  authorId: string;
  accentColor?: string | null;
  fontFamily?: string | null;
  showWatermark?: boolean;
  watermarkText?: string | null;
  showStamp?: boolean;
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
  blocks?: any[];
  versions?: DocumentVersionDto[];
}

export interface AddressDto {
  id: string;
  companyId?: string | null;
  customerId?: string | null;
  type: string; // "BILLING", "SHIPPING"
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  companyId?: string;
  customerId?: string;
  type: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface ContactDto {
  id: string;
  companyId?: string | null;
  customerId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactDto {
  companyId?: string;
  customerId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  isDefault?: boolean;
}

export interface BankAccountDto {
  id: string;
  companyId?: string | null;
  customerId?: string | null;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban?: string | null;
  bic?: string | null;
  isDefault: boolean;
  gstNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountDto {
  companyId?: string;
  customerId?: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  isDefault?: boolean;
  gstNumber?: string;
}

export interface CompanyDto {
  id: string;
  name: string;
  registrationNumber?: string | null;
  taxId?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  country: string;
  bankName?: string | null;
  bankIban?: string | null;
  bankBic?: string | null;
  customFields?: any | null;       // JSON representation
  gstRegistrations?: any | null;   // JSON array representation
  addresses?: AddressDto[];
  contacts?: ContactDto[];
  bankAccounts?: BankAccountDto[];
  branding?: any | null;           // CompanyBranding JSON override
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyDto {
  name: string;
  registrationNumber?: string;
  taxId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
  customFields?: any;
  gstRegistrations?: any;
}

export interface CustomerDto {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  status: string;
  customFields?: any | null;       // JSON representation
  gstRegistrations?: any | null;   // JSON array representation
  addresses?: AddressDto[];
  contacts?: ContactDto[];
  bankAccounts?: BankAccountDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  status?: string;
  customFields?: any;
  gstRegistrations?: any;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  rate: number;
  unitId?: string | null;
  taxId?: string | null;
  unit?: UnitDto | null;
  tax?: TaxConfigurationDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  description?: string;
  rate: number;
  unitId?: string;
  taxId?: string;
}

export interface UnitDto {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitDto {
  code: string;
  name: string;
}

export interface TaxConfigurationDto {
  id: string;
  name: string;
  ratePercent: number;
  code: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxConfigurationDto {
  name: string;
  ratePercent: number;
  code: string;
  isDefault?: boolean;
}

export interface PaymentTermDto {
  id: string;
  name: string;
  daysDue: number;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentTermDto {
  name: string;
  daysDue: number;
  description?: string;
  isDefault?: boolean;
}

export interface CurrencyDto {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurrencyDto {
  code: string;
  name: string;
  symbol: string;
  exchangeRate?: number;
  isDefault?: boolean;
}

export interface DocumentNumberingDto {
  id: string;
  documentType: string;
  prefix: string;
  suffix?: string | null;
  currentNumber: number;
  paddingDigits: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentNumberingDto {
  documentType: string;
  prefix: string;
  suffix?: string;
  currentNumber?: number;
  paddingDigits?: number;
}

export interface TagDto {
  id: string;
  name: string;
  color: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagDto {
  name: string;
  color: string;
  entityType: string;
}

export interface AttachmentDto {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  sizeBytes: number;
  uploaderId: string;
  documentId?: string | null;
  companyId?: string | null;
  customerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttachmentDto {
  filename: string;
  filepath: string;
  mimetype: string;
  sizeBytes: number;
  uploaderId: string;
  documentId?: string;
  companyId?: string;
  customerId?: string;
}

export interface NoteDto {
  id: string;
  content: string;
  authorId: string;
  companyId?: string | null;
  customerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  content: string;
  authorId: string;
  companyId?: string;
  customerId?: string;
}

export interface RenewalDto {
  id: string;
  documentId?: string | null;
  itemName: string;
  renewalType: 'SOFTWARE' | 'LEASE' | 'INSURANCE' | 'CONTRACT' | 'DOMAIN' | 'HOSTING' | 'SSL' | 'AMC' | 'MAINTENANCE';
  renewalDate: string;
  amount: number;
  status: string; // PENDING, COMPLETED, CANCELLED
  vendor?: string | null;
  purchaseDate?: string | null;
  gracePeriodDays: number;
  paymentStatus: string; // UNPAID, PAID, OVERDUE
  assignedEmployee?: string | null;
  notes?: string | null;
  emailId?: string | null;
  password?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDto {
  id: string;
  userId: string;
  actionType: 'EDIT' | 'COMMENT' | 'APPROVE' | 'REJECT' | 'SYSTEM';
  documentId?: string | null;
  details: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateActivityDto {
  userId: string;
  actionType: 'EDIT' | 'COMMENT' | 'APPROVE' | 'REJECT' | 'SYSTEM';
  documentId?: string;
  details: string;
}

export interface WorkspaceStatsDto {
  pendingReviewCount: number;
  approvedSevenDaysCount: number;
  storageUsedPercent: number;
}

export interface TemplateDto {
  id: string;
  name: string;
  category: 'INVOICE' | 'PROPOSAL' | 'CONTRACT';
  isDefault: boolean;
  accentColor: string;
  primaryFont: string;
  showPaymentStub: boolean;
  includeTermsPage: boolean;
  compactLineItems: boolean;
  lastEdited: string;
}

export interface ReminderLogDto {
  id: string;
  renewalId: string;
  daysBefore: number;
  sentAt: string;
  status: string;
  details?: string | null;
}

export interface EmailJobDto {
  id: string;
  recipient: string;
  subject: string;
  message: string;
  status: string; // PENDING, SENT, FAILED
  retryCount: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  type: string; // INFO, WARNING, SUCCESS, ERROR
  isRead: boolean;
  createdAt: string;
}

export interface RecurringConfigDto {
  id: string;
  documentId: string;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================================
 * Template Engine (Template Designer) — presentation-layer definitions.
 * These describe HOW an invoice/document is rendered to DOCX/PDF. They never
 * hold invoice data; invoice data stays owned by the Document APIs.
 * ========================================================================== */

export type TemplateCategory =
  | 'INVOICE'
  | 'PROPOSAL'
  | 'QUOTATION'
  | 'RECEIPT'
  | 'PURCHASE_ORDER'
  | 'PROFORMA_INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'AGREEMENT';

export type Align = 'left' | 'center' | 'right';

export interface TemplateMeta {
  id: string;
  name: string;
  category: TemplateCategory;
  isDefault: boolean;
  /** id of the template this one inherits from (deep-merged at resolve time). */
  extends?: string | null;
  description?: string;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageConfig {
  size: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number }; // points
}

export interface ThemeConfig {
  fonts: { heading: string; body: string; mono: string };
  baseFontSize: number; // points
  colors: {
    primary: string;
    text: string;
    muted: string;
    border: string;
    tableHeaderBg: string;
    tableHeaderText: string;
    zebraBg: string;
  };
}

export interface LogoConfig {
  enabled: boolean;
  position: Align;
  maxWidth: number; // points
  maxHeight: number; // points
  /** 'branding' pulls CompanyBranding.logoUrl; 'url' uses `url`. */
  source: 'branding' | 'url';
  url?: string;
}

export interface HeaderConfig {
  showTitle: boolean;
  /** Supports tokens like {document.type}. */
  titleText: string;
  showDocMeta: boolean;
  accentBar: boolean; // colored bar under header
}

export interface FieldConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface OrganizationConfig {
  showHeading: boolean;
  heading: string;
  fields: FieldConfig[]; // name, addressLine1, city, taxId, gst, email, phone...
}

export interface CustomerConfig {
  showBillTo: boolean;
  billToHeading: string;
  showShipTo: boolean;
  shipToHeading: string;
  fields: FieldConfig[];
}

export interface DocumentDetailsConfig {
  show: boolean;
  fields: FieldConfig[]; // number, date, dueDate, terms, reference...
}

export interface TableColumnConfig {
  key: 'index' | 'sku' | 'description' | 'quantity' | 'unit' | 'rate' | 'tax' | 'amount' | string;
  label: string;
  visible: boolean;
  width: number; // percentage of table width
  align: Align;
  order: number;
}

export interface TableConfig {
  columns: TableColumnConfig[];
  zebra: boolean;
  showBorders: boolean;
  compact: boolean;
}

export interface TotalRowConfig {
  key: 'subtotal' | 'discount' | 'tax' | 'shipping' | 'adjustment' | 'grandTotal' | string;
  label: string;
  visible: boolean;
  order: number;
  emphasis: boolean;
}

export interface TotalsConfig {
  rows: TotalRowConfig[];
  showAmountInWords: boolean;
}

export interface PaymentConfig {
  show: boolean;
  heading: string;
  instructions: string;
}

export interface BankConfig {
  show: boolean;
  heading: string;
  /** 'company' pulls from the linked company's bank fields. */
  source: 'company' | 'custom';
  fields: FieldConfig[];
  custom?: Record<string, string>;
}

export interface NotesConfig {
  show: boolean;
  heading: string;
  text: string; // default when the document has no NOTES block
}

export interface SignatureConfig {
  show: boolean;
  label: string;
  /** 'branding' uses CompanyBranding.signatures[0]. */
  source: 'branding' | 'none';
  showStamp: boolean;
}

export interface WatermarkConfig {
  enabled: boolean;
  text: string;
  opacity: number; // 0..1
  angle: number; // degrees
}

export interface FooterConfig {
  show: boolean;
  text: string;
  showPageNumbers: boolean;
}

export interface FooterBlockConfig {
  key: string; // 'payment' | 'bank' | 'qr' | 'signature' | 'footer'
  label: string;
  visible: boolean;
  order: number;
}

export interface TemplateDefinitionDto {
  meta: TemplateMeta;
  page: PageConfig;
  theme: ThemeConfig;
  logo: LogoConfig;
  header: HeaderConfig;
  organization: OrganizationConfig;
  customer: CustomerConfig;
  documentDetails: DocumentDetailsConfig;
  table: TableConfig;
  totals: TotalsConfig;
  payment: PaymentConfig;
  bank: BankConfig;
  notes: NotesConfig;
  signature: SignatureConfig;
  watermark: WatermarkConfig;
  footer: FooterConfig;
  footerBlocks?: FooterBlockConfig[];
}

/** Partial template as persisted for a child template (only overrides + meta). */
export type TemplateDefinitionInput = { meta: Partial<TemplateMeta> & { name: string } } & Partial<
  Omit<TemplateDefinitionDto, 'meta'>
>;

/* ---- Normalized invoice view-model produced by the mapper (render input) ---- */

export interface InvoiceLineItem {
  index: number;
  sku: string;
  description: string;
  type?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxLabel: string;
  taxRate: number;
  taxAmount: number;
  amount: number; // quantity * rate
  customFields?: any;
}

export interface InvoiceParty {
  name: string;
  lines: string[]; // formatted address / contact lines
  taxId?: string;
  gst?: string;
  email?: string;
  phone?: string;
  website?: string;
  cin?: string;
  pan?: string;
}

export interface InvoiceData {
  documentId: string;
  documentType: string;
  documentNumber: string;
  title: string;
  status: string;
  issueDate: string;
  dueDate?: string;
  currencySymbol: string;
  organization: InvoiceParty;
  billTo: InvoiceParty;
  shipTo?: InvoiceParty;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  shipping: number;
  adjustment: number;
  grandTotal: number;
  notes: string;
  bank?: { bankName?: string; accountHolder?: string; accountNumber?: string; iban?: string; bic?: string; gstNumber?: string };
  logoUrl?: string;
  qrUrl?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

export interface RenderResponseDto {
  success: boolean;
  filename: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

export interface CustomFieldConfigDto {
  id: string;
  entityType: 'COMPANY' | 'CUSTOMER' | 'DOCUMENT';
  fieldName: string;
  fieldLabel: string;
  fieldType: string; // TEXT, NUMBER, CURRENCY, DATE, DROPDOWN, CHECKBOX, RADIO, MULTI_SELECT etc.
  validation?: string | null;
  isRequired: boolean;
  options?: string | null;
  createdAt: string;
}

export interface CustomDocumentTypeDto {
  id: string;
  name: string;
  label: string;
  prefix: string;
  description?: string | null;
  createdAt: string;
}

export interface WorkspacePreferenceSettingsDto {
  id: string;
  userId: string;
  densityMode: 'COMPACT' | 'DEFAULT' | 'COMFORTABLE';
  theme: 'LIGHT' | 'DARK';
  shortcuts?: string | null; // JSON String
  savedViews?: string | null; // JSON String
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBrandingDto {
  id: string;
  companyId: string;
  logoUrl?: string | null;
  signatures?: any | null; // JSON Array
  stamps?: any | null; // JSON Array
  letterhead?: string | null;
  primaryColor: string;
  fontFamily: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDto {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: string | null;
  createdAt: string;
}

// ========================================================
// Shared Document Rendering Pipeline Utilities and Types
// ========================================================

export function formatCurrency(amount: number, symbol: string): string {
  const sym = symbol === '₹' ? 'Rs. ' : symbol;
  return `${sym}${Number(amount).toFixed(2)}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export function replaceTokens(text: string, data: InvoiceData): string {
  if (!text) return '';
  return text
    .replace(/{document.number}/g, data.documentNumber || '')
    .replace(/{document.type}/g, data.documentType || 'INVOICE')
    .replace(/{document.grandTotal}/g, formatCurrency(data.grandTotal, data.currencySymbol))
    .replace(/{company.name}/g, data.organization.name || '')
    .replace(/{customer.name}/g, data.billTo.name || '');
}

export function normalizeColumnWidths(columns: any[]): any[] {
  const visibleCols = columns.filter(c => c.visible);
  const totalWidth = visibleCols.reduce((sum, col) => sum + (col.width || 10), 0);
  if (totalWidth <= 0) return visibleCols;
  return visibleCols.map(col => ({
    ...col,
    width: Math.round(((col.width || 10) / totalWidth) * 100 * 100) / 100
  }));
}

export function resolveColumnValue(item: any, colKey: string, currencySymbol: string): string {
  // 1. Built-in fields
  if (colKey === 'index') return String(item.index);
  if (colKey === 'sku') return item.sku || '';
  if (colKey === 'description') return item.description || '';
  if (colKey === 'type') return item.type || '';
  if (colKey === 'quantity') return String(item.quantity || 0);
  if (colKey === 'unit') return item.unit || 'PCS';
  if (colKey === 'rate') return formatCurrency(item.rate || 0, currencySymbol);
  if (colKey === 'tax') return item.taxLabel || 'EXEMPT';
  if (colKey === 'amount') return formatCurrency(item.amount || 0, currencySymbol);

  // 2. Mapped root fields
  if (item && colKey in item) return String(item[colKey] ?? '');

  // 3. Custom fields
  if (item && item.customFields && colKey in item.customFields) {
    return String(item.customFields[colKey] ?? '');
  }

  // 4. Fallback
  return '';
}

export interface SharedRenderModel {
  theme: any;
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;
    angle: number;
  };
  header: {
    showTitle: boolean;
    titleText: string;
    accentBar: boolean;
  };
  logo: {
    enabled: boolean;
    position: string;
    maxWidth: number;
    url?: string;
  };
  metadata: {
    fields: Array<{ key: string; label: string; value: string }>;
  };
  company: {
    name: string;
    lines: string[];
    fields: Array<{ key: string; label: string; value: string }>;
  };
  customer: {
    showBillTo: boolean;
    heading: string;
    name: string;
    lines: string[];
    fields: Array<{ key: string; label: string; value: string }>;
  };
  table: {
    columns: Array<{ key: string; label: string; width: number; align: 'left' | 'center' | 'right'; visible: boolean; order: number }>;
    rows: Array<{
      index: number;
      cells: Record<string, string>;
      rawItem: any;
    }>;
    showBorders: boolean;
    zebra: boolean;
  };
  totals: {
    rows: Array<{ key: string; label: string; value: string; emphasis: boolean }>;
  };
  notes: {
    show: boolean;
    heading: string;
    text: string;
  };
  footerBlocks: Array<{
    key: string;
    label: string;
    order: number;
    visible: boolean;
    data: any;
  }>;
}

export function buildRenderModel(data: InvoiceData, template: TemplateDefinitionDto): SharedRenderModel {
  // Format metadata
  const metadataFields: Array<{ key: string; label: string; value: string }> = [];
  if (template.documentDetails.show) {
    const sortedMetaFields = [...(template.documentDetails.fields || [])].sort((a, b) => a.order - b.order);
    sortedMetaFields.forEach(f => {
      if (!f.visible) return;
      let textVal = '';
      if (f.key === 'number') textVal = data.documentNumber;
      else if (f.key === 'date') textVal = formatDate(data.issueDate);
      else if (f.key === 'dueDate' && data.dueDate) textVal = formatDate(data.dueDate);
      else if (f.key === 'terms') textVal = 'Due on Receipt';

      if (textVal) {
        metadataFields.push({ key: f.key, label: f.label, value: textVal });
      }
    });
  }

  // Format company fields
  const companyFields: Array<{ key: string; label: string; value: string }> = [];
  if (data.organization.email) companyFields.push({ key: 'email', label: 'Email', value: data.organization.email });
  if (data.organization.website) companyFields.push({ key: 'website', label: 'Website', value: data.organization.website });
  if (data.organization.phone) companyFields.push({ key: 'phone', label: 'Phone', value: data.organization.phone });
  if (data.organization.taxId) companyFields.push({ key: 'taxId', label: 'GSTIN/VAT', value: data.organization.taxId });
  if (data.organization.cin) companyFields.push({ key: 'cin', label: 'CIN', value: data.organization.cin });
  if (data.organization.pan) companyFields.push({ key: 'pan', label: 'PAN', value: data.organization.pan });

  // Format customer fields
  const customerFields: Array<{ key: string; label: string; value: string }> = [];
  if (data.billTo.phone) customerFields.push({ key: 'phone', label: 'Phone', value: data.billTo.phone });
  if (data.billTo.email) customerFields.push({ key: 'email', label: 'Email', value: data.billTo.email });
  if (data.billTo.taxId) customerFields.push({ key: 'taxId', label: 'GSTIN/VAT', value: data.billTo.taxId });

  // Normalize column widths and build cells
  const normalizedColumns = normalizeColumnWidths(template.table.columns).sort((a, b) => a.order - b.order);
  const rows = data.items.map((item, index) => {
    const cells: Record<string, string> = {};
    normalizedColumns.forEach(col => {
      cells[col.key] = resolveColumnValue(item, col.key, data.currencySymbol);
    });
    return {
      index: item.index || (index + 1),
      cells,
      rawItem: item
    };
  });

  // Build totals
  const sortedTotalsRows = [...(template.totals.rows || [])]
    .filter(r => r.visible)
    .sort((a, b) => a.order - b.order);
  const totals = sortedTotalsRows.map(row => {
    let val = 0;
    if (row.key === 'subtotal') val = data.subtotal;
    else if (row.key === 'discount') val = data.discount;
    else if (row.key === 'tax') val = data.taxTotal;
    else if (row.key === 'shipping') val = data.shipping;
    else if (row.key === 'grandTotal') val = data.grandTotal;

    return {
      key: row.key,
      label: row.label,
      value: formatCurrency(val, data.currencySymbol),
      emphasis: row.emphasis
    };
  });

  // Build footer blocks
  const footerBlocksConfigs = [...(template.footerBlocks || [
    { key: 'payment', label: 'Payment Instructions', visible: template.payment?.show ?? true, order: 0 },
    { key: 'bank', label: 'Bank Details', visible: template.bank?.show ?? true, order: 1 },
    { key: 'qr', label: 'QR Code', visible: true, order: 2 },
    { key: 'signature', label: 'Signature', visible: template.signature?.show ?? true, order: 3 },
    { key: 'footer', label: 'Footer Declaration', visible: template.footer?.show ?? true, order: 4 }
  ])];

  const activeFooterBlocks = footerBlocksConfigs
    .filter(b => b.visible)
    .sort((a, b) => a.order - b.order)
    .map(block => {
      let blockData: any = {};
      if (block.key === 'payment') {
        blockData = {
          show: template.payment.show,
          heading: template.payment.heading || 'Payment Instructions',
          instructions: template.payment.instructions
        };
      } else if (block.key === 'bank') {
        const fields = (template.bank.fields || []).filter(f => f.visible).map(f => {
          let txt = '';
          if (f.key === 'bankName') txt = data.bank?.bankName || '';
          else if (f.key === 'accountHolder') txt = data.bank?.accountHolder || '';
          else if (f.key === 'accountNumber') txt = data.bank?.accountNumber || '';
          else if (f.key === 'iban') txt = data.bank?.iban || '';
          else if (f.key === 'bic') txt = data.bank?.bic || '';
          return { key: f.key, label: f.label, value: txt };
        }).filter(f => f.value);
        blockData = {
          show: template.bank.show,
          heading: template.bank.heading || 'Bank Details',
          fields
        };
      } else if (block.key === 'qr') {
        blockData = {
          show: !!data.qrUrl,
          url: data.qrUrl
        };
      } else if (block.key === 'signature') {
        blockData = {
          show: template.signature.show,
          label: template.signature.label || 'Authorised Signatory',
          signatureUrl: data.signatureUrl,
          stampUrl: data.stampUrl,
          showStamp: template.signature.showStamp
        };
      } else if (block.key === 'footer') {
        blockData = {
          show: template.footer.show,
          text: template.footer.text,
          showPageNumbers: template.footer.showPageNumbers
        };
      }
      return {
        key: block.key,
        label: block.label,
        order: block.order,
        visible: block.visible,
        data: blockData
      };
    });

  return {
    theme: template.theme,
    watermark: {
      enabled: template.watermark.enabled,
      text: template.watermark.text || '',
      opacity: template.watermark.opacity || 0.1,
      angle: template.watermark.angle || 45
    },
    header: {
      showTitle: template.header.showTitle,
      titleText: replaceTokens(template.header.titleText, data),
      accentBar: template.header.accentBar
    },
    logo: {
      enabled: template.logo.enabled,
      position: template.logo.position || 'left',
      maxWidth: template.logo.maxWidth || 120,
      url: data.logoUrl
    },
    metadata: {
      fields: metadataFields
    },
    company: {
      name: data.organization.name,
      lines: data.organization.lines,
      fields: companyFields
    },
    customer: {
      showBillTo: template.customer.showBillTo,
      heading: template.customer.billToHeading,
      name: data.billTo.name,
      lines: data.billTo.lines,
      fields: customerFields
    },
    table: {
      columns: normalizedColumns,
      rows,
      showBorders: template.table.showBorders,
      zebra: template.table.zebra
    },
    totals: {
      rows: totals
    },
    notes: {
      show: template.notes.show,
      heading: template.notes.heading || 'Notes',
      text: data.notes || template.notes.text || ''
    },
    footerBlocks: activeFooterBlocks
  };
}

