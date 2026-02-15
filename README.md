# Account Book（Phase 1 + Phase 2）

个人生活记账可视化 Web App。当前已完成：

- Phase 1：Next.js + TypeScript + Tailwind 基础骨架与三页面
- Phase 2：Prisma + SQLite 开发数据库 + 初始分类 seed

## 技术栈

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- Prisma
- SQLite（开发环境）
- pnpm

## 环境准备

在项目根目录创建 `.env`（仓库已提供示例）：

```env
DATABASE_URL="file:./dev.db"
```

## 本地运行（页面）

```bash
pnpm install
pnpm dev
```

访问地址：

- `http://localhost:3000/`
- `http://localhost:3000/transactions`
- `http://localhost:3000/settings`

## Phase 2：Prisma 数据库初始化与种子数据

### 1) 生成迁移并创建数据库

```bash
pnpm prisma migrate dev --name init
```

### 2) 执行 seed（写入分类）

```bash
pnpm prisma db seed
```

### 3) 可选：打开 Prisma Studio 验证

```bash
pnpm prisma studio
```

## 数据模型（Phase 2）

- `Category`: `id`, `name`, `type(income|expense)`, `icon?`, `createdAt`
- `Transaction`: `id`, `type`, `amount`（整数分）, `categoryId`, `note?`, `happenedAt`, `createdAt`
- `Budget`: `id`, `month(YYYY-MM)`, `totalBudget`（整数分）, `createdAt`

## Seed 说明

- 提供至少 10 个支出分类 + 5 个收入分类
- 使用 `upsert`，重复执行不会产生重复分类（按 `name + type` 唯一）

## 验收步骤（Phase 2）

1. 执行：

   ```bash
   pnpm install
   pnpm prisma migrate dev --name init
   pnpm prisma db seed
   ```

2. 打开 studio：

   ```bash
   pnpm prisma studio
   ```

3. 在 `Category` 表中确认：

- 有支出分类 ≥ 10
- 有收入分类 ≥ 5

## 注意事项

- 金额统一使用“整数分”存储（`Transaction.amount`, `Budget.totalBudget`）。
- `Budget.month` 使用 `YYYY-MM` 字符串，且唯一。
- 若你本地 registry 被改动导致安装失败，可切回 npm 官方源：

  ```bash
  pnpm config set registry https://registry.npmjs.org
  ```

