"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  createdAt: string;
};

type Budget = {
  id: number;
  month: string;
  totalBudgetCents: number;
  createdAt: string;
};

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCentsToYuan(cents: number) {
  return (cents / 100).toLocaleString("zh-CN", {
    style: "currency",
    currency: "CNY",
  });
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<RecordType>("expense");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categorySubmitError, setCategorySubmitError] = useState("");

  const [budgetMonth, setBudgetMonth] = useState(getCurrentMonth());
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetSuccess, setBudgetSuccess] = useState("");

  const incomeCategories = useMemo(() => categories.filter((c) => c.type === "income"), [categories]);
  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);

  async function loadCategories() {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载分类失败");
      setCategories(data.data || []);
    } catch (e) {
      setCategoriesError(e instanceof Error ? e.message : "加载分类失败");
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadBudget(month: string) {
    setBudgetLoading(true);
    setBudgetError("");
    setBudgetSuccess("");
    try {
      const res = await fetch(`/api/budget?month=${month}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载预算失败");

      const fetchedBudget = data.data as Budget | null;
      setBudget(fetchedBudget);
      setBudgetInput(fetchedBudget ? String(fetchedBudget.totalBudgetCents) : "");
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : "加载预算失败");
    } finally {
      setBudgetLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBudget(budgetMonth);
  }, [budgetMonth]);

  async function onAddCategory(e: FormEvent) {
    e.preventDefault();
    setCategorySubmitError("");

    const name = newCategoryName.trim();
    const icon = newCategoryIcon.trim();
    if (!name) {
      setCategorySubmitError("分类名称不能为空。");
      return;
    }

    setCategorySubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: newCategoryType,
          icon: icon || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategorySubmitError(data.error || "新增分类失败");
        return;
      }

      setNewCategoryName("");
      setNewCategoryIcon("");
      await loadCategories();
    } catch {
      setCategorySubmitError("新增分类失败，请稍后重试。");
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function onSaveBudget(e: FormEvent) {
    e.preventDefault();
    setBudgetError("");
    setBudgetSuccess("");

    const totalBudgetCents = Number(budgetInput);
    if (!Number.isInteger(totalBudgetCents) || totalBudgetCents <= 0) {
      setBudgetError("预算必须是大于 0 的整数分。示例：500000");
      return;
    }

    setBudgetSubmitting(true);
    try {
      const res = await fetch(`/api/budget?month=${budgetMonth}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalBudgetCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBudgetError(data.error || "保存预算失败");
        return;
      }

      setBudgetSuccess("预算已保存。")
      await loadBudget(budgetMonth);
    } catch {
      setBudgetError("保存预算失败，请稍后重试。");
    } finally {
      setBudgetSubmitting(false);
    }
  }

  function renderCategoryList(items: Category[]) {
    if (items.length === 0) {
      return <p className="text-sm text-slate-500">暂无分类</p>;
    }

    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span>
              <span className="mr-1">{item.icon || "📁"}</span>
              {item.name}
            </span>
            <span className="text-xs text-slate-500">#{item.id}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card title="新增分类">
        <form onSubmit={onAddCategory} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            placeholder="分类名称"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value as RecordType)}>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </Select>
          <Input placeholder="图标（可选）" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} />

          <div className="md:col-span-4 flex items-center justify-between gap-2">
            {categorySubmitError ? <p className="text-sm text-red-600">{categorySubmitError}</p> : <span />}
            <Button type="submit" disabled={categorySubmitting}>
              {categorySubmitting ? "提交中..." : "新增分类"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="支出分类">
          {categoriesLoading ? <p className="text-sm text-slate-500">加载中...</p> : renderCategoryList(expenseCategories)}
        </Card>
        <Card title="收入分类">
          {categoriesLoading ? <p className="text-sm text-slate-500">加载中...</p> : renderCategoryList(incomeCategories)}
        </Card>
      </div>
      {categoriesError ? <p className="text-sm text-red-600">{categoriesError}</p> : null}

      <Card title="月预算设置（单位：分）">
        <form onSubmit={onSaveBudget} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input type="month" value={budgetMonth} onChange={(e) => setBudgetMonth(e.target.value)} />
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="totalBudgetCents"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <Button type="submit" disabled={budgetLoading || budgetSubmitting}>
            {budgetSubmitting ? "保存中..." : "保存预算"}
          </Button>
        </form>

        <div className="mt-3 space-y-1 text-sm">
          <p>
            当前预算：
            <span className="font-semibold">
              {budget ? `${budget.totalBudgetCents} 分（${formatCentsToYuan(budget.totalBudgetCents)}）` : "未设置"}
            </span>
          </p>
          {budgetError ? <p className="text-red-600">{budgetError}</p> : null}
          {budgetSuccess ? <p className="text-emerald-600">{budgetSuccess}</p> : null}
        </div>
      </Card>
    </div>
  );
}
