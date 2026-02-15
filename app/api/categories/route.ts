import { Prisma } from "@prisma/client";
import { badRequest, ok, parseJsonBody, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isRecordType } from "@/lib/validators";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return ok({ data: categories });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (!body || typeof body !== "object") {
    return badRequest("Invalid JSON body.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  const icon = typeof body.icon === "string" ? body.icon.trim() : undefined;

  if (!name) return badRequest("name is required.");
  if (!isRecordType(type)) return badRequest("type must be 'income' or 'expense'.");

  try {
    const category = await prisma.category.create({
      data: {
        name,
        type,
        icon: icon || null,
      },
    });

    return ok({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return badRequest("Category with same name and type already exists.");
    }
    return serverError();
  }
}
