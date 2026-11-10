/**
 * Report export: turns the generated report into a PDF, an Excel workbook (.xlsx) or a CSV file.
 * No third-party libraries: the PDF, ZIP and XLSX writers below are small and self-contained.
 *
 * Notes
 *  - PDF uses the built-in Helvetica fonts, which cover Latin characters only; any other character is
 *    shown as "?" in the PDF. Excel and CSV keep every character exactly as it is.
 *  - Amounts are written as real numbers in Excel and CSV so they can be summed and charted.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ model */

export function buildReportModel({ report, dateFrom, dateTo, currencyCode = "PKR", categoryName = (slug) => slug, userName = "", generatedAt = new Date() }) {
  const summary = report?.summary || {};
  const inflow = num(summary.total_inflow);
  const outflow = num(summary.total_outflow);
  const net = summary.net_savings != null ? num(summary.net_savings) : inflow - outflow;

  const cats = (report?.transactions?.category_breakdown || []).map((c) => ({ name: String(c.category ?? ""), total: num(c.total) }));
  const catTotal = cats.reduce((sum, c) => sum + c.total, 0);

  const loans = report?.loans || {};
  // "given" loans are money you lent (owed to you); "received" loans are money you borrowed (you owe).
  const owedToYou = num(loans.pending_given_total);
  const youOwe = num(loans.pending_received_total);

  const budgets = (report?.budgets || []).map((b) => {
    const percent = num(b.percent_used);
    return {
      category: String(categoryName(b.category_slug) || ""),
      period: String(b.period || ""),
      amount: num(b.amount),
      spent: num(b.spent_amount),
      percent,
      status: percent > 100 ? "Over limit" : percent >= 80 ? "Near limit" : "On track",
    };
  });

  const goals = (report?.goals || []).map((g) => {
    const days = g.days_remaining;
    return {
      name: String(g.name || ""),
      target: num(g.target_amount),
      saved: num(g.saved_amount),
      percent: num(g.progress_percent),
      status: g.is_completed ? "Completed" : days == null ? "In progress" : days < 0 ? "Past target date" : `${days} day${days === 1 ? "" : "s"} left`,
    };
  });

  return {
    title: "Financial Report",
    dateFrom,
    dateTo,
    generatedAt,
    currencyCode,
    userName,
    inflow,
    outflow,
    net,
    savingsRate: inflow > 0 ? (net / inflow) * 100 : null,
    activeGoals: num(summary.active_goals),
    categories: cats.map((c) => ({ ...c, share: catTotal > 0 ? (c.total / catTotal) * 100 : 0 })),
    loans: { owedToYou, youOwe, net: owedToYou - youOwe },
    budgets,
    goals,
  };
}

const two = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
const group = (n) => num(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (code, n) => `${num(n) < 0 ? "-" : ""}${code} ${group(Math.abs(num(n)))}`;
const pct = (n) => `${num(n).toFixed(1)}%`;

export function reportFileName(model, extension) {
  return `SFMS-Report_${model.dateFrom}_to_${model.dateTo}.${extension}`;
}

/* -------------------------------------------------------------------- CSV */

export function buildCsv(model) {
  const cell = (v) => {
    if (typeof v === "number") return String(v);
    let s = String(v ?? "");
    // Text that starts with a formula character would be run as a formula by spreadsheet apps.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [];
  const add = (...cells) => rows.push(cells.map(cell).join(","));
  const fixed = (n) => Number(num(n).toFixed(2));

  add("SFMS Financial Report");
  add("Period", `${model.dateFrom} to ${model.dateTo}`);
  add("Generated", stamp(model.generatedAt));
  add("Currency", model.currencyCode);
  if (model.userName) add("Prepared for", model.userName);
  add();
  add("SUMMARY");
  add("Metric", "Value");
  add("Income", fixed(model.inflow));
  add("Expenses", fixed(model.outflow));
  add("Net savings", fixed(model.net));
  add("Savings rate (%)", model.savingsRate == null ? "" : fixed(model.savingsRate));
  add("Active goals", model.activeGoals);
  add();
  add("CATEGORY BREAKDOWN");
  add("Category", "Total", "Share (%)");
  if (model.categories.length === 0) add("No transactions in this range");
  model.categories.forEach((c) => add(c.name, fixed(c.total), fixed(c.share)));
  add();
  add("LOANS");
  add("Metric", "Amount");
  add("Owed to you", fixed(model.loans.owedToYou));
  add("You owe", fixed(model.loans.youOwe));
  add("Net loan position", fixed(model.loans.net));
  add();
  add("BUDGETS");
  add("Category", "Period", "Budget", "Spent", "Used (%)", "Status");
  if (model.budgets.length === 0) add("No active budgets");
  model.budgets.forEach((b) => add(b.category, b.period, fixed(b.amount), fixed(b.spent), fixed(b.percent), b.status));
  add();
  add("GOALS");
  add("Goal", "Target", "Saved", "Progress (%)", "Status");
  if (model.goals.length === 0) add("No goals");
  model.goals.forEach((g) => add(g.name, fixed(g.target), fixed(g.saved), fixed(g.percent), g.status));

  // The byte-order mark makes Excel read the file as UTF-8.
  return new Blob(["\uFEFF" + rows.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
}

/* -------------------------------------------------------------- ZIP + XLSX */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Minimal ZIP writer (entries are stored, not compressed), which is all an .xlsx needs. */
function zip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

  files.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    const crc = crc32(bytes);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(bytes.length), ...u32(bytes.length), ...u16(nameBytes.length), ...u16(0),
    ]);
    chunks.push(local, nameBytes, bytes);
    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(bytes.length), ...u32(bytes.length), ...u16(nameBytes.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ]), nameBytes);
    offset += local.length + nameBytes.length + bytes.length;
  });

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  all.forEach((part) => { out.set(part, at); at += part.length; });
  return out;
}

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  // characters that are not allowed in XML 1.0
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const colName = (index) => {
  let n = index + 1;
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

// style ids (see STYLES_XML)
const S = { text: 0, title: 1, header: 2, money: 3, percent: 4, bold: 5, muted: 6, integer: 7, boldMoney: 8 };

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0&quot;%&quot;"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FF071A3D"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF5D6F90"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0A47D6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** rows: array of arrays of cells; a cell is null, a string, a number, or { v, s } with a style id. */
function sheetXml(rows, widths) {
  const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`;
  const body = rows.map((row, r) => {
    const cells = row.map((cellValue, c) => {
      if (cellValue === null || cellValue === undefined || cellValue === "") return "";
      const { v, s = S.text } = typeof cellValue === "object" ? cellValue : { v: cellValue };
      const ref = `${colName(c)}${r + 1}`;
      if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}" s="${s}"><v>${v}</v></c>` : "";
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/>${cols}<sheetData>${body}</sheetData></worksheet>`;
}

export function buildXlsx(model) {
  const code = model.currencyCode;
  const head = (...labels) => labels.map((v) => ({ v, s: S.header }));
  const meta = (title) => [
    [{ v: title, s: S.title }],
    [{ v: `Period: ${model.dateFrom} to ${model.dateTo}`, s: S.muted }],
    [{ v: `Generated: ${stamp(model.generatedAt)} · Amounts in ${code}`, s: S.muted }],
    [],
  ];
  const note = (text) => [{ v: text, s: S.muted }];

  const sheets = [];

  sheets.push({
    name: "Summary",
    widths: [30, 22],
    rows: [
      ...meta("SFMS Financial Report"),
      head("Metric", `Value (${code})`),
      ["Income", { v: model.inflow, s: S.money }],
      ["Expenses", { v: model.outflow, s: S.money }],
      [{ v: "Net savings", s: S.bold }, { v: model.net, s: S.boldMoney }],
      ["Savings rate", model.savingsRate == null ? null : { v: model.savingsRate, s: S.percent }],
      ["Active goals", { v: model.activeGoals, s: S.integer }],
      ...(model.userName ? [[], [{ v: `Prepared for ${model.userName}`, s: S.muted }]] : []),
    ],
  });

  sheets.push({
    name: "Categories",
    widths: [34, 20, 14],
    rows: [
      ...meta("Category breakdown"),
      head("Category", `Total (${code})`, "Share"),
      ...(model.categories.length ? model.categories.map((c) => [c.name, { v: c.total, s: S.money }, { v: c.share, s: S.percent }]) : [note("No transactions in this range.")]),
      ...(model.categories.length ? [[{ v: "Total", s: S.bold }, { v: model.categories.reduce((a, c) => a + c.total, 0), s: S.boldMoney }]] : []),
    ],
  });

  sheets.push({
    name: "Loans",
    widths: [30, 22],
    rows: [
      ...meta("Loans (cash lending only)"),
      head("Metric", `Amount (${code})`),
      ["Owed to you", { v: model.loans.owedToYou, s: S.money }],
      ["You owe", { v: model.loans.youOwe, s: S.money }],
      [{ v: "Net loan position", s: S.bold }, { v: model.loans.net, s: S.boldMoney }],
    ],
  });

  sheets.push({
    name: "Budgets",
    widths: [28, 12, 18, 18, 12, 14],
    rows: [
      ...meta("Budgets"),
      head("Category", "Period", `Budget (${code})`, `Spent (${code})`, "Used", "Status"),
      ...(model.budgets.length ? model.budgets.map((b) => [b.category, b.period, { v: b.amount, s: S.money }, { v: b.spent, s: S.money }, { v: b.percent, s: S.percent }, b.status]) : [note("No active budgets.")]),
    ],
  });

  sheets.push({
    name: "Goals",
    widths: [30, 18, 18, 14, 20],
    rows: [
      ...meta("Savings goals"),
      head("Goal", `Target (${code})`, `Saved (${code})`, "Progress", "Status"),
      ...(model.goals.length ? model.goals.map((g) => [g.name, { v: g.target, s: S.money }, { v: g.saved, s: S.money }, { v: g.percent, s: S.percent }, g.status]) : [note("No goals.")]),
    ],
  });

  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: STYLES_XML },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows, s.widths) })),
  ];
  return new Blob([zip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* -------------------------------------------------------------------- PDF */

// Helvetica glyph widths (per 1000 em) for ASCII 32..126, regular and bold.
const W_REG = [278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 278, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Characters in Windows-1252 that sit outside the Latin-1 range.
const WIN1252 = { "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f };

/** Converts text to the single-byte encoding the PDF fonts use; unsupported characters become "?". */
function winAnsi(text) {
  let out = "";
  for (const ch of String(text ?? "")) {
    const code = ch.codePointAt(0);
    if (code === 0xa0) out += " ";
    else if (code >= 32 && code < 127) out += ch;
    else if (code >= 0xa1 && code <= 0xff) out += ch;
    else if (WIN1252[ch]) out += String.fromCharCode(WIN1252[ch]);
    else if (code === 9 || code === 10 || code === 13) out += " ";
    else out += "?";
  }
  return out;
}

function textWidth(text, size, bold) {
  const table = bold ? W_BOLD : W_REG;
  let total = 0;
  for (const ch of winAnsi(text)) {
    const code = ch.charCodeAt(0);
    total += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (total / 1000) * size;
}

function fitText(text, size, bold, maxWidth) {
  const clean = winAnsi(text);
  if (textWidth(clean, size, bold) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && textWidth(`${cut}...`, size, bold) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

const rgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(" ");
};
const pdfString = (text) => `(${winAnsi(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
const f2 = (n) => Number(n).toFixed(2);

const COLORS = { navy: "#071a3d", navy2: "#0a2455", blue: "#1565ff", cyan: "#17c8f2", ink: "#0b1d45", muted: "#5d6f90", line: "#dce7f8", soft: "#f3f8ff", zebra: "#f8fbff", green: "#0e9f6e", red: "#d12c4d", amber: "#c97d00", white: "#ffffff" };

class PdfDoc {
  constructor() {
    this.W = 595.28;
    this.H = 841.89;
    this.margin = 40;
    this.bottom = 56;
    this.pages = [];
    this.page = null;
    this.y = 0;
    this.addPage();
  }

  addPage() {
    this.page = [];
    this.pages.push(this.page);
    this.y = this.margin;
  }

  get contentWidth() { return this.W - this.margin * 2; }

  ensure(height, onNewPage) {
    if (this.y + height > this.H - this.bottom) {
      this.addPage();
      this.drawRunningHeader();
      if (onNewPage) onNewPage();
    }
  }

  // ----- primitives (y is measured from the top of the page)
  rect(x, y, w, h, { fill, stroke, lineWidth = 0.6 } = {}) {
    const ops = [];
    if (fill) ops.push(`${rgb(fill)} rg`);
    if (stroke) ops.push(`${rgb(stroke)} RG ${lineWidth} w`);
    ops.push(`${f2(x)} ${f2(this.H - y - h)} ${f2(w)} ${f2(h)} re ${fill && stroke ? "B" : fill ? "f" : "S"}`);
    this.page.push(ops.join(" "));
  }

  line(x1, y1, x2, y2, color = COLORS.line, width = 0.6) {
    this.page.push(`${rgb(color)} RG ${width} w ${f2(x1)} ${f2(this.H - y1)} m ${f2(x2)} ${f2(this.H - y2)} l S`);
  }

  text(x, baseline, str, { size = 9, bold = false, color = COLORS.ink, align = "left", maxWidth } = {}) {
    let value = winAnsi(str);
    if (maxWidth) value = fitText(value, size, bold, maxWidth);
    const width = textWidth(value, size, bold);
    const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    this.page.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg ${f2(left)} ${f2(this.H - baseline)} Td ${pdfString(value)} Tj ET`);
  }

  // ----- building blocks
  drawRunningHeader() {
    this.text(this.margin, this.margin - 12, "SFMS Financial Report", { size: 8, bold: true, color: COLORS.muted });
    this.line(this.margin, this.margin - 6, this.W - this.margin, this.margin - 6, COLORS.line);
    this.y = this.margin + 6;
  }

  cover(model) {
    const band = 78;
    this.rect(0, 0, this.W, band, { fill: COLORS.navy });
    this.rect(0, band, this.W, 3, { fill: COLORS.cyan });
    this.text(this.margin, 40, "SFMS", { size: 24, bold: true, color: COLORS.white });
    this.text(this.margin, 58, "Self Finance Management System", { size: 8.5, color: "#9fb6e3" });
    this.text(this.W - this.margin, 38, model.title, { size: 15, bold: true, color: COLORS.white, align: "right" });
    this.text(this.W - this.margin, 56, `${model.dateFrom}  to  ${model.dateTo}`, { size: 9.5, color: "#8be6ff", align: "right" });
    this.y = band + 22;
    const bits = [`Generated ${stamp(model.generatedAt)}`, `Amounts in ${model.currencyCode}`];
    if (model.userName) bits.push(`Prepared for ${model.userName}`);
    this.text(this.margin, this.y, bits.join("   |   "), { size: 8.5, color: COLORS.muted });
    this.y += 18;
  }

  heading(title) {
    this.ensure(56);
    this.y += 16;
    this.rect(this.margin, this.y - 10, 3.5, 14, { fill: COLORS.blue });
    this.text(this.margin + 10, this.y + 1, title, { size: 12.5, bold: true, color: COLORS.navy });
    this.y += 14;
  }

  tiles(items) {
    const gap = 10;
    const w = (this.contentWidth - gap * (items.length - 1)) / items.length;
    const h = 58;
    this.ensure(h + 6);
    items.forEach((item, i) => {
      const x = this.margin + i * (w + gap);
      this.rect(x, this.y, w, h, { fill: COLORS.soft, stroke: COLORS.line });
      this.rect(x, this.y, 3, h, { fill: item.accent || COLORS.blue });
      this.text(x + 12, this.y + 18, item.label, { size: 8.5, color: COLORS.muted, maxWidth: w - 18 });
      let size = 14;
      while (size > 8 && textWidth(item.value, size, true) > w - 20) size -= 0.5;
      this.text(x + 12, this.y + 40, item.value, { size, bold: true, color: item.color || COLORS.ink });
    });
    this.y += h + 8;
  }

  /** columns: [{ label, width, align }]; rows: arrays of strings or { text, color, bold } or { bar: percent }. */
  table(columns, rows) {
    const rowH = 19;
    const headH = 21;
    const total = columns.reduce((sum, c) => sum + c.width, 0);
    const scale = this.contentWidth / total;
    const widths = columns.map((c) => c.width * scale);

    const header = () => {
      this.rect(this.margin, this.y, this.contentWidth, headH, { fill: COLORS.navy2 });
      let x = this.margin;
      columns.forEach((c, i) => {
        const pad = 8;
        const tx = c.align === "right" ? x + widths[i] - pad : x + pad;
        this.text(tx, this.y + 14, c.label, { size: 8.5, bold: true, color: COLORS.white, align: c.align === "right" ? "right" : "left", maxWidth: widths[i] - pad * 2 });
        x += widths[i];
      });
      this.y += headH;
    };

    this.ensure(headH + rowH * Math.min(rows.length, 2) + 6);
    header();
    rows.forEach((row, r) => {
      this.ensure(rowH, header);
      if (r % 2 === 1) this.rect(this.margin, this.y, this.contentWidth, rowH, { fill: COLORS.zebra });
      let x = this.margin;
      row.forEach((raw, i) => {
        const c = columns[i];
        const pad = 8;
        if (raw && typeof raw === "object" && "bar" in raw) {
          const trackW = widths[i] - pad * 2;
          this.rect(x + pad, this.y + 7, trackW, 5, { fill: "#e4edfb" });
          this.rect(x + pad, this.y + 7, Math.max(0, Math.min(100, raw.bar)) / 100 * trackW, 5, { fill: raw.color || COLORS.blue });
        } else {
          const cell = typeof raw === "object" && raw !== null ? raw : { text: raw };
          const tx = c.align === "right" ? x + widths[i] - pad : x + pad;
          this.text(tx, this.y + 13, cell.text ?? "", { size: 9, bold: cell.bold, color: cell.color || COLORS.ink, align: c.align === "right" ? "right" : "left", maxWidth: widths[i] - pad * 2 });
        }
        x += widths[i];
      });
      this.line(this.margin, this.y + rowH, this.margin + this.contentWidth, this.y + rowH, "#eaf0fa", 0.4);
      this.y += rowH;
    });
    this.y += 6;
  }

  note(text) {
    this.ensure(22);
    this.text(this.margin + 2, this.y + 12, text, { size: 9, color: COLORS.muted });
    this.y += 22;
  }

  toBytes(title) {
    const total = this.pages.length;
    this.pages.forEach((ops, i) => {
      this.page = ops;
      const baseline = this.H - 28;
      this.line(this.margin, baseline - 12, this.W - this.margin, baseline - 12, COLORS.line);
      this.text(this.margin, baseline, "SFMS  |  Self Finance Management System", { size: 8, color: COLORS.muted });
      this.text(this.W - this.margin, baseline, `Page ${i + 1} of ${total}`, { size: 8, color: COLORS.muted, align: "right" });
    });

    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    const kids = [];
    this.pages.forEach((ops, i) => {
      const pageId = 6 + i * 2;
      const contentId = pageId + 1;
      kids.push(`${pageId} 0 R`);
      const stream = ops.join("\n");
      objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f2(this.W)} ${f2(this.H)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
      objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    objects[2] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${total} >>`;
    const d = new Date();
    const pdfDate = `D:${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
    objects[5] = `<< /Title ${pdfString(title)} /Author (SFMS) /Creator (SFMS) /Producer (SFMS) /CreationDate (${pdfDate}) >>`;

    let out = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
    const offsets = [];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = out.length;
      out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

    // every character is <= 255, so each one is exactly one byte
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}

export function buildPdf(model) {
  const code = model.currencyCode;
  const doc = new PdfDoc();
  doc.cover(model);

  doc.tiles([
    { label: "Income", value: money(code, model.inflow), color: COLORS.green, accent: COLORS.green },
    { label: "Expenses", value: money(code, model.outflow), color: COLORS.red, accent: COLORS.red },
    { label: "Net savings", value: money(code, model.net), color: model.net >= 0 ? COLORS.navy : COLORS.red, accent: COLORS.blue },
    { label: "Active goals", value: String(model.activeGoals), accent: COLORS.amber },
  ]);
  doc.text(doc.margin + 2, doc.y + 8, model.savingsRate == null ? "Savings rate: not available (no income in this period)." : `Savings rate: ${pct(model.savingsRate)} of income was kept in this period.`, { size: 9, color: COLORS.muted });
  doc.y += 14;

  doc.heading("Category breakdown");
  if (model.categories.length === 0) doc.note("No transactions in this range.");
  else {
    doc.table(
      [{ label: "Category", width: 190 }, { label: `Total (${code})`, width: 110, align: "right" }, { label: "Share", width: 60, align: "right" }, { label: "", width: 150 }],
      model.categories.map((c) => [c.name, money(code, c.total).replace(`${code} `, ""), pct(c.share), { bar: c.share }]),
    );
  }

  doc.heading("Loans (cash lending only)");
  doc.table(
    [{ label: "Metric", width: 300 }, { label: `Amount (${code})`, width: 215, align: "right" }],
    [
      ["Owed to you", { text: money(code, model.loans.owedToYou), color: COLORS.green, bold: true }],
      ["You owe", { text: money(code, model.loans.youOwe), color: COLORS.red, bold: true }],
      [{ text: "Net loan position", bold: true }, { text: money(code, model.loans.net), bold: true, color: model.loans.net >= 0 ? COLORS.green : COLORS.red }],
    ],
  );

  doc.heading("Budgets");
  if (model.budgets.length === 0) doc.note("No active budgets.");
  else {
    doc.table(
      [{ label: "Category", width: 135 }, { label: "Period", width: 55 }, { label: "Budget", width: 90, align: "right" }, { label: "Spent", width: 90, align: "right" }, { label: "Used", width: 55, align: "right" }, { label: "Status", width: 90 }],
      model.budgets.map((b) => [
        b.category, b.period,
        money(code, b.amount).replace(`${code} `, ""), money(code, b.spent).replace(`${code} `, ""), pct(b.percent),
        { text: b.status, bold: true, color: b.status === "Over limit" ? COLORS.red : b.status === "Near limit" ? COLORS.amber : COLORS.green },
      ]),
    );
  }

  doc.heading("Savings goals");
  if (model.goals.length === 0) doc.note("No goals.");
  else {
    doc.table(
      [{ label: "Goal", width: 170 }, { label: "Target", width: 95, align: "right" }, { label: "Saved", width: 95, align: "right" }, { label: "Progress", width: 70, align: "right" }, { label: "Status", width: 85 }],
      model.goals.map((g) => [g.name, money(code, g.target).replace(`${code} `, ""), money(code, g.saved).replace(`${code} `, ""), pct(g.percent), { text: g.status, color: g.status === "Completed" ? COLORS.green : COLORS.ink, bold: g.status === "Completed" }]),
    );
  }

  return new Blob([doc.toBytes(`SFMS Financial Report ${model.dateFrom} to ${model.dateTo}`)], { type: "application/pdf" });
}

/* --------------------------------------------------------------- download */

export const EXPORT_FORMATS = {
  pdf: { label: "PDF document", ext: "pdf", build: buildPdf },
  xlsx: { label: "Excel workbook", ext: "xlsx", build: buildXlsx },
  csv: { label: "CSV spreadsheet", ext: "csv", build: buildCsv },
};

/** Builds the file in the browser and starts the download. */
export function downloadReport(model, format) {
  const spec = EXPORT_FORMATS[format];
  if (!spec) throw new Error(`Unknown export format: ${format}`);
  const blob = spec.build(model);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFileName(model, spec.ext);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
