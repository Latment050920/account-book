"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";

type RecordType = "income" | "expense";
type TypeFilter = "all" | RecordType;

type Category = {
  id: number;
  name: string;
  type: RecordType;
  icon: string | null;
};

type TransactionItem = {
  id: number;
  type: RecordType;
  amountCents: number;
  categoryId: number;
  note: string | null;
  happenedAt: string;
  createdAt: string;
  categoryName: string;
  categoryType: RecordType;
  categoryIcon: string | null;
};

type NewTransactionForm = {
  type: RecordType;
  amountYuan: string;
  categoryId: string;
  note: string;
  happenedAt: string;
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getTodayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDateInput() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatCentsToYuan(cents: number) {
  return (cents / 100).toLocaleString("zh-CN", {
    style: "currency",
    currency: "CNY",
  });
}

async function parseResponseJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<NewTransactionForm>({
    type: "expense",
    amountYuan: "",
    categoryId: "",
    note: "",
    happenedAt: getTodayDateInput(),
  });

  async function loadCategories() {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const data = await parseResponseJson(res);
    if (!res.ok) throw new Error((data && typeof data.error === "string" ? data.error : "加载分类失败"));
    setCategories((data?.data as Category[] | undefined) || []);
  }

  async function loadTransactions(targetMonth: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/transactions?month=${targetMonth}`, { cache: "no-store" });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error((data && typeof data.error === "string" ? data.error : "加载流水失败"));
      setTransactions((data?.data as TransactionItem[] | undefined) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载流水失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories().catch((e) => setError(e instanceof Error ? e.message : "加载分类失败"));
  }, []);

  useEffect(() => {
    loadTransactions(month);
  }, [month]);

  const categoriesForForm = useMemo(
    () => categories.filter((c) => c.type === form.type),
    [categories, form.type]
  );

  useEffect(() => {
    if (!categoriesForForm.some((c) => String(c.id) === form.categoryId)) {
      setForm((prev) => ({ ...prev, categoryId: categoriesForForm[0] ? String(categoriesForForm[0].id) : "" }));
    }
  }, [categoriesForForm, form.categoryId]);

  const filteredTransactions = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return transactions.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (categoryFilter !== "all" && String(item.categoryId) !== categoryFilter) return false;
      if (kw && !(item.note || "").toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, keyword]);

  function resetForm() {
    const expenseCategory = categories.find((c) => c.type === "expense");
    setForm({
      type: "expense",
      amountYuan: "",
      categoryId: expenseCategory ? String(expenseCategory.id) : "",
      note: "",
      happenedAt: getTodayDateInput(),
    });
    setFormError("");
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setOpen(false);
    setFormError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const amountNumber = Number(form.amountYuan);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFormError("金额必须大于 0。");
      return;
    }

    const amountCents = Math.round(amountNumber * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      setFormError("金额格式不正确。");
      return;
    }

    if (!form.categoryId) {
      setFormError("请选择分类。");
      return;
    }

    if (!form.happenedAt) {
      setFormError("请选择日期。");
      return;
    }

    const happenedAt = new Date(`${form.happenedAt}T12:00:00.000Z`);
    if (Number.isNaN(happenedAt.getTime())) {
      setFormError("日期不合法。");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          amountCents,
          categoryId: form.categoryId,
          note: form.note.trim() || undefined,
          happenedAt: happenedAt.toISOString(),
        }),
      });

      const data = await parseResponseJson(res);
      if (!res.ok) {
        setFormError((data && typeof data.error === "string" ? data.error : "新增失败"));
        return;
      }

      await loadTransactions(month);
      setOpen(false);
      resetForm();
    } catch {
      setFormError("新增失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          <Button onClick={openModal}>新增</Button>
        </div>
      </div>

      <Card title="筛选">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}>
            <option value="all">全部类型</option>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </Select>

          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">全部分类</option>
            {categories
              .filter((c) => (typeFilter === "all" ? true : c.type === typeFilter))
              .map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
          </Select>

          <Input
            placeholder="关键词（note）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="md:col-span-2"
          />
        </div>
      </Card>

      <Card title={`流水列表（${month}）`}>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-slate-500">加载中...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">暂无流水</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">日期</th>
                  <th className="px-2 py-2">类型</th>
                  <th className="px-2 py-2">分类</th>
                  <th className="px-2 py-2">金额</th>
                  <th className="px-2 py-2">备注</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-2 py-2">{new Date(item.happenedAt).toISOString().slice(0, 10)}</td>
                    <td className="px-2 py-2">{item.type === "expense" ? "支出" : "收入"}</td>
                    <td className="px-2 py-2">
                      {item.categoryIcon ? `${item.categoryIcon} ` : ""}
                      {item.categoryName}
                    </td>
                    <td className={`px-2 py-2 font-medium ${item.type === "expense" ? "text-red-600" : "text-emerald-600"}`}>
                      {item.type === "expense" ? "-" : "+"}
                      {formatCentsToYuan(item.amountCents)}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{item.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} title="新增流水" onClose={closeModal}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as RecordType }))}
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </Select>

            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="金额（元）"
              value={form.amountYuan}
              onChange={(e) => setForm((prev) => ({ ...prev, amountYuan: e.target.value }))}
            />

            <Select
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            >
              {categoriesForForm.length === 0 ? <option value="">暂无可选分类</option> : null}
              {categoriesForForm.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={form.happenedAt}
                onChange={(e) => setForm((prev) => ({ ...prev, happenedAt: e.target.value }))}
              />
              <Button
                type="button"
                className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                onClick={() => setForm((prev) => ({ ...prev, happenedAt: getYesterdayDateInput() }))}
              >
                昨天
              </Button>
            </div>
          </div>

          <Input
            placeholder="备注（可选）"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
          />

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              className="bg-slate-100 text-slate-700 hover:bg-slate-200"
              onClick={closeModal}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting || categoriesForForm.length === 0}>
              {submitting ? "提交中..." : "提交"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
