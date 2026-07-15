import { InvoiceData, TemplateDefinitionDto, formatCurrency, formatDate, replaceTokens } from '@docflow/shared-types';

export interface InvoiceRenderer {
  render(data: InvoiceData, template: TemplateDefinitionDto): Promise<Buffer>;
}

export { formatCurrency, formatDate, replaceTokens };

