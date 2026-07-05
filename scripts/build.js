import { cp, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import { createInitialsAvatarSvg, resolveIconSvg } from "../src/lib/iconSources.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const brandsPath = path.join(rootDir, "data", "brands.json");
const iconIndexPath = path.join(rootDir, "data", "icon-index.json");
const iconsDir = path.join(rootDir, "data", "icons");
const distDir = path.join(rootDir, "dist");
const distDataDir = path.join(distDir, "data");
const distIconsDir = path.join(distDataDir, "icons");
const outputPath = path.join(distDir, "google-contacts-avatar.vcf");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const domainPattern = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/u;

function logStep(message) {
  console.log(`[build:vcf] ${message}`);
}

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

function foldVCardLine(line) {
  const maxLength = 75;
  const chunks = [];

  for (let index = 0; index < line.length; index += maxLength) {
    chunks.push(`${index === 0 ? "" : " "}${line.slice(index, index + maxLength)}`);
  }

  return chunks.join("\n");
}

function createVCard({ name, domain, emails, svg }) {
  const base64Svg = Buffer.from(svg, "utf8").toString("base64");
  const emailLines = emails.map((email) => `EMAIL;TYPE=INTERNET:${email}`);

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardText(name)}`,
    `N:;${escapeVCardText(name)};;;`,
    `ORG:${escapeVCardText(name)}`,
    `URL:https://${domain}`,
    ...emailLines,
    foldVCardLine(`PHOTO;ENCODING=b;TYPE=SVG:${base64Svg}`),
    "END:VCARD"
  ].join("\n");
}

function createSenderContactName(name, email) {
  const localPart = email.split("@")[0];
  const normalizedLocalPart = localPart
    .replace(/[._+-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (!normalizedLocalPart) {
    return name;
  }

  return `${name} ${normalizedLocalPart}`;
}

function normalizeBrand(rawBrand, index) {
  const name = assertString(rawBrand.name, "name", index);
  const domain = assertString(rawBrand.domain, "domain", index).toLowerCase();
  const iconSlug = assertString(rawBrand.icon_slug, "icon_slug", index).toLowerCase();
  const emails = uniqueStrings(rawBrand.email ?? [], "email", index);

  if (!domainPattern.test(domain)) {
    throw new Error(`Brand "${name}" has an invalid domain.`);
  }

  for (const email of emails) {
    if (!emailPattern.test(email)) {
      throw new Error(`Brand "${name}" has an invalid email: ${email}`);
    }
  }

  if (emails.length === 0) {
    throw new Error(`Brand "${name}" must include at least one verified sender email.`);
  }

  return {
    name,
    domain,
    iconSlug,
    emails
  };
}

async function main() {
  const startedAt = Date.now();
  logStep("Reading brand data and icon index...");

  const brands = JSON.parse(await readFile(brandsPath, "utf8"));
  const iconIndex = JSON.parse(await readFile(iconIndexPath, "utf8"));

  if (!Array.isArray(brands)) {
    throw new Error("data/brands.json must contain an array.");
  }

  logStep(`Loaded ${brands.length} brand records.`);
  logStep("Validating brand data...");

  const normalizedBrands = brands.map((rawBrand, index) => ({
    rawBrand,
    brand: normalizeBrand(rawBrand, index)
  }));

  const totalEmails = normalizedBrands.reduce((total, { brand }) => total + brand.emails.length, 0);
  logStep(`Validated ${normalizedBrands.length} brand contacts and ${totalEmails} email addresses.`);
  logStep("Resolving logos and generating vCards...");

  const cards = [];

  for (const [index, { rawBrand, brand }] of normalizedBrands.entries()) {
    const label = `${index + 1}/${normalizedBrands.length} ${brand.name} <${brand.domain}>`;
    logStep(`Resolving ${label}...`);

    const icon = await resolveIconSvg(axios, rawBrand, iconIndex, {
      readLocalSvg(localPath) {
        return readFile(path.join(iconsDir, localPath), "utf8");
      }
    });
    const svg = icon?.svg || createInitialsAvatarSvg(rawBrand);

    for (const email of brand.emails) {
      cards.push(
        createVCard({
          name: createSenderContactName(brand.name, email),
          domain: brand.domain,
          emails: [email],
          svg
        })
      );
    }

    logStep(`Generated ${brand.emails.length} sender contacts for ${brand.name} using ${icon?.provider || "initials fallback"}.`);
  }

  logStep("Writing output files...");
  await mkdir(distDataDir, { recursive: true });
  await copyFile(brandsPath, path.join(distDataDir, "brands.json"));
  await copyFile(iconIndexPath, path.join(distDataDir, "icon-index.json"));
  await cp(iconsDir, distIconsDir, {
    recursive: true,
    force: true,
    errorOnExist: false
  }).catch((error) => {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  });
  await writeFile(outputPath, `${cards.join("\n")}\n`, "utf8");

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  logStep(`Generated ${cards.length} sender contacts with ${totalEmails} email addresses at ${path.relative(rootDir, outputPath)} in ${elapsedSeconds}s.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
