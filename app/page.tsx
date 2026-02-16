"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";

type RecordType = "income" | "expense";

type StatsByCategory = {
  categoryName: string;
  type: RecordType;
  icon: string | null;
  totalCents: number;
};

type StatsByDay = {
  date: string;
  expenseCents: number;
  incomeCents: number;
};

type StatsResponse = {
  totalExpenseCents: number;
  totalIncomeCents: number;
  netCents: number;
  byCategory: StatsByCategory[];
  byDay: StatsByDay[];
};

type BudgetResponse = {
  id: number;
  month: string;
  totalBudgetCents: number;
  createdAt: string;
} | null;

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCentsToYuan(cents: number) {
  return (cents / 100).toLocaleString("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  });
}

function getRemainingDaysInMonth(month: string) {
  const now = new Date();
  const [year, m] = month.split("-").map(Number);

  const end = new Date(Date.UTC(year, m, 0));

  const monthKey = `${year}-${String(m).padStart(2, "0")}`;
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  if (monthKey < currentMonthKey) return 0;
  if (monthKey > currentMonthKey) return end.getUTCDate();

  const todayDate = now.getUTCDate();
  return Math.max(end.getUTCDate() - todayDate + 1, 0);
}

const PIE_COLORS = ["#0f766e", "#0284c7", "#7c3aed", "#db2777", "#ea580c", "#65a30d", "#334155", "#dc2626", "#9ca3af"];

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

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [budget, setBudget] = useState<BudgetResponse>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [statsRes, budgetRes] = await Promise.all([
          fetch(`/api/stats?month=${month}`, { cache: "no-store" }),
          fetch(`/api/budget?month=${month}`, { cache: "no-store" }),
        ]);

        const statsData = await parseResponseJson(statsRes);
        const budgetData = await parseResponseJson(budgetRes);

        if (!statsRes.ok) throw new Error((statsData && typeof statsData.error === "string" ? statsData.error : "加载统计数据失败"));
        if (!budgetRes.ok) throw new Error((budgetData && typeof budgetData.error === "string" ? budgetData.error : "加载预算失败"));

        setStats((statsData?.data as StatsResponse | undefined) || null);
        setBudget((budgetData?.data as BudgetResponse | undefined) || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载数据失败");
        setStats(null);
        setBudget(null);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [month]);

  const expenseByDay = useMemo(
    () =>
      (stats?.byDay || []).map((d) => ({
        date: d.date.slice(8, 10),
        expenseCents: d.expenseCents,
      })),
    [stats]
  );

  const expenseByCategoryForPie = useMemo(() => {
    const expenseCategories = (stats?.byCategory || []).filter((item) => item.type === "expense");
    if (expenseCategories.length <= 8) return expenseCategories;

    const top8 = expenseCategories.slice(0, 8);
    const otherTotal = expenseCategories.slice(8).reduce((sum, item) => sum + item.totalCents, 0);

    return [
      ...top8,
      {
        categoryName: "Other",
        type: "expense" as const,
        icon: null,
        totalCents: otherTotal,
      },
    ];
  }, [stats]);

  const top5ExpenseCategories = useMemo(
    () => (stats?.byCategory || []).filter((item) => item.type === "expense").slice(0, 5),
    [stats]
  );

  const budgetCents = budget?.totalBudgetCents || 0;
  const spentCents = stats?.totalExpenseCents || 0;
  const remainingCents = budgetCents - spentCents;
  const remainingDays = getRemainingDaysInMonth(month);
  const dailyBudgetCents = remainingDays > 0 ? Math.floor(remainingCents / remainingDays) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="总支出">
          <p className="text-2xl font-bold text-red-600">{formatCentsToYuan(stats?.totalExpenseCents || 0)}</p>
        </Card>
        <Card title="总收入">
          <p className="text-2xl font-bold text-emerald-600">{formatCentsToYuan(stats?.totalIncomeCents || 0)}</p>
        </Card>
        <Card title="结余">
          <p className={`text-2xl font-bold ${(stats?.netCents || 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatCentsToYuan(stats?.netCents || 0)}
          </p>
        </Card>
      </div>

      <Card title="预算卡片">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Budget</p>
            <p className="text-lg font-semibold">{formatCentsToYuan(budgetCents)}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">已花</p>
            <p className="text-lg font-semibold text-red-600">{formatCentsToYuan(spentCents)}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">剩余</p>
            <p className={`text-lg font-semibold ${remainingCents < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatCentsToYuan(remainingCents)}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">每日可花</p>
            <p className={`text-lg font-semibold ${dailyBudgetCents < 0 ? "text-red-600" : "text-slate-900"}`}>
              {formatCentsToYuan(dailyBudgetCents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">剩余天数：{remainingDays}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="按天支出（柱状图）">
          <div className="h-72">
            {loading ? (
              <p className="text-sm text-slate-500">加载中...</p>
            ) : expenseByDay.length === 0 ? (
              <p className="text-sm text-slate-500">该月暂无支出数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${Math.round(value / 100)}`} />
                  <Tooltip formatter={(value: number) => formatCentsToYuan(value)} />
                  <Bar dataKey="expenseCents" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="支出分类占比（Top 8 + Other）">
          <div className="h-72">
            {loading ? (
              <p className="text-sm text-slate-500">加载中...</p>
            ) : expenseByCategoryForPie.length === 0 ? (
              <p className="text-sm text-slate-500">该月暂无支出分类数据</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategoryForPie}
                    dataKey="totalCents"
                    nameKey="categoryName"
                    outerRadius={110}
                    label={(entry) => `${entry.categoryName}`}
                  >
                    {expenseByCategoryForPie.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCentsToYuan(value)}
                    labelFormatter={(label) => `分类：${String(label)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card title="支出 Top 5 分类排行">
        {loading ? (
          <p className="text-sm text-slate-500">加载中...</p>
        ) : top5ExpenseCategories.length === 0 ? (
          <p className="text-sm text-slate-500">该月暂无支出分类排行</p>
        ) : (
          <ol className="space-y-2">
            {top5ExpenseCategories.map((item, index) => (
              <li key={`${item.categoryName}-${index}`} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <span className="text-sm">
                  <span className="mr-2 font-semibold text-slate-500">#{index + 1}</span>
                  <span className="mr-1">{item.icon || "📁"}</span>
                  {item.categoryName}
                </span>
                <span className="text-sm font-semibold text-slate-900">{formatCentsToYuan(item.totalCents)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
