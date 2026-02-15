# Account Book（Phase 1）

个人生活记账可视化 Web App 的 Phase 1 版本：完成项目初始化、导航与三页面骨架。

## 技术栈

- Next.js（App Router）
- TypeScript
- Tailwind CSS
- pnpm

## 本地运行命令

```bash
pnpm install
pnpm dev
```

> 如果你之前把 npm/pnpm registry 配到了不可用源，请先切回：
>
> ```bash
> pnpm config set registry https://registry.npmjs.org
> ```

## 验收步骤（Phase 1）

1. 安装依赖并启动开发服务器：

   ```bash
   pnpm install
   pnpm dev
   ```

2. 访问以下地址确认页面可打开：

- `http://localhost:3000/`（Dashboard 占位页）
- `http://localhost:3000/transactions`（Transactions 占位页）
- `http://localhost:3000/settings`（Settings 占位页）

3. 验收点：

- 顶部导航包含 3 个入口：Dashboard / Transactions / Settings
- 三个页面均可访问并展示占位内容
- 项目可正常启动（Phase 1 完成）

