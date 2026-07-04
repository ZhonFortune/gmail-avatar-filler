# Gmail Avatar Filler

[English](README.md)

Gmail Avatar Filler 帮助社区让 Gmail 中的通知邮件更容易识别。项目会生成兼容 Google Contacts 的 `.vcf` 通讯录文件，将常见品牌发信地址映射为清晰的圆形头像。

<br>

## 项目目标

很多产品通知、账单、安全提醒和客服邮件在 Gmail 中只显示默认头像。导入生成的通讯录文件后，这些邮件会拥有一致的品牌识别，收件箱更容易快速浏览。

项目以开放数据方式维护：

- 品牌发信元数据位于 `data/brands.json`。
- Logo 来自开放 SVG 图标仓库。
- Release 提供可直接导入的 `google-contacts-avatar.vcf` 文件。

<br>

## 使用方式

1. 打开最新 GitHub Release。
2. 下载 `google-contacts-avatar.vcf`。
3. 将文件导入 Google Contacts。
4. 等待联系人同步后刷新 Gmail。

<br>

## Logo 来源

图标按以下顺序匹配：

1. `pheralb/svgl` [https://github.com/pheralb/svgl](https://github.com/pheralb/svgl)
2. `VectorLogoZone/vectorlogozone` [https://github.com/VectorLogoZone/vectorlogozone](https://github.com/VectorLogoZone/vectorlogozone)
3. `gilbarbara/logos` [https://github.com/gilbarbara/logos](https://github.com/gilbarbara/logos)

没有匹配 Logo 时，构建会生成简洁的品牌首字母头像。

<br>

## 本地开发

环境要求：

- Node.js 22 或更新版本。

命令：

```bash
npm install
npm run build
npm run build:vcf
```

站点文件位于 `dist/`。生成的通讯录文件位于 `dist/google-contacts-avatar.vcf`。

<br>

## 参与贡献

社区可以贡献以下内容：

- 补充缺失品牌和发信地址。
- 修正过期域名或发信模式。
- 在上游存在更合适 Logo 时改进图标匹配。
- 修复可访问性、性能或文档问题。

编辑品牌数据前，请先阅读 [贡献指南](CONTRIBUTION_ZHCN.md)

<br>

## 许可证

代码基于 MIT 协议开源。品牌名称、Logo 和商标归各自权利方所有。Logo 仅用于帮助用户识别邮件来源。
