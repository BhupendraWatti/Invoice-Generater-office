import { InvoiceData, TemplateDefinitionDto } from '@docflow/shared-types';

export interface InvoiceRenderer {
  render(data: InvoiceData, template: TemplateDefinitionDto): Promise<Buffer>;
}

export function formatCurrency(amount: number, symbol: string): string {
  const sym = symbol === '₹' ? 'Rs. ' : symbol;
  return `${sym}${amount.toFixed(2)}`;
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
