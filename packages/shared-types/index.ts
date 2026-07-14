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
}

export interface InvoiceParty {
  name: string;
  lines: string[]; // formatted address / contact lines
  taxId?: string;
  gst?: string;
  email?: string;
  phone?: string;
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
