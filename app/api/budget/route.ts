import { badRequest, ok, parseJsonBody, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseMonth, parsePositiveInt } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseMonth(searchParams.get("month"));

  if (!parsed) {
    return badRequest("month must be YYYY-MM.");
  }

  try {
    const budget = await prisma.budget.findUnique({
      where: { month: parsed.month },
    });

    return ok({ data: budget ?? null });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseMonth(searchParams.get("month"));

  if (!parsed) {
    return badRequest("month must be YYYY-MM.");
  }

  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON body.");
  }

  const totalBudgetCents = parsePositiveInt(body.totalBudgetCents);
  if (!totalBudgetCents) {
    return badRequest("totalBudgetCents must be a positive integer.");
  }

  try {
    const budget = await prisma.budget.upsert({
      where: { month: parsed.month },
      update: { totalBudgetCents },
      create: {
        month: parsed.month,
        totalBudgetCents,
      },
    });

    return ok({ data: budget });
  } catch {
    return serverError();
  }
}
