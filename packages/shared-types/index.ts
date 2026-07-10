export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR';
  mfaEnabled: boolean;
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
