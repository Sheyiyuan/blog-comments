---
title: "CSS 文本样式"
published: 2025-05-15
description: ""
firstLineIndent: "0em"
tags: 
    - "CSS"
    - "前端开发"
category: "前端学习笔记"
draft: false
pin: 0
lang: ""
comments: true
sponsor: true
---

# CSS 文本样式

CSS 文本样式用于控制网页中文字的外观，包括字体、颜色、对齐、间距等，主要分为两大类：

- 字体样式
    - 使用哪种字体，字体大小、字体粗体、斜体，等等
- 文本布局
    - 文本对齐、行高、字间距、首行缩进等等

> 注意：CSS 不能直接“选中纯文本节点”来设置样式，通常是给承载文本的 HTML 元素设置样式，文本随元素样式变化。

## 字体样式

给文字设置颜色、大小、粗体、装饰等效果。

| 字体样式 | 说明  |
| --- | --- |
| `color` | 设置字体颜色 |
| `font-family` | 字体族 |
| `font-size` | 字体大小 |
| `font-style` | 字体风格 |
| `font-weight` | 字体粗体 |
| `text-decoration` | 字体装饰 |

## 字体颜色（color）

常用十六进制，如 `#66ccff` ，部分时候使用 `rgb` 和 `rgba` ，`rgba` 的最后一个数值取 0~1 表示透明度，0 完全透明，1 完全不透明，如 `rgba(155,0,0,0.3)`。

## 字体族（font-family）

字体族可以用字体名称设置。可以给定一个有先后顺序的，由字体名字或字体族名组成的列表来为选定的元素设置字体。

```css
body {
  /*属性值用逗号隔开。浏览器会选择列表中第一个该计算机上安装的字体，没有则使用默认*/
  font-family: Arial, Helvetica, sans-serif;
}
```

## 字体大小（font-size）

字体大小可以用 px 设置。

> CSS 像素（CSS pixel，即 px）是 CSS 中用于指定长度、尺寸的单位，是绝对单位。

不同浏览器默认字体大小不一样，Chrome 默认 16px，建议给 `body` 标签统一指定大小，做到浏览器统一。

```css
body {
  font-size: 16px;
}

.font12 {
  font-size: 12px;
}
```

## 字体风格（font-style）

`font-style` 用来打开和关闭文本斜体（Italic）。

属性值： `normal` / `italic`

常见用法：让 em 或 i 标签取消默认倾斜

```css
em {
  font-style: normal;
}
```

## 字体粗细（font-weight）

`font-weight` 设置文字粗细。

使用场景：

1.  很多标题是不要加粗的，此时利用 CSS 取消加粗。
2.  大段文本也可以通过 CSS 统一设置粗细。

属性值： `normal` / `bold`

**数字属性值（常用）：**400（正常粗细）/ 700（加粗）（取值 100-900 之间，常用400 和 700）

## 字体装饰（text-decoration）

设置 / 取消字体上的文本装饰

使用场景：

1.  最常见设置下划线，比如取消超链接下划线。
2.  特殊情况添加删除线。

属性值`none` （无装饰）/ `underline` （下划线）/ `overline` （上划线）/ `line-through` (删除线)

## 文本布局

作用于文本的对齐、缩进、间距等布局功能的属性。

| 文本属性 | 说明  |
| --- | --- |
| `text-align` | 文本对齐（不适用于普通行内元素） |
| `text-indent` | 首行缩进（不适用于普通行内元素） |
| `letter-spacing` | 文本字符间距 |
| `line-height` | 行高  |

## 文本对齐（text-align）

控制文本在它所在的块级盒子内如何**水平对齐**。

使用场景：

1.  文本 / 图片在盒子水平对齐
2.  使文章文字两端对齐

属性值： `left` （左对齐，默认）/ `right` （右对齐）/ `center` （居中对齐）/ `justify` （两端对齐）

## 首行缩进（text-indent）

设置块级元素中文本首行缩进的长度。

属性值：数字

常见单位是 em，相对单位，本元素的字体大小。如果当前元素没有大小，按照父元素文字大小。

```css
p {
  /*首行缩进两字符*/
  text-indent: 2em;
}
```

## 字间距（letter-spacing）

用于设置文本字符的间距。调整字与字之间的距离。

```css
p {
  /*字间距可以为负*/
  letter-spacing: 2px;
}
```

## 行高（line-height）

设置文本每行之间的高度。

使用场景：

1.  设置多行文本之间的上下间距。
2.  让单行文本垂直居中

属性值常见写法：`px` / `em` / 无单位数字（推荐）。

```css
p {
  /*若当前文字大小为 10px，则行高为15px*/
  line-height: 1.5;
}
```

用行高可以实现单行文本垂直居中。

原理：行高的组成是文字自身大小加上上下间距共同构成的。行高调整的本质是同样大小调整上下间距。当**行高和盒子的高度一致**时就可以实现**单行文本**垂直居中。

## font 简写

`font` 简写属性可以在一个声明中设置多个字体相关属性。

使用场景：给整个页面设置相关字体样式

```css
body {
  font: font-style font-weight font-size/line-height font-family;
  /*font-size 和 font-family 必须写*/
  /*其他可以省略，默认显示*/
  /*这种写法有严格的书写顺序，不能调换*/
}
```

## CSS 继承性（inherit）

子元素会自动继承父元素的某些 CSS 样式属性。

主要继承和文字相关的样式，比如字体、颜色、文本对齐等。

## 常用补充（实战高频）

除了上面这些，日常开发里还有一批非常常用的文本样式：

| 属性 | 常见用途 |
| --- | --- |
| `white-space` | 控制是否换行、是否保留空白 |
| `text-overflow` | 单行文本溢出省略号 |
| `word-break` | 长单词/长字符串换行策略 |
| `overflow-wrap` | 避免超长单词撑破容器 |
| `text-transform` | 英文大小写转换（标题、按钮常用） |
| `text-shadow` | 文本阴影（强调文字层次） |

### white-space（空白与换行）

```css
/* 常见：正常换行 */
p {
    white-space: normal;
}

/* 不换行，常用于单行省略 */
.single-line {
    white-space: nowrap;
}
```

### text-overflow（文本溢出）

`text-overflow: ellipsis` 需要和 `overflow: hidden`、`white-space: nowrap` 配合使用。

```css
.single-line-ellipsis {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
```

### word-break / overflow-wrap（长文本换行）

```css
.content {
    /* 英文长单词或超长 URL 更容易换行 */
    overflow-wrap: break-word;

    /* CJK 和英文混排时可按需使用 */
    word-break: break-word;
}
```

### text-transform（英文大小写）

```css
.btn {
    text-transform: uppercase;
}
```

常见属性值：`none` / `uppercase` / `lowercase` / `capitalize`。

### text-shadow（文字阴影）

```css
.hero-title {
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
```

语法顺序一般是：`水平偏移 垂直偏移 模糊半径 颜色`。