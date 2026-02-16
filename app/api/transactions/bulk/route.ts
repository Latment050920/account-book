import { NextResponse } from "next/server";
import { badRequest, ok, parseJsonBody, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isRecordType, parseISODate, parsePositiveInt } from "@/lib/validators";

type BulkItem = {
  type: unknown;
  amountCents: unknown;
  currency?: unknown;
  categoryId: unknown;
  note?: unknown;
  happenedAt: unknown;
};

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
    return badRequest("items must be an array.");
  }

  const items = body.items as BulkItem[];
  if (items.length === 0) {
    return badRequest("items cannot be empty.");
  }

  try {
    const categories = await prisma.category.findMany({
      select: { id: true, type: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const validData: {
      type: "income" | "expense";
      amountCents: number;
      categoryId: number;
      note: string | null;
      happenedAt: Date;
    }[] = [];

    const errors: Array<{ index: number; message: string }> = [];

    items.forEach((item, index) => {
      const type = item.type;
      const amountCents = parsePositiveInt(item.amountCents);
      const categoryId =
        typeof item.categoryId === "number"
          ? item.categoryId
          : typeof item.categoryId === "string" && /^\d+$/.test(item.categoryId)
            ? Number(item.categoryId)
            : null;
      const happenedAt = parseISODate(item.happenedAt);
      const note = typeof item.note === "string" ? item.note.trim() : null;

      if (!isRecordType(type)) {
        errors.push({ index, message: "type must be 'income' or 'expense'." });
        return;
      }

      if (!amountCents) {
        errors.push({ index, message: "amountCents must be a positive integer." });
        return;
      }

      if (!categoryId || !Number.isSafeInteger(categoryId) || categoryId <= 0) {
        errors.push({ index, message: "categoryId must be a positive integer." });
        return;
      }

      const category = categoryMap.get(categoryId);
      if (!category) {
        errors.push({ index, message: "categoryId does not exist." });
        return;
      }

      if (category.type !== type) {
        errors.push({ index, message: "Transaction type must match category type." });
        return;
      }

      if (!happenedAt) {
        errors.push({ index, message: "happenedAt must be a valid ISO date string." });
        return;
      }

      validData.push({
        type,
        amountCents,
        categoryId,
        note: note || null,
        happenedAt,
      });
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          inserted: 0,
          failed: errors.length,
          errors,
          error: "Some items are invalid.",
        },
        { status: 400 }
      );
    }

    await prisma.transaction.createMany({
      data: validData,
    });

    return ok({
      inserted: validData.length,
      failed: 0,
    });
  } catch {
    return serverError();
  }
}
