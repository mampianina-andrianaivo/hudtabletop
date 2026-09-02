import { jsPDF } from 'jspdf';
import { Client, Sale, Settings } from '../types';
import { formatPrice, formatNumberAmount, formatAmountString, formatIntWithThousands } from './format';

export function generateInvoicePDF(
  sale: Sale,
  settings: Settings,
  clients?: Client[],
  description?: string,
  instructions?: string,
  titre?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setTextColor(0, 0, 0); // Full black text
  doc.setFont('helvetica', 'normal');

  let y = 20;

  // Header Left: Entreprise
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.orgNom || 'ORGANISATION', 15, y);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y += 6;
  if (settings.contact) {
    doc.text(`Contact: ${settings.contact}`, 15, y);
    y += 5;
  }
  if (settings.adresse) {
    doc.text(`Adresse: ${settings.adresse}`, 15, y);
    y += 5;
  }
  if (settings.information) {
    doc.text(settings.information, 15, y);
    y += 5;
  }

  // Determine client code (or CL# for custom / hors liste)
  let clientCode = 'CL#';
  if (sale.clientId && clients) {
    const found = clients.find((c) => c.id === sale.clientId);
    if (found?.code) {
      clientCode = found.code;
    }
  } else if (clients) {
    const found = clients.find((c) => c.nom === sale.clientNom);
    if (found?.code) {
      clientCode = found.code;
    }
  }

  // Header Right: Client
  let yClient = 20;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.clientNom, 115, yClient);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  yClient += 6;
  doc.text(`Code: ${clientCode}`, 115, yClient);
  yClient += 5;
  if (sale.clientContact) {
    doc.text(`Contact: ${sale.clientContact}`, 115, yClient);
    yClient += 5;
  }
  if (sale.clientAdresse) {
    doc.text(`Adresse: ${sale.clientAdresse}`, 115, yClient);
    yClient += 5;
  }

  y = Math.max(y, yClient) + 10;

  // Intermédiaire: Code vente & Unité monétaire
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (titre) {
    doc.text(titre, 15, y);
    y += 5;
  }
  doc.text(`Code Vente: ${sale.code}`, 15, y);
  y += 5;
  doc.text(`Unité Monétaire: ${settings.currency || 'Non spécifiée'}`, 15, y);
  y += 10;

  // Tableau: QT | MS | DS | PU | MT
  // Table headers
  const colX = { qt: 15, ms: 30, ds: 55, pu: 135, mt: 195 };
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('QT', colX.qt, y);
  doc.text('MS', colX.ms, y);
  doc.text('DS', colX.ds, y);
  doc.text('PU', colX.pu, y);
  doc.text('MT', colX.mt, y, { align: 'right' });
  
  y += 2;
  // Line under headers
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(15, y, 195, y);
  y += 6;

  doc.setFont('helvetica', 'normal');

  let subtotalNum = 0;

  sale.items.forEach((item) => {
    // Format quantity (Quantities always include decimals when provided, completed to 2 digits, e.g. 1,6 -> 1,60)
    const hasQtyDec = !!(item.quantiteDec && item.quantiteDec.trim() !== '' && parseInt(item.quantiteDec, 10) > 0);
    const qtyStr = hasQtyDec
      ? `${formatIntWithThousands(item.quantiteInt)},${item.quantiteDec.padEnd(2, '0').slice(0, 2)}`
      : `${formatIntWithThousands(item.quantiteInt)}`;

    const qtyVal = parseFloat(`${item.quantiteInt || '0'}.${item.quantiteDec || '0'}`);

    // Format unit price
    const puVal = parseFloat(`${item.prixInt || '0'}.${item.prixDec || '0'}`);
    const puStr = formatPrice(item.prixInt, item.prixDec, settings.decimalMode);

    // Line total
    const rowTotal = qtyVal * puVal;
    subtotalNum += rowTotal;

    const mtStr = formatNumberAmount(rowTotal, settings.decimalMode);

    doc.text(qtyStr, colX.qt, y);
    if (item.mesure) {
      doc.text(item.mesure, colX.ms, y);
    }
    const dsText = item.code ? `[${item.code}] ${item.nom}` : item.nom;
    doc.text(dsText, colX.ds, y);
    doc.text(puStr, colX.pu, y);
    doc.text(mtStr, colX.mt, y, { align: 'right' });

    y += 6;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  doc.line(15, y, 195, y);
  y += 6;

  // Calculation deductions / majorations in normal font
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  if (sale.deduction && sale.deduction.applied) {
    const dedVal = parseFloat(sale.deduction.montant || '0');
    const dedStr = formatNumberAmount(dedVal, settings.decimalMode);
    const dedTitle = sale.deduction.motif
      ? sale.deduction.motif
      : 'Déduction';

    doc.text(dedTitle, colX.ds, y);
    doc.text('moins', colX.pu, y);
    doc.text(`(-) ${dedStr}`, colX.mt, y, { align: 'right' });
    y += 6;
  }

  if (sale.majoration && sale.majoration.applied) {
    const majVal = parseFloat(sale.majoration.montant || '0');
    const majStr = formatNumberAmount(majVal, settings.decimalMode);
    const majTitle = sale.majoration.motif
      ? sale.majoration.motif
      : 'Majoration';

    doc.text(majTitle, colX.ds, y);
    doc.text('plus', colX.pu, y);
    doc.text(`(+) ${majStr}`, colX.mt, y, { align: 'right' });
    y += 6;
  }

  // Line spanning PU and MT width only before Total
  doc.line(125, y, 195, y);
  y += 6;

  // Total row (only total is bold)
  doc.setFont('helvetica', 'bold');
  doc.text('Total', colX.ds, y);
  doc.text(formatAmountString(sale.totalAmount, settings.decimalMode), colX.mt, y, { align: 'right' });
  y += 12;

  // Ending: Information & Instructions
  if (description) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Information:', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(description, 15, y, { maxWidth: 180 });
    y += 10;
  }

  if (instructions) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions:', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(instructions, 15, y, { maxWidth: 180 });
    y += 10;
  }

  // Save PDF
  doc.save(`PDF_${sale.code}.pdf`);
}
