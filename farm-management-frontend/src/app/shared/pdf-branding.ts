import jsPDF from 'jspdf';

export const FARMOPS_PDF_COLORS = {
  primaryGreen: '#16A34A',
  darkGreen: '#166534',
  blueAccent: '#2563EB',
  neutralGray: '#64748B',
  border: '#DDE8DF',
  text: '#142018',
  headerSurface: '#F7FBF8'
};

const FARMOPS_PDF_LOGO_PATH = '/brand/farmops-report-logo.png';
let cachedLogoDataUrl = '';

export type FarmOpsPdfHeaderOptions = {
  title: string;
  generatedLabel?: string;
  periodLabel?: string;
};

export async function loadFarmOpsPdfLogo() {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  try {
    const response = await fetch(FARMOPS_PDF_LOGO_PATH);
    const blob = await response.blob();

    cachedLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Unable to load FarmOps PDF logo.', error);
    cachedLogoDataUrl = '';
  }

  return cachedLogoDataUrl;
}

export function drawFarmOpsPdfHeader(
  doc: jsPDF,
  logoDataUrl: string,
  options: FarmOpsPdfHeaderOptions
) {
  const generatedLabel =
    options.generatedLabel || `Generated: ${new Date().toLocaleDateString('en-US')}`;

  doc.setFillColor(FARMOPS_PDF_COLORS.headerSurface);
  doc.rect(0, 0, 210, 38, 'F');

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 6, 58, 28);
  } else {
    doc.setTextColor(FARMOPS_PDF_COLORS.darkGreen);
    doc.setFontSize(18);
    doc.text('FarmOps', 14, 18);
    doc.setTextColor(FARMOPS_PDF_COLORS.neutralGray);
    doc.setFontSize(7);
    doc.text('Agricultural Decision Support Platform', 14, 24);
  }

  doc.setTextColor(FARMOPS_PDF_COLORS.text);
  doc.setFontSize(12);
  doc.text(options.title, 196, 13, { align: 'right' });
  doc.setTextColor(FARMOPS_PDF_COLORS.neutralGray);
  doc.setFontSize(8);
  doc.text(generatedLabel, 196, 21, { align: 'right' });

  if (options.periodLabel) {
    doc.text(`Period: ${options.periodLabel}`, 196, 28, { align: 'right' });
  }

  doc.setDrawColor(FARMOPS_PDF_COLORS.primaryGreen);
  doc.setLineWidth(0.6);
  doc.line(14, 38, 196, 38);

  return 48;
}

export function addFarmOpsPdfFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(FARMOPS_PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(14, 286, 196, 286);
    doc.setTextColor(FARMOPS_PDF_COLORS.neutralGray);
    doc.setFontSize(8);
    doc.text('FarmOps Agricultural Decision Support Platform', 14, 292);
    doc.text(`Page ${page} of ${pageCount}`, 196, 292, { align: 'right' });
  }
}
