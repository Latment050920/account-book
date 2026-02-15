import { badRequest, ok, parseJsonBody, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isRecordType, parseISODate, parseIdFromString, parseMonth, parsePositiveInt } from "@/lib/validators";

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
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
          },
        },
      },
      orderBy: {
        happenedAt: "desc",
      },
    });

    return ok({
      data: transactions.map((item) => ({
        id: item.id,
        type: item.type,
        amountCents: item.amountCents,
        categoryId: item.categoryId,
        note: item.note,
        happenedAt: item.happenedAt,
        createdAt: item.createdAt,
        categoryName: item.category.name,
        categoryType: item.category.type,
        categoryIcon: item.category.icon,
      })),
    });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON body.");
  }

  const type = body.type;
  const amountCents = parsePositiveInt(body.amountCents);
  const categoryId = parseIdFromString(body.categoryId);
  const note = typeof body.note === "string" ? body.note.trim() : undefined;
  const happenedAt = parseISODate(body.happenedAt);

  if (!isRecordType(type)) return badRequest("type must be 'income' or 'expense'.");
  if (!amountCents) return badRequest("amountCents must be a positive integer.");
  if (!categoryId) return badRequest("categoryId must be a numeric string.");
  if (!happenedAt) return badRequest("happenedAt must be a valid ISO date string.");

  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return badRequest("categoryId does not exist.");
    if (category.type !== type) {
      return badRequest("Transaction type must match category type.");
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amountCents,
        categoryId,
        note: note || null,
        happenedAt,
      },
      include: {
        category: {
          select: { name: true, type: true, icon: true },
        },
      },
    });

    return ok(
      {
        data: {
          id: transaction.id,
          type: transaction.type,
          amountCents: transaction.amountCents,
          categoryId: transaction.categoryId,
          note: transaction.note,
          happenedAt: transaction.happenedAt,
          createdAt: transaction.createdAt,
          categoryName: transaction.category.name,
          categoryType: transaction.category.type,
          categoryIcon: transaction.category.icon,
        },
      },
      { status: 201 }
    );
  } catch {
    return serverError();
  }
}
