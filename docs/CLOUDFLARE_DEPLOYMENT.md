# Cloudflare 生产部署

## 架构

- GitHub：源代码与版本发布，生产分支为 `main`。
- Cloudflare Pages：构建并托管 Vite 前端。
- Pages Functions：提供 `/api/*` 服务端 API。
- Cloudflare D1：保存 `aps_state` 系统快照和 `aps_event_log` 幂等报工事件。
- 本地 Node + SQLite：继续用于本地开发、离线演示和数据迁移准备。

Cloudflare 版本不会使用服务器本地文件系统。生产数据必须写入 D1，不能依赖 `data/`、`localStorage` 或临时容器磁盘。

## 第一次配置

在项目根目录执行：

```powershell
npm install
npx wrangler login
npm run cf:d1:create
```

创建 D1 后，把 Wrangler 输出的 `database_id` 填入根目录的 `wrangler.jsonc`。复制 `wrangler.example.jsonc` 为 `wrangler.jsonc`，并仅在本机保存该文件；`wrangler.jsonc` 已被 `.gitignore` 忽略，避免把账号资源配置误提交到公开仓库。

```powershell
Copy-Item wrangler.example.jsonc wrangler.jsonc
# 编辑 wrangler.jsonc，填入 database_id
npm run cf:d1:migrate:remote
```

## GitHub + Pages

在 Cloudflare Dashboard：Workers & Pages → Create application → Pages → Import an existing Git repository，选择 `markwangme/planning`。

构建配置：

| 项目 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run cf:build` |
| Build output directory | `dist` |
| Root directory | `/` |

项目的 `functions/` 目录会作为 Pages Functions 发布。Pages 项目设置中添加 D1 binding：变量名 `APS_DB`，选择刚创建的 `planning-db`。如果使用 Gemini，再添加加密 Secret `GEMINI_API_KEY`。保存 binding 后必须重新部署。

## 域名

在 Pages 项目 → Custom domains 分别添加：

- `planning.novolyte.tech`
- `plan.novolyte.tech`

如果 `novolyte.tech` 已经托管在同一 Cloudflare Zone，Cloudflare 会自动创建对应 CNAME。若 DNS 在其他服务商，按 Cloudflare 页面给出的 CNAME 指向配置，并先完成 Custom domain 激活；不要只手工添加 CNAME 而跳过 Pages 的 Custom domain 流程。

建议把 `planning.novolyte.tech` 作为主地址，`plan.novolyte.tech` 作为同一 Pages 项目的第二个自定义域名。两个域名都使用 HTTPS，生产 API 使用同源 `/api`，不需要额外开放端口。

## 本地验证 Cloudflare 运行时

先构建，再使用 Wrangler 本地模拟 Pages Functions 和 D1：

```powershell
npm run cf:build
npm run cf:d1:migrate:local
npx wrangler pages dev dist
```

验证：

```powershell
Invoke-RestMethod http://localhost:8788/api/health
Invoke-RestMethod http://localhost:8788/api/database/load
```

浏览器打开 `http://localhost:8788`，重点测试登录、管理员改密码、订单生成试算草稿、最小投料量限制、周末/休息时间、两个看板横向滚动和 Excel 导出。

## 现有本地数据迁移

当前本地 SQLite 数据不会自动上传，也不会提交到 Git。上线前应先在本地导出并人工确认，再导入 D1；如果不需要保留演示数据，直接让生产环境从默认主数据开始即可。生产第一次登录后，前端保存操作会调用 `/api/database/save` 写入 D1。

## 生产验收

部署后执行：

```powershell
Invoke-RestMethod https://planning.novolyte.tech/api/health
```

然后确认：

1. 刷新页面后数据仍存在，且另一台浏览器能看到同一份数据。
2. 管理员修改密码后旧密码失效、新密码可登录。
3. `200 kg` 订单不会被错误分配到最小投料量更高的反应釜。
4. 报工用相同 `client_event_id` 重复提交时只累计一次。
5. D1 binding 缺失或 API 异常时，页面显示明确错误，不静默覆盖生产数据。
6. 两个域名均能访问同一个生产版本，HTTPS 证书正常。

## 回滚和备份

Pages 支持回滚到历史部署。D1 上线前要保留本地 SQLite 备份；重要生产数据建议定期使用 `wrangler d1 export planning-db --remote --output=...` 导出并离线保存。不要把导出文件放入 Git。
