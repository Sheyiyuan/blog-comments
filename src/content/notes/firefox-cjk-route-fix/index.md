---
title: "Firefox 中文路由跳转失败诊断记录"
published: 2026-06-18 14:30
description: "Firefox ESR 中点击中文链接被重定向到 / 的问题排查全过程"
image: ""
firstLineIndent: "0em"
tags: 
    - "Firefox"
    - "调试"
    - "Astro"
    - "Swup"
category: "前端开发"
draft: false
pin: 0
lang: ""
comments: true
sponsor: false
---

## 现象

在 Firefox ESR 中，点击任何包含中文的链接（如 `/posts/arch-linux中的conda/`），浏览器地址栏会从目标 URL 变成 `/`。其他浏览器正常，直接输入 URL 到地址栏也正常。

## 诊断过程

### 第一轮：怀疑 URL 编码

项目中 `getPostUrlBySlug()` 直接用原始 slug 拼接 URL，中文未做 `encodeURIComponent` 处理：

```ts
// src/utils/url-utils.ts
export function getPostUrlBySlug(slug: string): string {
    return url(`/posts/${slug}/`); // slug 含中文，未编码
}
```

输出 `<a href="/posts/arch-linux中的conda/">`，不符合 URL 规范。

**修复**：给三个 slug→URL 函数添加 `encodeURIComponent`。

### 第二轮：验证编码修复

修复后重新构建，验证生成的 HTML 中链接已正确编码：

```
href="/posts/%E5%BC%80%E6%BA%90%E5%B0%B1%E6%98%AF%E5%85%8D%E8%B4%B9..."
```

但用户反馈问题依然存在。

### 第三轮：区分请求类型

用户打开开发者工具「网络」面板后确认：

- 点击链接时**没有 XHR/Fetch 请求**（Swup 没有拦截成功）
- 直接发起了一个页面级请求到 `/`

说明 Swup 在这场点击中完全没有介入，浏览器走了默认导航。

### 第四轮：确认 href 值

在 `Layout.astro` 中添加 capture 阶段的 click 监听器：

```js
document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href]');
    if (!a) return;
    console.log('[DEBUG] link click:', {
        rawHref: a.getAttribute('href'),
        resolvedHref: a.href,
        hasSwup: !!window.swup,
    });
}, true);
```

日志输出：
- `rawHref`：正确的编码 URL
- `resolvedHref`：完整的正确目标 URL
- `hasSwup`：`true`

**href 完全正确**，但浏览器仍然跳转到 `/`。

### 第五轮：排除法

逐一排查可能的原因：

| 假设 | 验证 | 结论 |
|------|------|------|
| 服务端有重定向 | `curl -v` 返回 200 | 排除 |
| 页面有 JS 重定向 | 全局搜索 `window.location`、`history.pushState` 无结果 | 排除 |
| 链接有 `data-no-swup` | 搜索为 0 | 排除 |
| `<base>` 标签干扰 | 不存在 | 排除 |
| CSS/事件冒泡干扰 | 审查全部 click handler，无干预 | 排除 |
| Swup 插件干扰 | 审查全部插件配置，无异常 | 排除 |

### 第六轮：推断

如果 `a.href` 返回正确 URL、没有 JavaScript 改变它、服务端不重定向——浏览器应该导航到目标 URL。但它去了 `/`。

在排除所有上层因素后，只能解释为浏览器内部对**链接点击导航**和**地址栏导航**使用了不同代码路径，前者在 Firefox 中处理非 ASCII URL 时存在异常。

## 修复方案

在 `Layout.astro` 的 `setup()` 函数中添加 Firefox 专用 workaround，捕获阶段拦截非 ASCII 链接点击，用 `window.location.assign()` 替代浏览器默认导航：

```js
const needsWorkaround = /firefox/i.test(navigator.userAgent);
if (needsWorkaround) {
    document.addEventListener('click', (e) => {
        const el = (e.target as Element)?.closest?.('a[href]');
        if (!el || el.tagName !== 'A') return;
        const a = el as HTMLAnchorElement;
        // 排除修饰键、外部链接、data-no-swup
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const rawHref = a.getAttribute('href') || '';
        const isNonAscii = /[^\x00-\x7F]/.test(rawHref)
            || /%[89A-Fa-f][0-9A-Fa-f]/.test(rawHref);
        if (!rawHref.startsWith('/') || !isNonAscii) return;
        if (a.closest('[data-no-swup]')) return;
        const resolved = a.href;
        // 跳过同页 hash 导航和外部链接
        // ...
        e.preventDefault();
        e.stopPropagation();
        window.location.assign(resolved);
    }, true);
}
```

核心逻辑：
1. 仅在 Firefox 中生效，Chrome 不受影响
2. 捕获阶段拦截，阻止 Swup 和浏览器默认行为
3. 用 `window.location.assign()` 走地址栏导航路径（该路径正常）

代价：中文字符的链接在 Firefox 中失去 Swup 平滑过渡（执行完整页面导航）。

## 未解之谜

排查过程中发现 Swup 对中文链接的点击未正常拦截（无 XHR 请求），但英文链接正常。这与 Firefox 的导航问题可能是两个独立 bug，也可能有关联。Swup 使用的 `Location` 类继承自 `URL`，在 Firefox ESR 中 `new URL()` 对含中文的路径是否抛异常尚无直接验证。
