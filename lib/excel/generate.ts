import * as XLSX from "xlsx";
import { ExtractedData, Locale } from "@/types";

interface AccountingEntry {
  date: string | null;
  description: string;
  account: string;
  debit: number | null;
  credit: number | null;
  currency: string;
  confidence: string;
  notes: string;
}

interface AccountingData {
  entries: AccountingEntry[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
}

export function generateAccountingExcel(
  accountingData: AccountingData,
  documentName: string,
  locale: Locale
): Buffer {
  const wb = XLSX.utils.book_new();

  const headers =
    locale === "sw"
      ? ["Tarehe", "Maelezo", "Hesabu", "Debit (TZS)", "Credit (TZS)", "Sarafu", "Uhakika", "Maelezo ya Ziada"]
      : ["Date", "Description", "Account", "Debit (TZS)", "Credit (TZS)", "Currency", "Confidence", "Notes"];

  const rows = accountingData.entries.map((e) => [
    e.date ?? "",
    e.description,
    e.account,
    e.debit ?? "",
    e.credit ?? "",
    e.currency,
    e.confidence,
    e.notes,
  ]);

  const totalsLabel = locale === "sw" ? ["", "", "JUMLA", accountingData.totals.totalDebit, accountingData.totals.totalCredit, "", "", ""] : ["", "", "TOTALS", accountingData.totals.totalDebit, accountingData.totals.totalCredit, "", "", ""];
  const balanceLabel = locale === "sw" ? ["", "", "SALIO", "", accountingData.totals.balance, "", "", ""] : ["", "", "BALANCE", "", accountingData.totals.balance, "", "", ""];

  const data = [headers, ...rows, [], totalsLabel, balanceLabel];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Style the header row
  ws["!cols"] = [
    { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 10 }, { wch: 12 }, { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, locale === "sw" ? "Uhasibu" : "Accounting");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generateExtractedFieldsExcel(
  extractedData: ExtractedData,
  documentName: string,
  locale: Locale
): Buffer {
  const wb = XLSX.utils.book_new();

  const headers =
    locale === "sw"
      ? ["Uwanja", "Thamani", "Thamani Iliyosahihishwa", "Uhakika", "Chanzo", "Haiwezi Kusomwa"]
      : ["Field", "Value", "Corrected Value", "Confidence", "Source Note", "Unreadable"];

  const rows = extractedData.fields.map((f) => [
    locale === "sw" ? f.labelSw : f.label,
    f.value ?? "",
    f.correctedValue ?? "",
    f.confidence,
    f.sourceNote,
    f.isUnreadable ? (locale === "sw" ? "Ndiyo" : "Yes") : (locale === "sw" ? "Hapana" : "No"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 35 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, locale === "sw" ? "Sehemu" : "Fields");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
