---
title: "CORS 完全解析：定义、解决方案与面试实战"
published: 2026-05-25 19:24
description: "从同源策略到跨域实战，一文讲透 CORS 的原理、开发与生产环境下的解决方案，以及面试中高频出现的考察点。"
image: "images/cover.png"
firstLineIndent: "0em"
tags:
  - CORS
  - 前端
  - 面试
  - HTTP
  - 网络安全
category: "技术分享"
draft: false
pin: 0
lang: "zh-CN"
comments: true
sponsor: true
---

我们来看下面这个故事：

社老师在服务器上跑了一个 API，用来查询她和半拍的期末考试时间——很简单，一个 GET 接口返回 JSON。

半拍写了一个前端页面，漂亮地展示考试安排。在本地 `http://localhost:5173` 运行，ajax 请求社老师的服务器 `https://api.sheyiyuan.com/exams`。

浏览器报错：

```
Access to fetch at 'https://api.sheyiyuan.com/exams' from origin 'http://localhost:5173'
has been blocked by CORS policy.
```

半拍懵了。她把社老师的服务端代码拉到本地，在 `http://localhost:8080` 上跑起来，再从前端 `http://localhost:5173` 去请求……还是同样的错误。

跨域问题，扑面而来。

---

## 一、CORS 是什么

这个故事的背后，是一条浏览器安全铁律：**同源策略（Same-Origin Policy）**。

它规定：只有当 **协议（protocol）、域名（host）、端口（port）** 三者完全一致时，一个页面才能读取另一个页面的资源。

社老师的 API 和半拍的前端页面之间，几乎每一对组合都是不同源的：

| 前端 | API | 不同源原因 |
|------|-----|-----------|
| `http://localhost:5173` | `https://api.sheyiyuan.com` | 域名、端口都不同 |
| `http://localhost:5173` | `http://localhost:8080` | 端口不同 |

浏览器拦截的并不是请求本身——**请求已经发出去了，服务器也收到了**，但浏览器发现响应缺少允许跨域的头部，就把响应藏了起来，不让 JavaScript 读取。

**CORS（Cross-Origin Resource Sharing）** 就是解决这个问题的 HTTP 机制：通过额外的头部，告诉浏览器「这个跨域请求我允许」。

> **面试常问：同源策略是如何定义的？**
> 答：同源要求 protocol://host:port 三者完全一致。例如 `https://a.com:443` 与 `https://a.com:8080` 不同源（端口不同），`https://a.com` 与 `http://a.com` 也不同源（协议不同）。

> **面试常问：没有了同源策略会怎样？**
> 如果没有同源策略，你打开 `evil.com`，它就能通过脚本向 `bank.com/api/transfer` 发起 POST 请求，如果你刚好登录了银行网站，Cookie 会自动带上，转账请求就成功了——这就是 CSRF（跨站请求伪造）攻击的核心原理。

## 二、CORS 的工作原理

CORS 定义了三类请求场景，各有不同的处理方式。

### 2.1 简单请求（Simple Request）

同时满足以下条件的是简单请求：

- 方法：GET、HEAD、POST
- 允许的请求头：Accept、Accept-Language、Content-Language、Content-Type（仅限 `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`）
- 没有使用 ReadableStream

回看半拍的故事——她发的是 `Content-Type: application/json` 的 POST 请求？还是普通的 `GET`？如果是 GET 请求 + 默认头部，那就是简单请求，流程很简单：

1. 浏览器在请求头中自动添加 `Origin: http://localhost:5173`
2. 服务器若在响应头中返回 `Access-Control-Allow-Origin: http://localhost:5173`
3. 浏览器检查通过，放行；否则报 CORS 错误

但假如半拍在请求里加了自定义头部（比如 `X-Requested-By: Hanpai`），或者用了 `application/json` 的 Content-Type，那就不属于简单请求了。

### 2.2 预检请求（Preflight Request）

不满足简单请求条件的请求，浏览器会在实际请求之前，先发一个 **OPTIONS 请求**——这就是预检（Preflight）：

```
OPTIONS /exams HTTP/1.1
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: X-Requested-By
```

服务器需要响应：

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: X-Requested-By
Access-Control-Max-Age: 86400
```

- `Access-Control-Max-Age`：预检结果的缓存时间（秒），避免同一个请求反复问

预检通过后，浏览器才发真正的请求。如果社老师的后端没有正确处理 OPTIONS 请求，半拍会看到两个请求：一个 OPTIONS 没有返回正确的头部，实际请求紧接着被阻塞。

> **面试常问：什么是预检请求？什么情况下会触发？**
> 当请求满足以下任一条件时，浏览器会先发送 OPTIONS 预检请求：① 使用了 PUT、DELETE、PATCH 等非简单方法；② 设置了自定义头部（如 Authorization、X-Requested-With）；③ Content-Type 不是简单请求允许的三种类型（最常见的是 application/json）。

### 2.3 带凭证的请求（Request with Credentials）

半拍发现社老师的 API 没有做登录校验，于是加上了 Cookie 传递认证信息：

```javascript
fetch('https://api.sheyiyuan.com/exams', {
  credentials: 'include'
})
```

这时，服务器必须设置：

```
Access-Control-Allow-Origin: http://localhost:5173     // 不能是 *
Access-Control-Allow-Credentials: true
```

:::warning
 `Access-Control-Allow-Origin: *` 与 `credentials: 'include'` 不能共存。带凭证的请求必须指定明确 origin。
:::

> **面试常问：为什么 withCredentials 时 Access-Control-Allow-Origin 不能是星号？**
> 安全考虑。如果允许带凭证的请求使用通配符 origin，攻击者可以在任意域下诱导用户发起自动携带凭证的跨域请求。因此规范要求：带凭证的请求必须指定明确的 origin，确保服务端知晓请求来自哪里，并能做进一步的安全校验。

## 三、从三个角度解决半拍的困境

### 前端视角：开发代理

半拍在自己的前端项目里配置了一个 proxy，把 `/api` 路径的请求代理到后端地址：

```typescript
// vite.config.ts —— 半拍的前端项目
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',   // 社老师的本地服务器
        changeOrigin: true,
      }
    }
  }
})
```

**原理**：半拍的前端 `http://localhost:5173/api/exams` → Vite 开发服务器代理转发到 `http://localhost:8080/exams`。从浏览器角度看，请求是同源的（都在 `localhost:5173` 下），不存在跨域问题。

```javascript
// 半拍的前端代码 —— 不需要改任何 URL
fetch('/api/exams')
  .then(res => res.json())
  .then(data => /* 渲染考试安排 */)
```

其他工具的配置：

```javascript
// Webpack Dev Server
devServer: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

```json
// Create React App —— package.json
{
  "proxy": "http://localhost:8080"
}
```

:::warning
**这个方案只在开发环境有效**。当半拍把前端部署到生产环境时，Vite Dev Server 不在线，Proxy 也就不起作用了。
:::

### 后端视角：CORS 中间件

社老师在自己的 Go 服务里加上 CORS 中间件：

```go
// 社老师的 Go/Gin 服务端
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func main() {
	r := gin.Default()
	r.Use(CORSMiddleware())
	r.GET("/exams", getExamsHandler)
	r.Run(":8080")
}
```

在 Node.js 中等效写法：

```javascript
// Express.js
const cors = require('cors')
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}))
```

半拍重新跑了一下，前端的请求成功了。

但社老师说：**「我这个 API 不止你一个人用——前端部署上线了怎么办？」**

于是他们改成了动态白名单模式：

```go
var allowedOrigins = []string{
	"http://localhost:5173",      // 开发
	"https://hanpai.app",         // 半拍的前端页面上线后
	"https://sheyiyuan.com",     // 社老师自己用
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if slices.Contains(allowedOrigins, origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		// ...
	}
}
```

### 网关代理视角：Nginx（生产环境）

部署上线后，社老师觉得在后端代码里硬编码 CORS 白名单不太优雅。况且他还想统一管理多个微服务的跨域策略。他在 API 前面加了一层 Nginx 反向代理：

```nginx
server {
    listen 443 ssl;
    server_name api.sheyiyuan.com;

    location /exams {
        # 动态 origin —— 允许信任域
        if ($http_origin ~* (https?://(hanpai\.app|sheyiyuan\.com))) {
            add_header Access-Control-Allow-Origin "$http_origin";
            add_header Access-Control-Allow-Credentials "true";
        }
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";

        # 预检请求直接返回
        if ($request_method = OPTIONS) {
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://backend:8080;
    }
}
```

这样一来，社老师的后端代码里不需要写任何 CORS 逻辑，所有跨域策略都在 Nginx 层统一管控。如果以后加了新的消费方，只需改 Nginx 配置，无需重新部署服务。

**三种方案的适用场景对比：**

| 方案 | 适用阶段 | 优点 | 缺点 |
|------|---------|------|------|
| 前端 proxy | 开发环境 | 零改动后端，前端独立调试 | 打包上线后失效 |
| 后端 CORS 中间件 | 单体/小团队 | 配置直观，控制粒度细 | 每个服务都要配，重复工作 |
| 网关 Nginx | 生产环境 / 微服务 | 统一管控，不改代码 | 引入网关运维成本 |

## 四、其他 CORS 知识

### 4.1 生产环境常见陷阱

| 陷阱 | 现象 | 解决方案 |
|------|------|----------|
| `*` + `credentials: true` | 浏览器报错 | 指定明确 origin，或用动态 origin |
| OPTIONS 没有返回 2xx | 实际请求被阻塞 | 确保 OPTIONS 返回 204 且包含 CORS 头部 |
| 多个 Origin 值同时出现 | 重复头部错误 | 只设置一个 `Access-Control-Allow-Origin` |
| 前端误用 `mode: 'no-cors'` | 响应为空（opaque） | 删除 `mode: 'no-cors'`，正确配置后端 CORS |
| WebSocket 请求 | 不触发标准 CORS | WebSocket 没有同源策略约束，但握手头可能被阻断 |

### 4.2 JSONP——CORS 之前的时代

JSONP（JSON with Padding）是 CORS 普及之前最流行的跨域方案。原理是利用 `<script>` 标签不受同源策略限制：

```html
<script>
function handleExams(data) {
  console.log('考试安排：', data)
}
</script>
<script src="https://api.sheyiyuan.com/exams?callback=handleExams"></script>
```

服务器返回的不是 JSON，而是 JavaScript 调用：

```javascript
handleExams({"hanpai": "2026-06-15", "sheyiyuan": "2026-06-20"})
```

**缺点**：只支持 GET 请求，无法处理 HTTP 错误，存在 XSS 风险。如今已被 CORS 全面取代。

### 4.3 CORS 在 API 网关层的配置（Kubernetes Ingress）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://hanpai.app"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, PUT, POST, DELETE, PATCH, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
spec:
  rules:
  - host: api.sheyiyuan.com
    http:
      paths:
      - path: /exams
        pathType: Prefix
        backend:
          service:
            name: exam-service
            port:
              number: 8080
```

## 五、面试高频问题汇总

### Q1：跨域问题的根本原因是什么？
同源策略（SOP）是浏览器的一种安全机制，它阻止来自不同源的页面读取另一个页面的响应。CORS 是 SOP 的一种放宽机制。

### Q2：简单请求和复杂请求的区别？
简单请求不会触发 OPTIONS 预检，复杂请求（非简单请求）会先发 OPTIONS 预检，服务器确认允许后才发实际请求。判定条件见上文 2.1 节。

### Q3：JSONP 和 CORS 的区别？
JSONP 只支持 GET，错误处理弱，安全性差，主要用于兼容远古浏览器；CORS 支持所有 HTTP 方法、有完整的 HTTP 错误体系、安全性更强。结论：能用 CORS 就别用 JSONP。

### Q4：开发环境可以关闭 Chrome 安全策略，为什么生产不行？
因为关闭安全策略只是让你在开发时「看不见」错误，实际跨域问题仍然存在。生产环境的用户不可能去关闭浏览器的安全策略。CORS 是**协议层**的问题，必须在服务端解决。

### Q5：POST 请求返回被 CORS 阻止，但服务器日志显示收到了请求，这是为什么？
这是 CORS 的经典特性：**请求已经到达了服务器，服务器也正常处理并返回了响应，但是浏览器因为响应头缺少必要的 CORS 头部而拒绝将响应交给 JavaScript 读取。** 服务器仍然处理了请求（包括副作用），只是前端得不到响应数据。

### Q6：预检请求浪费性能怎么办？
- 设置 `Access-Control-Max-Age` 头部，减少重复 OPTIONS 请求
- 尽量使用简单请求（如用 GET 替代 PUT，用 URL 参数替代自定义头部）
- 同域请求不会触发预检

### Q7：如何处理多域名白名单？
动态 origin：从请求头读取 Origin，在白名单中查找，匹配则原值返回。

### Q8：CORS 和 CSRF 有什么关系？
CORS 本身不是 CSRF 的防御手段，但理解 CORS 有助于理解 CSRF 的核心——CSRF 利用的是**同源策略只阻止读取响应、不阻止发出请求**的特性。CORS 规范要求的 OPTIONS 预检和 `Access-Control-Allow-Credentials` 配置正是为了解决这一安全问题。

## 六、CORS 错误排查清单

当再次遇到 CORS 问题时，按以下步骤排查：

1. **打开 DevTools → Console**，确认具体的错误信息
2. **检查 Network 标签**，查看请求和响应头部——请求头是否有 `Origin`？响应头是否有 `Access-Control-Allow-Origin`？
3. **如果是复杂请求**，检查是否有 OPTIONS 预检
4. **确认是否使用了自定义请求头或非简单 Content-Type**
5. **确认请求是否携带了 Cookie/凭证**——如果是，检查 `Access-Control-Allow-Credentials`
6. **后端日志确认**是否有到达的请求

## 七、总结

半拍和社老师的故事讲完了，回头看一下 CORS 的本质：

- **问题来源**：浏览器的同源策略。请求能发出、服务器能收到、但浏览器不让你读到响应。
- **开发解决**：前端 proxy，不改后端，双方独立开发
- **单体后端**：CORS 中间件 + 动态 origin 白名单
- **生产/微服务**：Nginx / API 网关统一管控，后端零改动
- **核心规则**：带凭证请求不能用 `*`，OPTIONS 必须正确处理，白名单要动态

无论是前一天还在 Debug 的半拍，还是正在准备面试的你——理解了 CORS 的「为什么」和「怎么做」，下次再看到红字报错就不会慌了。
