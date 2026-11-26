# 민들레 4D 체험관 SEO 检查与提交

## 正式站检查

2026-11-22（韩国时间）。对 `https://3d.mindulle.kr` 发送公开 GET 请求，分别使用 Googlebot、NAVER Yeti、Bingbot 的 User-Agent。

| 检查项 | 正式站在本次修改前 |
| --- | --- |
| 首页 `/` | 三种标识均返回 HTTP 200 和 `text/html` |
| `/robots.txt` | 三种标识均返回 HTTP 200 和 `text/plain`。通用规则 `User-agent: *`、`Allow: /` 适用于三种爬虫，并声明了站点地图 |
| `/sitemap.xml` | 三种标识均返回 HTTP 200 和 `application/xml`。原地图列出首页、条款和隐私政策 |
| 首页规范地址 | 已声明 `https://3d.mindulle.kr/`，保留该地址 |
| 首页索引约束 | 源码无 `noindex`，三种标识的首页响应均未发现 `X-Robots-Tag` |
| 首页正文和社交分享 | 有韩文标题、描述和基础 Open Graph。原始 HTML 的应用容器为空，缺少分享图、`og:url` 和 JSON-LD |

这些请求检查的是公开响应和抓取规则。搜索引擎实际抓取、所选规范地址和索引状态以验证后的站长后台为准。

## 本次 PR

- 首页增加静态韩文正文、分享图和 `WebSite`、`WebPage` 结构化数据。React 挂载后照常进入原有体验。
- 新增无需 JavaScript 的韩文使用指南 `/guide.html`，加入站点地图。条款和隐私页增加各自的规范地址。
- 运营监控页添加 HTML `noindex`。仅在 Vercel 对首页的 `room=pri-…` 请求增加 `X-Robots-Tag: noindex, follow`。普通首页仍可抓取和索引。私密房入口的既有验证流程照常运行。
- 独立分支 `seo/korean-crawlability` 在 Vercel 自动部署中停用。PR 等待确认后合并。

## 正式部署后的提交步骤

三家均使用该子域名的 HTTPS 地址。站点地图为 `https://3d.mindulle.kr/sitemap.xml`，首页为 `https://3d.mindulle.kr/`，韩文指南为 `https://3d.mindulle.kr/guide.html`。

### Google Search Console

1. 添加 `https://3d.mindulle.kr/` 的 URL 前缀属性并验证所有权。若已验证覆盖该子域名的 `mindulle.kr` 网域属性，可继续使用该属性。
2. 在 **站点地图** 提交 sitemap。URL 前缀属性通常只需填写 `sitemap.xml`。
3. 在 **网址检查** 分别输入首页和指南的完整 URL，运行实时测试，然后请求编入索引。后续查看抓取结果、用户声明的规范网址和 Google 选择的规范网址。

[Google 官方重新抓取指南](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

### NAVER Search Advisor

1. 进入 **웹마스터 도구 → 사이트 등록**，登记 `https://3d.mindulle.kr`，按页面提供的 HTML 验证文件或标签完成 **소유확인**。
2. 在 **요청 → 사이트맵 제출** 提交站点地图完整地址。
3. 在 **요청 → 웹 페이지 수집** 分别提交首页和指南。之后查看 **리포트 → 사이트 상태** 的抓取、robots.txt 和站点地图状态。

[NAVER 所有权验证](https://searchadvisor.naver.com/guide/faq-start-register) · [站点地图](https://searchadvisor.naver.com/guide/request-feed) · [页面抓取请求](https://searchadvisor.naver.com/guide/request-crawl)

### Bing Webmaster Tools

1. 添加并验证该 HTTPS 子域名，或从已验证的 Google Search Console 属性导入。
2. 在 **Sitemaps → Submit sitemaps** 提交站点地图完整地址。
3. 在 **URL Inspection** 检查首页和指南，使用 **Live URL** 查看 Bingbot 的实时响应，需要时选择 **Request indexing**。

[Bing 站点地图指南](https://www.bing.com/webmasters/help/Sitemaps-3b5cf6ed) · [Bing 网址检查](https://www.bing.com/webmasters/help/url-inspection-55a30305)

## 部署后复核

应确认首页、指南、站点地图和分享图均返回 200。检查首页的规范地址，确认普通首页无 `noindex`、运营监控页源码包含 `noindex`，以及通过私密房 URL 返回的 HTTP 响应有预期的 `X-Robots-Tag`。本次 PR 未提交站长工具验证令牌，也未代为提交收录。
