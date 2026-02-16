# Account Book（Phase 1 + 2 + 3）

个人生活记账可视化 Web App。

- Phase 1：Next.js + TypeScript + Tailwind 基础骨架
- Phase 2：Prisma + SQLite + 分类 Seed
- Phase 3：API（categories / transactions / stats / budget）

## 技术栈

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- Prisma
- SQLite（dev）
- pnpm

## 环境准备

项目已提供 `.env`（同时保留 `.env.example` 作为模板）：

```env
DATABASE_URL="file:./dev.db"
```

## 安装与启动

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

页面访问：

- `http://localhost:3000/`
- `http://localhost:3000/transactions`
- `http://localhost:3000/settings`

---

## Phase 3 API 说明

统一说明：

- 金额字段统一“整数分”：`amountCents`、`totalBudgetCents`
- 输入校验失败返回 `400` + `{ "error": "..." }`
- 返回 JSON

### 1) Categories

#### GET `/api/categories`

返回全部分类列表（固定按 type/name 排序）。

```bash
curl "http://localhost:3000/api/categories"
```

#### POST `/api/categories`

请求体：

```json
{
  "name": "咖啡",
  "type": "expense",
  "icon": "☕"
}
```

```bash
curl -X POST "http://localhost:3000/api/categories" \
  -H "Content-Type: application/json" \
  -d '{"name":"咖啡","type":"expense","icon":"☕"}'
```

### 2) Transactions

#### POST `/api/transactions`

请求体：

```json
{
  "type": "expense",
  "amountCents": 3200,
  "categoryId": "1",
  "note": "午餐",
  "happenedAt": "2026-02-15T12:30:00.000Z"
}
```

```bash
curl -X POST "http://localhost:3000/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amountCents":3200,"categoryId":"1","note":"午餐","happenedAt":"2026-02-15T12:30:00.000Z"}'
```

> 会校验：`categoryId` 存在，且分类 `type` 必须与流水 `type` 一致。

#### GET `/api/transactions?month=YYYY-MM`

返回当月流水（`happenedAt` 倒序），并包含 `categoryName/categoryType/categoryIcon`。

```bash
curl "http://localhost:3000/api/transactions?month=2026-02"
```

### 3) Stats

#### GET `/api/stats?month=YYYY-MM`

返回：

- `totalExpenseCents`
- `totalIncomeCents`
- `netCents`
- `byCategory`（按分类汇总并按 `totalCents desc`）
- `byDay`（按天汇总）

```bash
curl "http://localhost:3000/api/stats?month=2026-02"
```

### 4) Budget

#### GET `/api/budget?month=YYYY-MM`

返回当月预算；若不存在，返回 `data: null`。

```bash
curl "http://localhost:3000/api/budget?month=2026-02"
```

#### POST `/api/budget?month=YYYY-MM`

请求体：

```json
{ "totalBudgetCents": 500000 }
```

```bash
curl -X POST "http://localhost:3000/api/budget?month=2026-02" \
  -H "Content-Type: application/json" \
  -d '{"totalBudgetCents":500000}'
```

> 行为：按 `month` upsert（有则更新，无则创建）。

---

## 本地验收（Phase 3）

1. 启动项目：

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

2. 用上面 curl 示例逐个调用接口，验证：

- 非法输入（缺字段、类型错误、金额 <= 0、非法 month/日期、分类不匹配）返回 `400`
- 预算接口可正常 upsert
- 统计接口能返回总额、分类汇总、按天汇总

## 注意事项

- 金额统一存储“分”（Int）。
- `Budget.month` 使用 `YYYY-MM` 且唯一。
- 如安装失败可切回官方源：

```bash
pnpm config set registry https://registry.npmjs.org
```


---

## Phase 4：`/transactions` 页面

已实现：

- 月份选择（默认当前月）
- 列表展示：`date/type/category/amount/note`
- 筛选：`type(all/income/expense)`、`category`、关键词（note）
- “新增”按钮打开 Modal：`type/amount/category/note/happenedAt`
- `happenedAt` 默认今天，支持“昨天”快捷
- 提交成功后自动刷新列表并关闭弹窗

### Phase 4 本地验收

```bash
pnpm dev
```

打开：`http://localhost:3000/transactions`

建议手工检查：

1. 切换月份后，列表按月更新。
2. 切换 type/category/关键词，列表过滤正确。
3. 新增流水时：
   - 金额 <= 0、缺分类、非法日期会提示错误；
   - 正常提交后 Modal 关闭，列表立即出现新记录。
4. 点击“昨天”按钮，日期应变为昨天。


---

## Phase 5：Dashboard（`/`）图表

已实现：

- 月份选择（默认当前月）
- KPI 卡片：支出、收入、结余
- 柱状图：按天支出（`byDay`）
- 环形图：支出按分类占比（Top 8，其余合并 `Other`）
- Top 5 支出分类排行

图表库使用：`Recharts`，数据来自：`/api/stats?month=YYYY-MM`。

### Phase 5 本地验收

```bash
pnpm install
pnpm dev
```

访问：`http://localhost:3000/`

验收点：

1. 切换月份后，KPI 和所有图表/排行联动刷新。
2. 无数据月份不报错，展示“暂无数据”提示。
3. 饼图仅统计支出分类，超过 8 个后合并为 `Other`。


---

## Phase 6：`/settings` + Dashboard 预算卡片

### `/settings` 已实现

- 分类列表（按 `expense/income` 分组）
- 新增分类表单（调用 `POST /api/categories`）
- 月预算设置（单位分，调用 `GET/POST /api/budget?month=YYYY-MM`）
- 预算保存后重新拉取并展示，刷新页面后仍可读取（持久化在 DB）

### Dashboard 已增强

新增预算卡片，显示：

- `budget`
- `已花`
- `剩余`
- `每日可花 = (budget - 已花) / 剩余天数`（显示到元）

数据来源：`/api/stats` + `/api/budget`。

### Phase 6 本地验收

```bash
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm dev
```

访问：

- `http://localhost:3000/settings`
- `http://localhost:3000/`

建议验收：

1. 在 `/settings` 新增分类后，列表立刻更新。
2. 在 `/settings` 设置某月预算，保存后可看到当前预算值。
3. 刷新 `/settings` 页面，预算值仍存在。
4. 打开 Dashboard，切换同月份，预算卡片随月份联动更新。
