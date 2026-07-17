import {
  UserDto,
  AuthResponseDto,
  DocumentDto,
  CompanyDto,
  CreateCompanyDto,
  CustomerDto,
  CreateCustomerDto,
  RenewalDto,
  ActivityDto,
  WorkspaceStatsDto,
  TemplateDto,
  ProductDto,
  CreateProductDto,
  UnitDto,
  CreateUnitDto,
  TaxConfigurationDto,
  CreateTaxConfigurationDto,
  PaymentTermDto,
  CreatePaymentTermDto,
  CurrencyDto,
  CreateCurrencyDto,
  DocumentNumberingDto,
  CreateDocumentNumberingDto,
  TagDto,
  CreateTagDto,
  NoteDto,
  CreateNoteDto,
  AttachmentDto,
  CreateAttachmentDto,
  NotificationDto,
  EmailJobDto,
  CustomFieldConfigDto,
  CustomDocumentTypeDto,
  WorkspacePreferenceSettingsDto,
  CompanyBrandingDto,
  TemplateDefinitionDto,
  TemplateDefinitionInput,
  InvoiceData,
  RenderResponseDto,
} from '@docflow/shared-types';

let API_BASE_URL = 'http://localhost:3001/api';

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname.includes('sales.granthinfotech.in')) {
    API_BASE_URL = 'https://apisales.granthinfotech.in/api';
  }
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export function setCookie(name: string, value: string, days = 7) {
  if (typeof window === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/; SameSite=Strict; Secure`;
}

export function eraseCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Strict; Secure`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getCookie('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      eraseCookie('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    const errorText = await response.text();
    let errorMessage = 'An error occurred';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: async (email: string, pass: string): Promise<AuthResponseDto> => {
      const res = await request<AuthResponseDto>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, pass }),
      });
      if (res.status === 'SUCCESS' && res.token) {
        setCookie('token', res.token);
      }
      return res;
    },
    verifyMfa: async (mfaToken: string, code: string): Promise<AuthResponseDto> => {
      const res = await request<AuthResponseDto>('/auth/verify-mfa', {
        method: 'POST',
        body: JSON.stringify({ mfaToken, code }),
      });
      if (res.status === 'SUCCESS' && res.token) {
        setCookie('token', res.token);
      }
      return res;
    },
    logout: () => {
      eraseCookie('token');
    },
    getProfile: async (): Promise<UserDto> => {
      return request<UserDto>('/users/me');
    },
    updateSettings: async (data: { firstName?: string; lastName?: string; mfaEnabled?: boolean }): Promise<UserDto> => {
      return request<UserDto>('/users/me/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },
  companies: {
    list: async (): Promise<CompanyDto[]> => {
      return request<CompanyDto[]>('/companies');
    },
    get: async (id: string): Promise<CompanyDto & { _count: { documents: number; customers: number } }> => {
      return request<CompanyDto & { _count: { documents: number; customers: number } }>(`/companies/${id}`);
    },
    create: async (data: CreateCompanyDto): Promise<CompanyDto> => {
      return request<CompanyDto>('/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreateCompanyDto>): Promise<CompanyDto> => {
      return request<CompanyDto>(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<CompanyDto> => {
      return request<CompanyDto>(`/companies/${id}`, {
        method: 'DELETE',
      });
    },
  },
  customers: {
    list: async (companyId?: string): Promise<CustomerDto[]> => {
      const url = companyId ? `/customers?companyId=${companyId}` : '/customers';
      return request<CustomerDto[]>(url);
    },
    get: async (id: string): Promise<CustomerDto & { company: CompanyDto; _count: { documents: number } }> => {
      return request<CustomerDto & { company: CompanyDto; _count: { documents: number } }>(`/customers/${id}`);
    },
    create: async (data: CreateCustomerDto): Promise<CustomerDto> => {
      return request<CustomerDto>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreateCustomerDto>): Promise<CustomerDto> => {
      return request<CustomerDto>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<CustomerDto> => {
      return request<CustomerDto>(`/customers/${id}`, {
        method: 'DELETE',
      });
    },
  },
  documents: {
    list: async (filters: { companyId?: string; customerId?: string; limit?: number } = {}): Promise<DocumentDto[]> => {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.limit) params.append('limit', String(filters.limit));
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<DocumentDto[]>(`/documents${query}`);
    },
    get: async (id: string): Promise<DocumentDto & { blocks: Array<{ sortOrder: number; blockType: string; content: string }>; company?: CompanyDto; customer?: CustomerDto; author: UserDto }> => {
      return request<DocumentDto & { blocks: Array<{ sortOrder: number; blockType: string; content: string }>; company?: CompanyDto; customer?: CustomerDto; author: UserDto }>(`/documents/${id}`);
    },
    create: async (data: { title: string; type: string; companyId?: string; customerId?: string }): Promise<DocumentDto> => {
      return request<DocumentDto>('/documents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: { title?: string; companyId?: string | null; customerId?: string | null; accentColor?: string | null; fontFamily?: string | null; showWatermark?: boolean; watermarkText?: string | null; showStamp?: boolean; templateId?: string | null }): Promise<DocumentDto> => {
      return request<DocumentDto>(`/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    updateBlocks: async (id: string, blocks: Array<{ sortOrder: number; blockType: string; content: string }>): Promise<DocumentDto> => {
      return request<DocumentDto>(`/documents/${id}/blocks`, {
        method: 'PUT',
        body: JSON.stringify({ blocks }),
      });
    },
    updateStatus: async (id: string, status: string): Promise<DocumentDto> => {
      return request<DocumentDto>(`/documents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    getStats: async (): Promise<WorkspaceStatsDto> => {
      return request<WorkspaceStatsDto>('/documents/stats');
    },
    duplicate: async (id: string): Promise<DocumentDto> => {
      return request<DocumentDto>(`/documents/${id}/duplicate`, {
        method: 'POST',
      });
    },
    listVersions: async (id: string): Promise<any[]> => {
      return request<any[]>(`/documents/${id}/versions`);
    },
    saveVersion: async (id: string, title: string): Promise<any> => {
      return request<any>(`/documents/${id}/versions`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },
    restoreVersion: async (id: string, versionId: string): Promise<any> => {
      return request<any>(`/documents/${id}/versions/${versionId}/restore`, {
        method: 'POST',
      });
    },
    generatePdf: async (id: string): Promise<{ success: boolean; filename: string; mimeType: string; base64: string; sizeBytes: number }> => {
      return request<{ success: boolean; filename: string; mimeType: string; base64: string; sizeBytes: number }>(`/documents/${id}/pdf`);
    },
    sendEmail: async (id: string, recipient: string, subject: string, message: string): Promise<{ success: boolean; messageId: string; recipient: string; sentAt: string }> => {
      return request<{ success: boolean; messageId: string; recipient: string; sentAt: string }>(`/documents/${id}/email`, {
        method: 'POST',
        body: JSON.stringify({ recipient, subject, message }),
      });
    },
    delete: async (id: string): Promise<DocumentDto> => {
      return request<DocumentDto>(`/documents/${id}`, {
        method: 'DELETE',
      });
    },
  },
  renewals: {
    list: async (): Promise<RenewalDto[]> => {
      return request<RenewalDto[]>('/renewals');
    },
    create: async (data: any): Promise<RenewalDto> => {
      return request<RenewalDto>('/renewals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: any): Promise<RenewalDto> => {
      return request<RenewalDto>(`/renewals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    updateStatus: async (id: string, status: string): Promise<RenewalDto> => {
      return request<RenewalDto>(`/renewals/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    delete: async (id: string): Promise<RenewalDto> => {
      return request<RenewalDto>(`/renewals/${id}`, {
        method: 'DELETE',
      });
    },
    bulkUpdate: async (updates: Array<{ id: string; data: any }>): Promise<any> => {
      return request<any>('/renewals/bulk', {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
    },
  },
  notifications: {
    list: async (): Promise<NotificationDto[]> => {
      return request<NotificationDto[]>('/notifications');
    },
    markAsRead: async (id: string): Promise<NotificationDto> => {
      return request<NotificationDto>(`/notifications/${id}/read`, {
        method: 'POST',
      });
    },
    markAllAsRead: async (): Promise<any> => {
      return request<any>('/notifications/read-all', {
        method: 'POST',
      });
    },
  },
  emails: {
    listJobs: async (): Promise<EmailJobDto[]> => {
      return request<EmailJobDto[]>('/emails/jobs');
    },
    retryJob: async (id: string): Promise<EmailJobDto> => {
      return request<EmailJobDto>(`/emails/jobs/${id}/retry`, {
        method: 'POST',
      });
    },
    processQueue: async (): Promise<any> => {
      return request<any>('/emails/jobs/process', {
        method: 'POST',
      });
    },
  },
  customization: {
    listFields: async (entityType?: string): Promise<CustomFieldConfigDto[]> => {
      const url = entityType ? `/customization/fields?entityType=${entityType}` : '/customization/fields';
      return request<CustomFieldConfigDto[]>(url);
    },
    createField: async (data: any): Promise<CustomFieldConfigDto> => {
      return request<CustomFieldConfigDto>('/customization/fields', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    deleteField: async (id: string): Promise<any> => {
      return request<any>(`/customization/fields/${id}`, {
        method: 'DELETE',
      });
    },
    listTypes: async (): Promise<CustomDocumentTypeDto[]> => {
      return request<CustomDocumentTypeDto[]>('/customization/types');
    },
    createType: async (data: any): Promise<CustomDocumentTypeDto> => {
      return request<CustomDocumentTypeDto>('/customization/types', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    deleteType: async (id: string): Promise<any> => {
      return request<any>(`/customization/types/${id}`, {
        method: 'DELETE',
      });
    },
    getPreferences: async (): Promise<WorkspacePreferenceSettingsDto> => {
      return request<WorkspacePreferenceSettingsDto>('/customization/preferences');
    },
    updatePreferences: async (data: any): Promise<WorkspacePreferenceSettingsDto> => {
      return request<WorkspacePreferenceSettingsDto>('/customization/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    getBranding: async (companyId: string): Promise<CompanyBrandingDto> => {
      return request<CompanyBrandingDto>(`/customization/branding/${companyId}`);
    },
    updateBranding: async (companyId: string, data: any): Promise<CompanyBrandingDto> => {
      return request<CompanyBrandingDto>(`/customization/branding/${companyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },
  activities: {
    list: async (limit?: number): Promise<ActivityDto[]> => {
      const url = limit ? `/activities?limit=${limit}` : '/activities';
      return request<ActivityDto[]>(url);
    },
    create: async (data: { actionType: string; documentId?: string; details: string }): Promise<ActivityDto> => {
      return request<ActivityDto>('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
  templates: {
    list: async (): Promise<TemplateDto[]> => {
      return request<TemplateDto[]>('/templates');
    },
    get: async (id: string): Promise<TemplateDto> => {
      return request<TemplateDto>(`/templates/${id}`);
    },
    create: async (data: Omit<TemplateDto, 'id' | 'lastEdited'>): Promise<TemplateDto> => {
      return request<TemplateDto>('/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<Omit<TemplateDto, 'id' | 'lastEdited'>>): Promise<TemplateDto> => {
      return request<TemplateDto>(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<TemplateDto> => {
      return request<TemplateDto>(`/templates/${id}`, {
        method: 'DELETE',
      });
    },
  },
  settings: {
    getSystem: async (): Promise<{ archivePeriodMonths: number; maxFileSizeMb: number }> => {
      return request<{ archivePeriodMonths: number; maxFileSizeMb: number }>('/settings/system');
    },
    updateSystem: async (data: { archivePeriodMonths?: number; maxFileSizeMb?: number }): Promise<{ archivePeriodMonths: number; maxFileSizeMb: number }> => {
      return request<{ archivePeriodMonths: number; maxFileSizeMb: number }>('/settings/system', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },
  products: {
    list: async (): Promise<ProductDto[]> => {
      return request<ProductDto[]>('/products');
    },
    get: async (id: string): Promise<ProductDto> => {
      return request<ProductDto>(`/products/${id}`);
    },
    create: async (data: CreateProductDto): Promise<ProductDto> => {
      return request<ProductDto>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreateProductDto>): Promise<ProductDto> => {
      return request<ProductDto>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<ProductDto> => {
      return request<ProductDto>(`/products/${id}`, {
        method: 'DELETE',
      });
    },
  },
  units: {
    list: async (): Promise<UnitDto[]> => {
      return request<UnitDto[]>('/units');
    },
    create: async (data: CreateUnitDto): Promise<UnitDto> => {
      return request<UnitDto>('/units', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<UnitDto> => {
      return request<UnitDto>(`/units/${id}`, {
        method: 'DELETE',
      });
    },
  },
  taxes: {
    list: async (): Promise<TaxConfigurationDto[]> => {
      return request<TaxConfigurationDto[]>('/taxes');
    },
    create: async (data: CreateTaxConfigurationDto): Promise<TaxConfigurationDto> => {
      return request<TaxConfigurationDto>('/taxes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreateTaxConfigurationDto>): Promise<TaxConfigurationDto> => {
      return request<TaxConfigurationDto>(`/taxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<TaxConfigurationDto> => {
      return request<TaxConfigurationDto>(`/taxes/${id}`, {
        method: 'DELETE',
      });
    },
  },
  currencies: {
    list: async (): Promise<CurrencyDto[]> => {
      return request<CurrencyDto[]>('/currencies');
    },
    create: async (data: CreateCurrencyDto): Promise<CurrencyDto> => {
      return request<CurrencyDto>('/currencies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreateCurrencyDto>): Promise<CurrencyDto> => {
      return request<CurrencyDto>(`/currencies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<CurrencyDto> => {
      return request<CurrencyDto>(`/currencies/${id}`, {
        method: 'DELETE',
      });
    },
  },
  paymentTerms: {
    list: async (): Promise<PaymentTermDto[]> => {
      return request<PaymentTermDto[]>('/payment-terms');
    },
    create: async (data: CreatePaymentTermDto): Promise<PaymentTermDto> => {
      return request<PaymentTermDto>('/payment-terms', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string, data: Partial<CreatePaymentTermDto>): Promise<PaymentTermDto> => {
      return request<PaymentTermDto>(`/payment-terms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<PaymentTermDto> => {
      return request<PaymentTermDto>(`/payment-terms/${id}`, {
        method: 'DELETE',
      });
    },
  },
  numberings: {
    list: async (): Promise<DocumentNumberingDto[]> => {
      return request<DocumentNumberingDto[]>('/numberings');
    },
    save: async (data: CreateDocumentNumberingDto): Promise<DocumentNumberingDto> => {
      return request<DocumentNumberingDto>('/numberings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
  notes: {
    list: async (params: { companyId?: string; customerId?: string }): Promise<NoteDto[]> => {
      const q = new URLSearchParams();
      if (params.companyId) q.append('companyId', params.companyId);
      if (params.customerId) q.append('customerId', params.customerId);
      return request<NoteDto[]>(`/notes?${q.toString()}`);
    },
    create: async (data: CreateNoteDto): Promise<NoteDto> => {
      return request<NoteDto>('/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<NoteDto> => {
      return request<NoteDto>(`/notes/${id}`, {
        method: 'DELETE',
      });
    },
  },
  attachments: {
    list: async (params: { companyId?: string; customerId?: string }): Promise<AttachmentDto[]> => {
      const q = new URLSearchParams();
      if (params.companyId) q.append('companyId', params.companyId);
      if (params.customerId) q.append('customerId', params.customerId);
      return request<AttachmentDto[]>(`/attachments?${q.toString()}`);
    },
    upload: async (file: File, params: { companyId?: string; customerId?: string }): Promise<AttachmentDto> => {
      const fd = new FormData();
      fd.append('file', file);
      if (params.companyId) fd.append('companyId', params.companyId);
      if (params.customerId) fd.append('customerId', params.customerId);
      return request<AttachmentDto>('/attachments/upload', {
        method: 'POST',
        body: fd,
      });
    },
    delete: async (id: string): Promise<AttachmentDto> => {
      return request<AttachmentDto>(`/attachments/${id}`, {
        method: 'DELETE',
      });
    },
  },
  tags: {
    list: async (entityType?: string): Promise<TagDto[]> => {
      const q = entityType ? `?entityType=${entityType}` : '';
      return request<TagDto[]>(`/tags${q}`);
    },
    create: async (data: CreateTagDto): Promise<TagDto> => {
      return request<TagDto>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string): Promise<TagDto> => {
      return request<TagDto>(`/tags/${id}`, {
        method: 'DELETE',
      });
    },
  },
  adminUsers: {
    list: async (): Promise<any[]> => {
      return request<any[]>('/users');
    },
    changeRole: async (id: string, role: string): Promise<any> => {
      return request<any>(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },
    delete: async (id: string): Promise<any> => {
      return request<any>(`/users/${id}`, {
        method: 'DELETE',
      });
    },
  },
  auditLogs: {
    list: async (page = 1, limit = 20, action?: string, email?: string): Promise<{ logs: any[]; total: number; page: number; pagesCount: number }> => {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (action) q.append('action', action);
      if (email) q.append('email', email);
      return request<{ logs: any[]; total: number; page: number; pagesCount: number }>(`/audit?${q.toString()}`);
    },
    getExportUrl: (): string => {
      return 'http://localhost:3001/api/audit/export';
    },
  },

  templateEngine: {
    listDefinitions: async (): Promise<TemplateDefinitionDto[]> => {
      return request<TemplateDefinitionDto[]>('/template-engine/definitions');
    },
    getDefinition: async (id: string): Promise<TemplateDefinitionDto> => {
      return request<TemplateDefinitionDto>(`/template-engine/definitions/${id}`);
    },
    createDefinition: async (data: TemplateDefinitionInput): Promise<TemplateDefinitionDto> => {
      return request<TemplateDefinitionDto>('/template-engine/definitions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateDefinition: async (id: string, data: any): Promise<TemplateDefinitionDto> => {
      return request<TemplateDefinitionDto>(`/template-engine/definitions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    deleteDefinition: async (id: string): Promise<{ success: boolean }> => {
      return request<{ success: boolean }>(`/template-engine/definitions/${id}`, {
        method: 'DELETE',
      });
    },
    render: async (documentId: string, templateId: string, format: 'pdf' | 'docx'): Promise<RenderResponseDto> => {
      return request<RenderResponseDto>(`/template-engine/render/${documentId}`, {
        method: 'POST',
        body: JSON.stringify({ templateId, format }),
      });
    },
    preview: async (template: any, documentId?: string): Promise<{ template: TemplateDefinitionDto; invoiceData: InvoiceData }> => {
      return request<{ template: TemplateDefinitionDto; invoiceData: InvoiceData }>('/template-engine/preview', {
        method: 'POST',
        body: JSON.stringify({ template, documentId }),
      });
    },
  },
  health: {
    check: async (): Promise<any> => {
      return request<any>('/health');
    },
  },
};
