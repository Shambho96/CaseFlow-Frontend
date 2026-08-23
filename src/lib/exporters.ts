/** Frontend-only export helpers — CSV / Excel-compatible files with ₹ and UTF-8 support */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Export rows as CSV with UTF-8 BOM so Excel renders ₹ and regional scripts correctly */
export function exportCsv(filename: string, headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(','));
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Export rows as SpreadsheetML (.xls) which Excel opens natively —
 * preserves the ₹ symbol and formatting without external dependencies.
 */
export function exportExcel(filename: string, sheetName: string, headers: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
    }
    return `<Cell><Data ss:Type="String">${xmlEscape(v == null ? '' : String(v))}</Data></Cell>`;
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName)}">
  <Table>
   <Row>${headers.map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join('')}</Row>
   ${rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
  const blob = new Blob(['\uFEFF' + xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

/** Download any text content as a file (used by AI drafter downloads) */
export function downloadTextFile(content: string, filename: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  downloadBlob(blob, filename);
}

/** Minimal RFC-4180 CSV parser (handles quoted cells with commas/newlines) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}
