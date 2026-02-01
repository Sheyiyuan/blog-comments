# Fuwari Blog（基于 Astro）

![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)

这是一个使用 Astro + Tailwind CSS 构建的静态博客站点。本仓库基于上游主题 [saicaca/fuwari](https://github.com/saicaca/fuwari) 进行二次定制与增强。

## 特性

- Astro 5 + Tailwind CSS
- Swup 页面切换与过渡动画
- 亮/暗色模式、主题色可配置
- 响应式布局（移动端/桌面端）
- 目录（TOC）、RSS、Sitemap
- Pagefind 本地全文搜索（构建时自动生成索引）
- 扩展 Markdown：数学公式（KaTeX）、Mermaid、Admonition、GitHub 卡片等
- 代码块增强：Expressive Code（行号、可折叠、语言徽章、自定义复制按钮、自动换行）

## 在原主题基础上的优化/增强（本仓库定制项）

以下内容以“本仓库代码实际包含的功能”为准，便于你二次维护：

- 标签显示优化：文章卡片与正文元信息处的标签支持自动换行，并对超长标签进行断词，避免横向溢出（见 `PostMeta` 相关实现）。
- Bilibili 视频嵌入指令：支持用 Markdown 指令插入 B 站视频 iframe（见 `::bilibili{bv="BV..."}`）。
- Mermaid 渲染增强：`mermaid` 代码块会输出为居中容器，展示更友好。
- 脚注体验增强：正文页对脚注标题的 i18n 与“返回引用”按钮样式做了额外处理（不修改原 DOM，兼顾 SEO）。
- 构建/搜索优化：`pnpm build` 会在 Astro 构建后自动运行 Pagefind；并通过 `pagefind.yml` 排除 KaTeX、搜索面板等不应被索引的内容。
- 部署工作流（可选）：提供 Gitea Actions 工作流，在 Alpine runner 上构建并 rsync 发布到指定目录（按需修改）。

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9（本仓库通过 `preinstall` 强制使用 pnpm）

### 安装与运行

在仓库根目录执行：

```bash
pnpm install
pnpm dev
```

启动后访问：`http://localhost:4321/`

## 配置说明

### 站点配置

- 主要站点配置在 `src/config.ts`：站点标题、语言、导航、作者信息、背景、TOC、许可声明等。
- 部署相关配置在 `astro.config.mjs`：
    - `site`：你的站点域名（用于 RSS、Sitemap、OG 等）
    - `base`：若部署在子路径（例如 `https://example.com/blog/`），需要设置为 `/blog/`

## 写作（文章）

### 文章位置

文章存放在 `src/content/posts/` 下（支持多级目录）。

### 新建文章

```bash
pnpm new-post <文件名或路径>
```

示例：

```bash
pnpm new-post "linux/arch-linux-setup"
```

会生成 `src/content/posts/linux/arch-linux-setup.md` 并写入基础 frontmatter。

### Frontmatter 示例

```yaml
---
title: 我的第一篇文章
published: 2026-02-01
description: "一句话简介"
image: "" # 可填图片路径（如 ./images/cover.jpg）
tags: [Linux, Astro]
category: "随笔"
draft: false
lang: "" # 仅当文章语言与站点默认语言不同才需要设置
---
```

## Markdown 扩展语法

### Admonition（提示块）

```md
:::note[可选标题]
这里是内容。
:::
```

支持的类型：`note` / `tip` / `important` / `caution` / `warning`。

### GitHub 仓库卡片

```md
::github{repo="owner/repo"}
```

### Bilibili 视频嵌入

```md
::bilibili{bv="BVxxxxxxxxxxx"}
```

### Mermaid

````md
```mermaid
graph TD
    A --> B
```
````

### 数学公式（KaTeX）

- 行内：`$E=mc^2$`
- 块级：

```md
$$
\int_a^b f(x)\,dx
$$
```

## 搜索（Pagefind）

- `pnpm build` 会在 `astro build` 后自动执行 `pagefind --site dist` 生成搜索索引。
- 排除规则见 `pagefind.yml`（例如 KaTeX 渲染节点、搜索面板等）。

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm install` | 安装依赖 |
| `pnpm dev` | 本地开发（默认 `localhost:4321`） |
| `pnpm check` | Astro 检查（类型/内容等） |
| `pnpm build` | 构建（含 Pagefind 索引） |
| `pnpm preview` | 预览构建产物 |
| `pnpm new-post <name>` | 新建文章 |
| `pnpm format` | 使用 Biome 格式化 `src` |
| `pnpm lint` | 使用 Biome 检查并自动修复 `src` |

## 部署

### 通用方式

Astro 支持部署到 Vercel / Netlify / GitHub Pages / 自建服务器等。部署前请先修改 `astro.config.mjs` 中的 `site` / `base`。

### Gitea Actions（本仓库自带，可选）

本仓库提供了一个 Gitea Actions 工作流：`.gitea/workflows/deploy.yml`。

- 触发：推送到 `main` 分支
- 动作：安装依赖 → `pnpm build` → 将 `dist/` 同步到目标目录
- 默认目标目录：`/home/blog/web`（按需修改工作流中的 `TARGET_DIR`）

## 致谢

- 上游主题：Fuwari（https://github.com/saicaca/fuwari）

## 许可

上游 Fuwari 使用 MIT License。本仓库如需对外发布/开源，建议补充 `LICENSE` 文件，并遵循上游许可与署名要求。
