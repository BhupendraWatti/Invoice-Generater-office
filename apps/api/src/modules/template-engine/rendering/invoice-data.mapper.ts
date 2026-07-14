import { InvoiceData, InvoiceLineItem, InvoiceParty } from '@docflow/shared-types';

export function mapDocumentToInvoiceData(doc: any): InvoiceData {
  let items: InvoiceLineItem[] = [];
  let subtotal = 0;
  let taxTotal = 0;
  let discount = 0;
  let adjustment = 0;
  let shipping = 0;
  let notes = '';
  
  let logoUrl: string | undefined = undefined;
  let qrUrl: string | undefined = undefined;
  
  if (doc.blocks && doc.blocks.length > 0) {
    let indexCount = 1;
    doc.blocks.forEach((block: any) => {
      let contentObj: any = {};
      try {
        contentObj = typeof block.content === 'string' ? JSON.parse(block.content) : block.content;
      } catch (e) {
        contentObj = {};
      }

      if (block.blockType === 'GLOBAL_CONFIG' || block.id === 'b-global-config') {
        const visibility = contentObj.fieldVisibility || {};
        if (visibility.logoUrl) logoUrl = visibility.logoUrl;
        if (visibility.qrUrl) qrUrl = visibility.qrUrl;
      }

      if (block.blockType === 'TABLE') {
        const rawItems = contentObj.items || [];
        rawItems.forEach((item: any) => {
          const quantity = Number(item.quantity) || 0;
          const rate = Number(item.rate) || 0;
          const lineVal = quantity * rate;
          const taxRate = Number(item.taxRate) || 0;
          const taxAmount = lineVal * (taxRate / 100);
          
          items.push({
            index: indexCount++,
            sku: item.sku || '',
            description: item.description || '',
            type: item.type || '',
            quantity,
            unit: item.unit || 'PCS',
            rate,
            taxLabel: item.taxCode || (taxRate > 0 ? `GST ${taxRate}%` : 'EXEMPT'),
            taxRate,
            taxAmount,
            amount: lineVal,
          });

          subtotal += lineVal;
          taxTotal += taxAmount;
        });

        if (contentObj.discount) {
          discount += Number(contentObj.discount) || 0;
        }
        if (contentObj.adjustment) {
          adjustment += Number(contentObj.adjustment) || 0;
        }
        if (contentObj.shipping) {
          shipping += Number(contentObj.shipping) || 0;
        }
      } else if (block.blockType === 'NOTES') {
        notes = contentObj.notes || contentObj.text || '';
      }
    });
  }

  const grandTotal = subtotal + taxTotal - discount + adjustment + shipping;

  const formatAddress = (party: any) => {
    const lines: string[] = [];
    if (party.addressLine1) lines.push(party.addressLine1);
    if (party.addressLine2) lines.push(party.addressLine2);
    const cityPostal = [party.city, party.postalCode].filter(Boolean).join(' - ');
    if (cityPostal || party.country) {
      lines.push([cityPostal, party.country].filter(Boolean).join(', '));
    }
    return lines;
  };

  const orgParty: InvoiceParty = {
    name: doc.company?.name || 'Unlinked Corporate Entity',
    lines: doc.company ? formatAddress(doc.company) : [],
    taxId: doc.company?.taxId || undefined,
    email: doc.company?.email || undefined,
    phone: doc.company?.phone || undefined,
  };

  const clientParty: InvoiceParty = {
    name: doc.customer?.name || 'Unlinked Customer Entity',
    lines: doc.customer ? formatAddress(doc.customer) : [],
    taxId: doc.customer?.taxId || undefined,
    email: doc.customer?.email || undefined,
    phone: doc.customer?.phone || undefined,
  };

  const shipParty: InvoiceParty = {
    name: doc.customer?.name || 'Unlinked Customer Entity',
    lines: doc.customer ? formatAddress(doc.customer) : [],
  };

  let signatureUrl = undefined;
  let stampUrl = undefined;
  let bankDetails = undefined;

  if (doc.company) {
    if (doc.company.branding) {
      if (!logoUrl) {
        logoUrl = doc.company.branding.logoUrl || undefined;
      }
      const sigs = doc.company.branding.signatures;
      if (sigs && Array.isArray(sigs) && sigs.length > 0) {
        signatureUrl = sigs[0] || undefined;
      }
      const stamps = doc.company.branding.stamps;
      if (stamps && Array.isArray(stamps) && stamps.length > 0) {
        stampUrl = stamps[0] || undefined;
      }
    }

    const defaultBank = doc.company.bankAccounts?.find((b: any) => b.isDefault) || doc.company.bankAccounts?.[0];
    if (defaultBank) {
      bankDetails = {
        bankName: defaultBank.bankName || '',
        accountHolder: defaultBank.accountHolder || doc.company.name || '',
        accountNumber: defaultBank.accountNumber || '',
        iban: defaultBank.iban || '',
        bic: defaultBank.bic || '',
        gstNumber: defaultBank.gstNumber || '',
      };
    }
  }

  // Fallback to Rupee default symbol
  const currencySymbol = '₹';

  return {
    documentId: doc.id,
    documentType: doc.type,
    documentNumber: doc.title,
    title: doc.title,
    status: doc.status,
    issueDate: new Date(doc.createdAt).toISOString().split('T')[0],
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split('T')[0] : undefined,
    currencySymbol,
    organization: orgParty,
    billTo: clientParty,
    shipTo: shipParty,
    items,
    subtotal,
    discount,
    taxTotal,
    shipping,
    adjustment,
    grandTotal,
    notes,
    bank: bankDetails,
    logoUrl,
    qrUrl,
    signatureUrl,
    stampUrl,
  };
}
