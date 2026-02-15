import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const expenseCategories = [
  { name: "餐饮", type: "expense", icon: "🍜" },
  { name: "交通", type: "expense", icon: "🚌" },
  { name: "购物", type: "expense", icon: "🛍️" },
  { name: "房租", type: "expense", icon: "🏠" },
  { name: "水电煤", type: "expense", icon: "💡" },
  { name: "通讯", type: "expense", icon: "📱" },
  { name: "医疗", type: "expense", icon: "💊" },
  { name: "娱乐", type: "expense", icon: "🎮" },
  { name: "学习", type: "expense", icon: "📚" },
  { name: "其他支出", type: "expense", icon: "🧾" },
];

const incomeCategories = [
  { name: "工资", type: "income", icon: "💼" },
  { name: "奖金", type: "income", icon: "🎁" },
  { name: "副业", type: "income", icon: "🧑‍💻" },
  { name: "投资", type: "income", icon: "📈" },
  { name: "其他收入", type: "income", icon: "💰" },
];

async function main() {
  const allCategories = [...expenseCategories, ...incomeCategories];

  for (const category of allCategories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: { icon: category.icon },
      create: category,
    });
  }

  const expenseCount = await prisma.category.count({ where: { type: "expense" } });
  const incomeCount = await prisma.category.count({ where: { type: "income" } });

  console.log(`Seed completed: expense=${expenseCount}, income=${incomeCount}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
