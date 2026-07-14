import { TemplateDefinitionDto } from '@docflow/shared-types';

export const BASE_TEMPLATE: TemplateDefinitionDto = {
  meta: {
    id: 'base-classic',
    name: 'Classic Base Template',
    category: 'INVOICE',
    isDefault: true,
    extends: null,
    description: 'The standard classical A4 blueprint',
    version: 1,
  },
  page: {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 36, right: 36, bottom: 36, left: 36 }, // margins in points (0.5 inch)
  },
  theme: {
    fonts: { heading: 'Helvetica-Bold', body: 'Helvetica', mono: 'Courier' },
    baseFontSize: 10,
    colors: {
      primary: '#3525CD',
      text: '#1F2937',
      muted: '#4B5563',
      border: '#E5E7EB',
      tableHeaderBg: '#F3F4F6',
      tableHeaderText: '#374151',
      zebraBg: '#F9FAFB',
    },
  },
  logo: {
    enabled: true,
    position: 'left',
    maxWidth: 120,
    maxHeight: 50,
    source: 'branding',
  },
  header: {
    showTitle: true,
    titleText: '{document.type}',
    showDocMeta: true,
    accentBar: true,
  },
  organization: {
    showHeading: false,
    heading: 'Organization Details',
    fields: [
      { key: 'name', label: 'Company Name', visible: true, order: 0 },
      { key: 'addressLine1', label: 'Address Line 1', visible: true, order: 1 },
      { key: 'addressLine2', label: 'Address Line 2', visible: true, order: 2 },
      { key: 'city', label: 'City', visible: true, order: 3 },
      { key: 'postalCode', label: 'Postal Code', visible: true, order: 4 },
      { key: 'country', label: 'Country', visible: true, order: 5 },
      { key: 'taxId', label: 'Tax ID / Registration', visible: true, order: 6 },
      { key: 'gst', label: 'GSTIN', visible: true, order: 7 },
    ],
  },
  customer: {
    showBillTo: true,
    billToHeading: 'Bill To',
    showShipTo: false,
    shipToHeading: 'Ship To',
    fields: [
      { key: 'name', label: 'Client Name', visible: true, order: 0 },
      { key: 'addressLine1', label: 'Billing Address', visible: true, order: 1 },
      { key: 'addressLine2', label: 'Address Line 2', visible: true, order: 2 },
      { key: 'city', label: 'City', visible: true, order: 3 },
      { key: 'postalCode', label: 'Postal Code', visible: true, order: 4 },
      { key: 'country', label: 'Country', visible: true, order: 5 },
      { key: 'email', label: 'Email', visible: true, order: 6 },
      { key: 'phone', label: 'Phone', visible: true, order: 7 },
    ],
  },
  documentDetails: {
    show: true,
    fields: [
      { key: 'number', label: 'Document Number', visible: true, order: 0 },
      { key: 'date', label: 'Date', visible: true, order: 1 },
      { key: 'dueDate', label: 'Due Date', visible: true, order: 2 },
      { key: 'terms', label: 'Payment Terms', visible: true, order: 3 },
    ],
  },
  table: {
    columns: [
      { key: 'index', label: '#', visible: true, width: 5, align: 'center', order: 0 },
      { key: 'description', label: 'Item & Description', visible: true, width: 50, align: 'left', order: 1 },
      { key: 'type', label: 'Type', visible: true, width: 20, align: 'left', order: 1.5 },
      { key: 'tax', label: 'Tax Rate', visible: false, width: 10, align: 'right', order: 4 },
      { key: 'amount', label: 'Amount', visible: true, width: 15, align: 'right', order: 5 },
    ],
    zebra: true,
    showBorders: true,
    compact: false,
  },
  totals: {
    rows: [
      { key: 'subtotal', label: 'Subtotal', visible: true, order: 0, emphasis: false },
      { key: 'discount', label: 'Discount', visible: false, order: 1, emphasis: false },
      { key: 'tax', label: 'Tax Total', visible: true, order: 2, emphasis: false },
      { key: 'shipping', label: 'Shipping Charges', visible: false, order: 3, emphasis: false },
      { key: 'grandTotal', label: 'Total Due', visible: true, order: 4, emphasis: true },
    ],
    showAmountInWords: false,
  },
  payment: {
    show: true,
    heading: 'Payment Instructions',
    instructions: 'Please transfer payments directly to the designated bank credentials listed below. Reference the document number in the transaction memo.',
  },
  bank: {
    show: true,
    heading: 'Bank Transfer Details',
    source: 'company',
    fields: [
      { key: 'bankName', label: 'Bank Name', visible: true, order: 0 },
      { key: 'accountHolder', label: 'Account Name', visible: true, order: 1 },
      { key: 'accountNumber', label: 'Account Number', visible: true, order: 2 },
      { key: 'iban', label: 'IBAN Code', visible: true, order: 3 },
      { key: 'bic', label: 'BIC / SWIFT', visible: true, order: 4 },
    ],
  },
  notes: {
    show: true,
    heading: 'Notes & Declarations',
    text: 'Thank you for your business. For any queries regarding service delivery timelines, please contact our support desk.',
  },
  signature: {
    show: true,
    label: 'Authorized Signatory',
    source: 'branding',
    showStamp: true,
  },
  watermark: {
    enabled: false,
    text: 'DRAFT COPY',
    opacity: 0.15,
    angle: 45,
  },
  footer: {
    show: true,
    text: 'Granth Infotech Private Limited — Services & Software Delivery Division',
    showPageNumbers: true,
  },
};

// Deep merge helper
export function deepMerge(target: any, source: any): any {
  if (!source) return target;
  const output = { ...target };
  
  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];
    
    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      output[key] = deepMerge(targetVal || {}, sourceVal);
    } else {
      output[key] = sourceVal;
    }
  }
  
  return output;
}

export function resolveTemplate(
  customConfig: any,
  listAllTemplates?: () => any[]
): TemplateDefinitionDto {
  let resolved = { ...BASE_TEMPLATE };

  if (!customConfig) return resolved;

  if (customConfig.meta?.extends && listAllTemplates) {
    const parent = listAllTemplates().find(t => t.meta?.id === customConfig.meta.extends);
    if (parent) {
      const resolvedParent = resolveTemplate(parent, listAllTemplates);
      resolved = deepMerge(resolved, resolvedParent);
    }
  }

  return deepMerge(resolved, customConfig);
}
