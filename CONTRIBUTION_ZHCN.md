# 贡献指南

[English](CONTRIBUTION.md)

感谢你帮助改进 Gmail Avatar Filler。项目依赖事实准确、便于审查、对大量 Gmail 用户有价值的品牌发信数据。

## 适合贡献的内容

适合提交的改动包括：

- 添加会发送产品、账单、安全提醒、订阅或客服邮件的品牌。
- 品牌变更域名或发信模式后更新发信地址。
- 上游存在更合适 Logo 时改进 `icon_slug`。
- 修正文档、可访问性或小型界面问题。

每个 Pull Request 保持聚焦。只修改数据时，按明确品牌范围提交更容易审查。

## 品牌数据

在 `data/brands.json` 中编辑品牌数据。每个对象代表一个公开品牌。

必填字段：

- `name`：公开品牌名称。
- `domain`：发信域名，使用小写。
- `icon_slug`：来自上游图标源的优先 Logo slug。
- `prefixes`：用于生成邮箱地址的本地部分。

可选字段：

- `email`：当前缀无法完整表达时必须保留的完整发信地址。

示例：

```json
{
  "name": "Example",
  "domain": "example.com",
  "email": ["security@example.com"],
  "icon_slug": "example",
  "prefixes": ["billing", "support"]
}
```

## 数据规则

- 只使用事实性的发信元数据。
- 域名和前缀保持小写。
- 发信地址使用子域名、特殊本地部分或一次性地址时，写入 `email`。
- `icon_slug` 贴近上游图标文件名。
- 优先添加广泛使用的发信地址，避免私有、区域限定或账号专属地址。
- 不要添加个人邮箱、追踪地址、泄露数据或邮箱导出内容。
- 不要在 `data/brands.json` 中加入受版权保护的图片、截图或专有素材。

## Logo 匹配

支持的图标源：

1. `pheralb/svgl`
2. `VectorLogoZone/vectorlogozone`
3. `gilbarbara/logos`

优先使用上游 Logo slug。没有可用 Logo 时，构建会生成品牌首字母头像，因此品牌数据仍然可以被接收。

## 验证

运行：

```bash
npm run build:vcf
```

该命令会校验品牌数据，并输出 `dist/google-contacts-avatar.vcf`。

## Pull Request 检查清单

- 品牌名称、域名、前缀和完整邮箱均有事实依据。
- 需要小写的字段已经使用小写。
- 未包含私人用户数据或复制的图片素材。
- 本地构建命令可以完成。
