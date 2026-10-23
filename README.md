# ETF 重叠度计算器 · ETF Overlap Calculator

[![Live](https://img.shields.io/badge/live-etf.domc.me-141414)](https://etf.domc.me/)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Deploy](https://img.shields.io/badge/deploy-Vercel-000)

**在线使用 / Live:** <https://etf.domc.me/>

![ETF Overlap Calculator](./public/screenshot.jpg)

对比美股、港股 ETF 的**完整持仓**，看清同时持有几只 ETF 时到底有多少是同一批股票，避免重复持仓带来的风险集中。

Compare the **full holdings** of US and HK ETFs and see how much of your portfolio is the same stocks twice.

- 示例 / Examples: [VOO vs IVV](https://etf.domc.me/?etfs=IVV,VOO) · [VOO vs QQQ](https://etf.domc.me/?etfs=QQQ,VOO) · [BND vs AGG](https://etf.domc.me/?etfs=AGG,BND)

## 功能 / Features

- **ETF 搜索**：按代码或名称搜索（Yahoo Finance），支持美股、港股；也可以直接输入代码回车添加。
- **完整持仓**：优先使用发行商官方持仓文件，其次 SEC N-PORT，最后才退回前 10 大持仓（会明确标注）。
- **重叠度矩阵**：两两之间的重叠度，点击任意一格查看这一对的共同持仓明细（含各自权重）。
- **一对基金的详情**：各自有多少持仓也在对方里、数据来源与日期；选 3 只以上时显示所有组合排名；两边数据日期相差过大时提示权重可能漂移。
- **数据透明**：每只基金都标注来源、截止日期、持仓条数、权重合计，不完整时说明原因。
- **可分享链接**：`/?etfs=VOO,IVV` 打开即自动计算。
- 中英文界面，桌面与手机布局。

### 重叠度怎么算

对两只基金共同持有的每个仓位，取两边权重中**较小**的一个，再全部相加。例如 A 持有 5% NVDA、B 持有 3% NVDA，这一项贡献 3%。

## 数据来源 / Data sources

| 优先级 | 来源 | 覆盖 | 更新频率 |
| --- | --- | --- | --- |
| 1 | 发行商官方持仓文件：iShares、Vanguard、SPDR (State Street)、Invesco | 各家旗下 ETF | 每日 |
| 2 | [SEC N-PORT](https://www.sec.gov/) 申报（免费） | 所有美国注册 ETF | 按季度披露，可能滞后数月 |
| 3 | Yahoo Finance (`yahoo-finance2`) | 前 10 大持仓 | 兜底，页面标注为"部分持仓" |

- 没有 ticker 的持仓（如 SEC 数据、债券）按 CUSIP/ISIN 对齐；债券 ETF 全部按 CUSIP 匹配。
- 不同发行商对同一家公司的叫法不一样（如 `Facebook Inc.` 与 `Meta Platforms`），这是数据源本身的差异，计算时按 ticker/CUSIP 匹配，不受影响。

## 本地开发

需要 Node.js 20.19+ 或 22+（Vite 7 的要求）。

```bash
npm install
npm run start     # 同时启动 API (3001) 与前端 (5173)
npm run build     # 类型检查 + 构建
npm run lint
```

## 部署

项目适配 [Vercel](https://vercel.com/)：前端为静态站点，`api/index.js` 作为 Serverless Function（`vercel.json` 把 `/api/*` 转发过去，`maxDuration` 为 60 秒，部分大型债券 ETF 与 SEC 请求较慢）。

| 环境变量 | 说明 |
| --- | --- |
| `SEC_USER_AGENT` | 访问 SEC 时使用的 User-Agent，格式 `name email`（SEC 要求声明身份）。默认 `etf-cal domdoumc@gmail.com`，建议改成你自己的。 |

### SEO

`index.html` 内置 title、description、canonical、Open Graph、JSON-LD；每个对比页（`?etfs=...`）在前端运行后有独立的标题、描述和 canonical。`public/sitemap.xml` 与 `public/robots.txt` 里的域名是 `https://etf.domc.me`，换域名时需要同步修改（另外 `index.html` 与 `src/App.tsx` 里的 `SITE`）。

## 项目结构

```
api/
  index.js            Express 应用：/api/search、/api/analyze（Vercel 入口）
  holdings/           完整持仓：ishares / vanguard / spdr / invesco / sec 适配器 + 兜底链
src/
  App.tsx             页面与状态
  components/         重叠度矩阵、一对基金详情、共同持仓表、基金卡片
  seo.ts              文档 meta 更新
  locales/            中英文文案
```

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS 4 · Express · yahoo-finance2 · SheetJS (`xlsx`，解析 SPDR 持仓文件)

## 免责声明 / Disclaimer

本工具仅用于信息展示，不构成任何投资建议。持仓数据来自第三方，可能存在延迟或错误。
This tool is for information only and is not investment advice. Holdings data comes from third parties and may be delayed or inaccurate.
