"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

type RecordType = "income" | "expense";

type Category = {
  id: number;
  name: string;
  type: RecordType;
  icon: string | null;
};

type MappingConfig = {
  dateColumn: string;
  amountColumn: string;
  typeColumn: string;
  categoryColumn: string;
  noteColumn: string;
  currencyColumn: string;
};

type ParsedPreviewRow = {
  index: number;
  status: "OK" | "ERROR";
  message?: string;
  parsed?: {
    type: RecordType;
    amountCents: number;
    categoryId: number;
    note?: string;
    happenedAt: string;
    currency?: string;
  };
};

const NONE = "__NONE__";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

function parseDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T12:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmountToCents(value: string): number | null {
  const cleaned = value
    .replace(/HK\$/gi, "")
    .replace(/AUD/gi, "")
    .replace(/JPY/gi, "")
    .replace(/[￥$¥,\s]/g, "")
    .trim();

  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;

  const cents = Math.round(n * 100);
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return cents;
}

function parseType(raw: string, fallback: RecordType): RecordType | null {
  const v = raw.trim().toLowerCase();
  if (!v) return fallback;
  if (["income", "收入"].includes(v)) return "income";
  if (["expense", "支出"].includes(v)) return "expense";
  return null;
}

async function parseResponseJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function ImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const [mapping, setMapping] = useState<MappingConfig>({
    dateColumn: NONE,
    amountColumn: NONE,
    typeColumn: NONE,
    categoryColumn: NONE,
    noteColumn: NONE,
    currencyColumn: NONE,
  });

  const [defaultType, setDefaultType] = useState<RecordType>("expense");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("CNY");

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    failed: number;
    errors?: Array<{ index: number; message: string }>;
  } | null>(null);

  const defaultCategories = useMemo(
    () => categories.filter((c) => c.type === defaultType),
    [categories, defaultType]
  );

  const categoryByName = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.name.trim().toLowerCase(), c));
    return m;
  }, [categories]);

  useEffect(() => {
    if (!defaultCategories.some((c) => String(c.id) === defaultCategoryId)) {
      setDefaultCategoryId(defaultCategories[0] ? String(defaultCategories[0].id) : "");
    }
  }, [defaultCategories, defaultCategoryId]);

  const parsedPreview = useMemo<ParsedPreviewRow[]>(() => {
    if (mapping.dateColumn === NONE || mapping.amountColumn === NONE) return [];

    return rows.map((raw, idx) => {
      const rowNumber = idx + 2;
      const rawDate = raw[mapping.dateColumn] || "";
      const rawAmount = raw[mapping.amountColumn] || "";
      const rawType = mapping.typeColumn !== NONE ? raw[mapping.typeColumn] || "" : "";
      const rawCategory = mapping.categoryColumn !== NONE ? raw[mapping.categoryColumn] || "" : "";
      const rawNote = mapping.noteColumn !== NONE ? raw[mapping.noteColumn] || "" : "";
      const rawCurrency = mapping.currencyColumn !== NONE ? raw[mapping.currencyColumn] || "" : "";

      const date = parseDate(rawDate);
      if (!date) return { index: rowNumber, status: "ERROR", message: `第 ${rowNumber} 行日期解析失败` };

      const amountCents = parseAmountToCents(rawAmount);
      if (!amountCents) return { index: rowNumber, status: "ERROR", message: `第 ${rowNumber} 行金额解析失败` };

      const type = parseType(rawType, defaultType);
      if (!type) return { index: rowNumber, status: "ERROR", message: `第 ${rowNumber} 行 type 无效` };

      let categoryId = Number(defaultCategoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return { index: rowNumber, status: "ERROR", message: `第 ${rowNumber} 行缺少默认分类` };
      }

      if (rawCategory.trim()) {
        const matched = categoryByName.get(rawCategory.trim().toLowerCase());
        if (matched && matched.type === type) {
          categoryId = matched.id;
        }
      }

      const fallbackCategory = categories.find((c) => c.id === categoryId);
      if (!fallbackCategory || fallbackCategory.type !== type) {
        return { index: rowNumber, status: "ERROR", message: `第 ${rowNumber} 行分类与类型不匹配` };
      }

      return {
        index: rowNumber,
        status: "OK",
        parsed: {
          type,
          amountCents,
          categoryId,
          note: rawNote.trim() || undefined,
          happenedAt: date.toISOString(),
          currency: rawCurrency.trim() || defaultCurrency,
        },
      };
    });
  }, [rows, mapping, defaultType, defaultCategoryId, defaultCurrency, categories, categoryByName]);

  const okRows = useMemo(() => parsedPreview.filter((r) => r.status === "OK" && r.parsed), [parsedPreview]);

  useEffect(() => {
    async function loadCategories() {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error((data && typeof data.error === "string" ? data.error : "加载分类失败"));

      const all = (data?.data as Category[] | undefined) || [];
      setCategories(all);
      const firstExpense = all.find((c) => c.type === "expense");
      if (firstExpense) setDefaultCategoryId(String(firstExpense.id));
    }

    loadCategories().catch((e) => setError(e instanceof Error ? e.message : "加载分类失败"));
  }, []);

  function guessColumnName(list: string[], localHeaders: string[]) {
    return localHeaders.find((h) => list.includes(h.trim().toLowerCase())) || NONE;
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImportResult(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("仅支持 .csv 文件");
      return;
    }

    setError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);

      setMapping({
        dateColumn: guessColumnName(["date", "日期", "happenedat"], parsed.headers),
        amountColumn: guessColumnName(["amount", "金额", "money"], parsed.headers),
        typeColumn: guessColumnName(["type", "类型"], parsed.headers),
        categoryColumn: guessColumnName(["category", "分类"], parsed.headers),
        noteColumn: guessColumnName(["note", "备注", "memo"], parsed.headers),
        currencyColumn: guessColumnName(["currency", "币种"], parsed.headers),
      });
    };
    reader.readAsText(file, "utf-8");
  }

  async function onImport() {
    if (okRows.length === 0) {
      setError("没有可导入的有效行。");
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: okRows.map((r) => r.parsed),
        }),
      });

      const data = await parseResponseJson(res);
      if (!res.ok) {
        setError((data && typeof data.error === "string" ? data.error : "导入失败"));
        setImportResult({
          inserted: data?.inserted || 0,
          failed: data?.failed || 0,
          errors: data?.errors,
        });
        return;
      }

      setImportResult({
        inserted: data?.inserted || 0,
        failed: data?.failed || 0,
        errors: data?.errors,
      });
    } catch {
      setError("导入失败，请稍后重试。");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">CSV 导入</h1>

      <Card title="1) 上传 CSV">
        <Input type="file" accept=".csv,text/csv" onChange={onFileChange} />
        {fileName ? <p className="mt-2 text-sm text-slate-600">已选择：{fileName}</p> : null}
      </Card>

      <Card title="2) 列映射配置">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm">date 列（必选）</p>
            <Select value={mapping.dateColumn} onChange={(e) => setMapping((m) => ({ ...m, dateColumn: e.target.value }))}>
              <option value={NONE}>请选择</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-sm">amount 列（必选）</p>
            <Select value={mapping.amountColumn} onChange={(e) => setMapping((m) => ({ ...m, amountColumn: e.target.value }))}>
              <option value={NONE}>请选择</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-1 text-sm">type 列（可选）</p>
            <Select value={mapping.typeColumn} onChange={(e) => setMapping((m) => ({ ...m, typeColumn: e.target.value }))}>
              <option value={NONE}>不使用</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-sm">默认 type（type 列缺省时生效）</p>
            <Select value={defaultType} onChange={(e) => setDefaultType(e.target.value as RecordType)}>
              <option value="expense">expense</option>
              <option value="income">income</option>
            </Select>
          </div>

          <div>
            <p className="mb-1 text-sm">category 列（可选）</p>
            <Select value={mapping.categoryColumn} onChange={(e) => setMapping((m) => ({ ...m, categoryColumn: e.target.value }))}>
              <option value={NONE}>不使用</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-sm">默认分类（匹配不到时使用）</p>
            <Select value={defaultCategoryId} onChange={(e) => setDefaultCategoryId(e.target.value)}>
              {defaultCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>
              ))}
            </Select>
          </div>

          <div>
            <p className="mb-1 text-sm">note 列（可选）</p>
            <Select value={mapping.noteColumn} onChange={(e) => setMapping((m) => ({ ...m, noteColumn: e.target.value }))}>
              <option value={NONE}>不使用</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-sm">currency 列（可选）/ 默认币种</p>
            <div className="flex gap-2">
              <Select value={mapping.currencyColumn} onChange={(e) => setMapping((m) => ({ ...m, currencyColumn: e.target.value }))}>
                <option value={NONE}>不使用</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </Select>
              <Input value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value || "CNY")} className="w-24" />
            </div>
          </div>
        </div>
      </Card>

      <Card title={`3) 预览（前 50 行） | OK ${okRows.length} / TOTAL ${parsedPreview.length}`}>
        {parsedPreview.length === 0 ? (
          <p className="text-sm text-slate-500">请先上传 CSV 并完成必选映射。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">行号</th>
                  <th className="px-2 py-2">状态</th>
                  <th className="px-2 py-2">日期</th>
                  <th className="px-2 py-2">类型</th>
                  <th className="px-2 py-2">金额(分)</th>
                  <th className="px-2 py-2">分类ID</th>
                  <th className="px-2 py-2">备注</th>
                  <th className="px-2 py-2">错误</th>
                </tr>
              </thead>
              <tbody>
                {parsedPreview.slice(0, 50).map((r) => (
                  <tr key={r.index} className="border-b border-slate-100">
                    <td className="px-2 py-2">{r.index}</td>
                    <td className={`px-2 py-2 font-semibold ${r.status === "OK" ? "text-emerald-600" : "text-red-600"}`}>{r.status}</td>
                    <td className="px-2 py-2">{r.parsed ? r.parsed.happenedAt.slice(0, 10) : "-"}</td>
                    <td className="px-2 py-2">{r.parsed?.type || "-"}</td>
                    <td className="px-2 py-2">{r.parsed?.amountCents ?? "-"}</td>
                    <td className="px-2 py-2">{r.parsed?.categoryId ?? "-"}</td>
                    <td className="px-2 py-2">{r.parsed?.note || "-"}</td>
                    <td className="px-2 py-2 text-red-600">{r.message || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={onImport} disabled={importing || okRows.length === 0}>
            {importing ? "导入中..." : "一键导入（仅 OK 行）"}
          </Button>
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>

        {importResult ? (
          <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm">
            <p>导入完成：inserted={importResult.inserted}, failed={importResult.failed}</p>
            {importResult.errors?.length ? (
              <ul className="mt-2 list-disc pl-5 text-red-600">
                {importResult.errors.slice(0, 10).map((rowErr) => (
                  <li key={`${rowErr.index}-${rowErr.message}`}>index={rowErr.index}: {rowErr.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
