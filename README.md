# Account Book

一个面向个人生活记账的可视化 Web App（MVP），目标是：

- **低摩擦记账**（快速新增、按月查看、常用筛选）
- **可视化复盘**（KPI、按天趋势、分类占比、Top 分类）
- **预算管理**（按月预算、预算剩余、每日可花）

---

## 目录

- [1. 功能概览](#1-功能概览)
- [2. 技术栈](#2-技术栈)
- [3. 数据规范](#3-数据规范)
- [4. 项目结构](#4-项目结构)
- [5. 本地快速开始](#5-本地快速开始)
- [6. 页面使用教程](#6-页面使用教程)
- [7. API 使用教程（含 curl 示例）](#7-api-使用教程含-curl-示例)
- [8. 常见问题排查](#8-常见问题排查)
- [9. 验收清单（手工测试建议）](#9-验收清单手工测试建议)

---

## 1. 功能概览

### Dashboard `/`

- 月份选择（默认当前月）
- KPI：总支出 / 总收入 / 结余
- 图表：
  - 按天支出柱状图（byDay）
  - 支出分类占比环图（Top 8 + Other）
- 支出 Top5 分类排行
- 预算卡片：
  - budget
  - 已花
  - 剩余
  - 每日可花（`(budget - 已花) / 剩余天数`）

### Transactions `/transactions`

- 月份切换查看流水
- 列表字段：日期、类型、分类、金额、备注
- 筛选：类型（all/income/expense）+ 分类 + 备注关键词
- 新增流水 Modal：
  - type
  - amount（输入元，提交转分）
  - category
  - note
  - happenedAt（默认今天，含“昨天”快捷）

### Settings `/settings`

- 分类管理：按 income / expense 分组展示
- 新增分类（调用 `POST /api/categories`）
- 预算管理：按月设置 `totalBudgetCents`（分）
- 预算保存后会重新拉取，刷新页面后仍存在（数据库持久化）

---

## 2. 技术栈

- **Next.js（App Router）**
- **TypeScript**
- **Tailwind CSS**
- **Prisma**
- **SQLite（dev）**
- **Recharts**
- **pnpm**

---

## 3. 数据规范

### 金额规范（非常重要）

- 存储与传输统一使用**整数分**：
  - `Transaction.amountCents`
  - `Budget.totalBudgetCents`
- UI 显示时再格式化为“元”。

### 核心模型

- `Category`: `id`, `name`, `type(income|expense)`, `icon?`, `createdAt`
- `Transaction`: `id`, `type`, `amountCents`, `categoryId`, `note?`, `happenedAt`, `createdAt`
- `Budget`: `id`, `month(YYYY-MM)`, `totalBudgetCents`, `createdAt`

---

## 4. 项目结构

```txt
app/
  api/
    budget/route.ts
    categories/route.ts
    stats/route.ts
    transactions/route.ts
  layout.tsx
  page.tsx                # Dashboard
  transactions/page.tsx
  settings/page.tsx
components/
  Button.tsx
  Card.tsx
  Input.tsx
  Modal.tsx
  Select.tsx
lib/
  api.ts                  # JSON 响应助手
  prisma.ts               # Prisma 单例
  validators.ts           # 输入校验工具
prisma/
  schema.prisma
  seed.mjs
```

---

## 5. 本地快速开始

### 5.1 环境要求

- Node.js 18+（建议 20+）
- pnpm 9+

### 5.2 环境变量

项目根目录确保有 `.env`：

```env
DATABASE_URL="file:./dev.db"
```

如果你要重建，可参考 `.env.example`。

### 5.3 安装、迁移、种子、启动

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

启动后访问：

- `http://localhost:3000/`
- `http://localhost:3000/transactions`
- `http://localhost:3000/settings`

### 5.4 可选：查看数据库

```bash
pnpm prisma studio
```

---

## 6. 页面使用教程

### 6.1 Dashboard 教程

1. 进入 `/`。
2. 右上角选择月份（`YYYY-MM`）。
3. 观察 KPI 与图表是否联动变化。
4. 查看预算卡片：
   - 若当月未设置预算，budget 显示为 0。
   - 设置预算后，可看到“已花 / 剩余 / 每日可花”。

### 6.2 Transactions 教程

1. 进入 `/transactions`。
2. 通过顶部月份选择切换账期。
3. 使用筛选条件逐步定位流水：
   - 类型筛选
   - 分类筛选
   - note 关键词
4. 点击“新增”：
   - 填写金额（元）
   - 选择分类
   - 日期可点“昨天”快捷
5. 提交成功后：Modal 关闭，列表自动刷新。

### 6.3 Settings 教程

#### 新增分类

1. 进入 `/settings`。
2. 在“新增分类”输入名称，选择类型，可选 icon。
3. 点击“新增分类”。
4. 对应分组（支出/收入）列表会立即更新。

#### 设置预算

1. 在“月预算设置”中选择月份。
2. 输入 `totalBudgetCents`（分，正整数），例如 `500000` 表示 `¥5000.00`。
3. 点击“保存预算”。
4. 页面会显示“预算已保存”，并刷新当前预算显示。
5. 刷新页面后仍可读取，表示已持久化到数据库。

---

## 7. API 使用教程（含 curl 示例）

统一说明：

- 所有接口返回 JSON。
- 输入校验失败返回 `400` + `{ "error": "..." }`。
- month 参数格式：`YYYY-MM`。

### 7.1 Categories

#### GET `/api/categories`

```bash
curl "http://localhost:3000/api/categories"
```

#### POST `/api/categories`

```bash
curl -X POST "http://localhost:3000/api/categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"咖啡","type":"expense","icon":"☕"}'
```

### 7.2 Transactions

#### GET `/api/transactions?month=YYYY-MM`

```bash
curl "http://localhost:3000/api/transactions?month=2026-02"
```

#### POST `/api/transactions`

```bash
curl -X POST "http://localhost:3000/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amountCents":3200,"categoryId":"1","note":"午餐","happenedAt":"2026-02-15T12:30:00.000Z"}'
```

> 会校验：categoryId 是否存在、且 category.type 与 transaction.type 必须一致。

### 7.3 Stats

#### GET `/api/stats?month=YYYY-MM`

```bash
curl "http://localhost:3000/api/stats?month=2026-02"
```

返回核心字段：

- `totalExpenseCents`
- `totalIncomeCents`
- `netCents`
- `byCategory`
- `byDay`

### 7.4 Budget

#### GET `/api/budget?month=YYYY-MM`

```bash
curl "http://localhost:3000/api/budget?month=2026-02"
```

若当月未设置，返回 `data: null`。

#### POST `/api/budget?month=YYYY-MM`

```bash
curl -X POST "http://localhost:3000/api/budget?month=2026-02" \
  -H "Content-Type: application/json" \
  -d '{"totalBudgetCents":500000}'
```

---

## 8. 常见问题排查

### Q1: `ERR_PNPM_FETCH_403`

说明当前 registry/网络策略限制下载依赖。尝试：

```bash
pnpm config set registry https://registry.npmjs.org
```

如果仍失败，需检查公司代理或 CI 网络策略。

### Q2: `Unexpected token '<', "<!DOCTYPE ..." is not valid JSON`

这通常表示接口实际返回了 HTML 错误页（而不是 JSON）。常见原因：

- 路由地址写错
- 服务未启动
- 服务端报错返回错误页

当前前端已对非 JSON 响应做了容错处理，但仍建议先在浏览器 Network 面板确认实际响应状态码与响应体。

### Q3: 设置了预算但 Dashboard 不更新

请确认：

1. Dashboard 与 Settings 选择的是同一月份。
2. 保存预算后请求是否成功（Network 面板看 `/api/budget`）。
3. 预算值是否是“分”的整数（>0）。

---

## 9. 验收清单（手工测试建议）

按下面顺序验收：

1. 启动与数据初始化：

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

2. `/settings`：
   - 新增 income/expense 分类各 1 个
   - 设置当月预算并刷新页面，确认仍存在

3. `/transactions`：
   - 新增 2~3 条流水（含不同分类）
   - 检查筛选逻辑（type/category/关键词）

4. `/` Dashboard：
   - 确认 KPI 与图表有数据
   - 切换月份后联动刷新
   - 预算卡片中的 budget/已花/剩余/每日可花计算合理

---

## License

仅用于学习与演示（MVP 阶段）。
