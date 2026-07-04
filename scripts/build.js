import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import { createInitialsAvatarSvg, resolveIconSvg } from "../src/lib/iconSources.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const brandsPath = path.join(rootDir, "data", "brands.json");
const iconIndexPath = path.join(rootDir, "data", "icon-index.json");
const distDir = path.join(rootDir, "dist");
const distDataDir = path.join(distDir, "data");
const outputPath = path.join(distDir, "google-contacts-avatar.vcf");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const domainPattern = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/u;
const prefixPattern = /^[a-z0-9._%+-]+$/u;

function assertString(value, field, index) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Brand #${index + 1} has an invalid ${field}.`);
  }

  return value.trim();
}

function uniqueStrings(values, field, index) {
  if (!Array.isArray(values)) {
    throw new Error(`Brand #${index + 1} ${field} must be an array.`);
  }

  const items = values.map((value) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Brand #${index + 1} ${field} contains an invalid value.`);
    }

    return value.trim().toLowerCase();
  });

  return [...new Set(items)];
}

function escapeVCardText(value) {
  return value.replace(/\\/gu, "\\\\").replace(/,/gu, "\\,").replace(/;/gu, "\\;").replace(/\n/gu, "\\n");
}

function createVCard({ name, email, svg }) {
  const base64Svg = Buffer.from(svg, "utf8").toString("base64");

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardText(name)}`,
    `N:${escapeVCardText(name)};;;;`,
    `EMAIL;TYPE=INTERNET:${email}`,
    `PHOTO;ENCODING=b;TYPE=SVG:${base64Svg}`,
    "END:VCARD"
  ].join("\n");
}

function normalizeBrand(rawBrand, index) {
  const name = assertString(rawBrand.name, "name", index);
  const domain = assertString(rawBrand.domain, "domain", index).toLowerCase();
  const iconSlug = assertString(rawBrand.icon_slug, "icon_slug", index).toLowerCase();
  const emails = uniqueStrings(rawBrand.email ?? [], "email", index);
  const prefixes = uniqueStrings(rawBrand.prefixes ?? [], "prefixes", index);

  if (!domainPattern.test(domain)) {
    throw new Error(`Brand "${name}" has an invalid domain.`);
  }

  for (const email of emails) {
    if (!emailPattern.test(email)) {
      throw new Error(`Brand "${name}" has an invalid email: ${email}`);
    }
  }

  for (const prefix of prefixes) {
    if (!prefixPattern.test(prefix)) {
      throw new Error(`Brand "${name}" has an invalid prefix: ${prefix}`);
    }
  }

  const generatedEmails = prefixes.map((prefix) => `${prefix}@${domain}`);

  return {
    name,
    domain,
    iconSlug,
    emails: [...new Set([...emails, ...generatedEmails])]
  };
}

async function main() {
  const brands = JSON.parse(await readFile(brandsPath, "utf8"));
  const iconIndex = JSON.parse(await readFile(iconIndexPath, "utf8"));

  if (!Array.isArray(brands)) {
    throw new Error("data/brands.json must contain an array.");
  }

  const normalizedBrands = brands.map((rawBrand, index) => ({
    rawBrand,
    brand: normalizeBrand(rawBrand, index)
  }));

  const cards = [];

  for (const { rawBrand, brand } of normalizedBrands) {
    const icon = await resolveIconSvg(axios, rawBrand, iconIndex);
    const svg = icon?.svg || createInitialsAvatarSvg(rawBrand);

    for (const email of brand.emails) {
      cards.push(
        createVCard({
          name: brand.name,
          email,
          svg
        })
      );
    }
  }

  await mkdir(distDataDir, { recursive: true });
  await copyFile(brandsPath, path.join(distDataDir, "brands.json"));
  await copyFile(iconIndexPath, path.join(distDataDir, "icon-index.json"));
  await writeFile(outputPath, `${cards.join("\n")}\n`, "utf8");
  console.log(`Generated ${cards.length} contacts at ${path.relative(rootDir, outputPath)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
