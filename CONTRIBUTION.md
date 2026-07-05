# Contribution Guide

[中文贡献指南](CONTRIBUTION_ZHCN.md)

Thanks for helping improve Gmail Avatar Filler. The project works best when brand sender data is factual, easy to review, and useful to many Gmail users.

## Good Contributions

Useful changes include:

- Adding a brand that sends product, billing, security, newsletter, or support email.
- Updating sender addresses after a brand changes domains or email patterns.
- Improving `icon_slug` when a better match exists in the supported logo sources.
- Fixing documentation, accessibility, or small UI defects.

Keep each pull request focused. Data-only changes are easiest to review when they touch one clear group of brands.

## Brand Data

Edit `data/brands.json`. Each object represents one public brand.

Required fields:

- `name`: Public brand name.
- `domain`: Sender domain, lowercase.
- `icon_slug`: Preferred logo slug from an upstream logo source.
- `email`: Verified sender addresses.

Example:

```json
{
  "name": "Example",
  "domain": "example.com",
  "email": ["security@example.com", "billing@example.com"],
  "icon_slug": "example"
}
```

## Data Rules

- Use factual sender metadata only.
- Keep domains and email addresses lowercase.
- Keep `icon_slug` close to the upstream logo file name.
- Prefer widely used sender addresses over private, regional, or account-specific addresses.
- Do not add personal email addresses, tracking addresses, leaked data, or mailbox exports.
- Do not include copyrighted images, screenshots, or proprietary artwork in `data/brands.json`.

## Logo Matching

Supported logo sources:

1. `pheralb/svgl`
2. `VectorLogoZone/vectorlogozone`
3. `gilbarbara/logos`

Use the upstream logo slug when possible. If no logo is available, the build will generate an initials avatar, so brand data can still be accepted.

## Verification

Run:

```bash
npm run build:vcf
```

This validates brand data and writes `dist/google-contacts-avatar.vcf`.

## Pull Request Checklist

- Brand names, domains, and exact emails are factual.
- New values are lowercase where required.
- No private user data or copied image assets are included.
- The build command completes locally.
