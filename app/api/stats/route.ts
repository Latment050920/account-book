import { badRequest, ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseMonth } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseMonth(searchParams.get("month"));

  if (!parsed) {
    return badRequest("month must be YYYY-MM.");
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        happenedAt: {
          gte: parsed.start,
          lt: parsed.end,
        },
      },
      include: {
        category: {
          select: { name: true, type: true, icon: true },
        },
      },
    });

    let totalExpenseCents = 0;
    let totalIncomeCents = 0;

    const byCategoryMap = new Map<
      string,
      { categoryName: string; type: "income" | "expense"; icon: string | null; totalCents: number }
    >();
    const byDayMap = new Map<string, { date: string; expenseCents: number; incomeCents: number }>();

    for (const tx of transactions) {
      if (tx.type === "expense") totalExpenseCents += tx.amountCents;
      if (tx.type === "income") totalIncomeCents += tx.amountCents;

      const categoryKey = `${tx.categoryId}-${tx.type}`;
      const existingCategory = byCategoryMap.get(categoryKey);
      if (existingCategory) {
        existingCategory.totalCents += tx.amountCents;
      } else {
        byCategoryMap.set(categoryKey, {
          categoryName: tx.category.name,
          type: tx.category.type,
          icon: tx.category.icon,
          totalCents: tx.amountCents,
        });
      }

      const date = tx.happenedAt.toISOString().slice(0, 10);
      const existingDay = byDayMap.get(date);
      if (existingDay) {
        if (tx.type === "expense") existingDay.expenseCents += tx.amountCents;
        if (tx.type === "income") existingDay.incomeCents += tx.amountCents;
      } else {
        byDayMap.set(date, {
          date,
          expenseCents: tx.type === "expense" ? tx.amountCents : 0,
          incomeCents: tx.type === "income" ? tx.amountCents : 0,
        });
      }
    }

    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.totalCents - a.totalCents);
    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return ok({
      data: {
        totalExpenseCents,
        totalIncomeCents,
        netCents: totalIncomeCents - totalExpenseCents,
        byCategory,
        byDay,
      },
    });
  } catch {
    return serverError();
  }
}
