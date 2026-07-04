import { readFile, writeFile } from "node:fs/promises";

const brandsPath = "data/brands.json";
const outputPath = "data/icon-index.json";
const sources = {
  svgl: {
    repo: "pheralb/svgl",
    match(path) {
      const match = path.match(/^static\/library\/(.+?)(?:_(?:dark|light|logo|wordmark|wordmark_dark|wordmark_light))?\.svg$/u);
      return match?.[1] || "";
    }
  },
  vectorlogozone: {
    repo: "VectorLogoZone/vectorlogozone",
    match(path) {
      const match = path.match(/^src\/content\/logos\/([^/]+)\/\1-(?:icon|official|ar21)\.svg$/u);
      return match?.[1] || "";
    }
  },
  gilbarbara: {
    repo: "gilbarbara/logos",
    match(path) {
      const match = path.match(/^logos\/(.+?)(?:-icon)?\.svg$/u);
      return match?.[1] || "";
    }
  }
};

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/gu, "and")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function candidateSlugs(brand) {
  const slug = normalizeSlug(brand.icon_slug);
  const domainSlug = normalizeSlug(String(brand.domain ?? "").split(".")[0]);

  return [...new Set([slug, domainSlug].filter(Boolean))];
}

async function fetchTree(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/main?recursive=1`, {
    headers: {
      "user-agent": "gmail-avatar-filler"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to read ${repo}: HTTP ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data.tree) ? data.tree.map((entry) => entry.path) : [];
}

async function main() {
  const brands = JSON.parse(await readFile(brandsPath, "utf8"));
  const requiredSlugs = new Set(brands.flatMap(candidateSlugs));
  const index = {
    generated_at: new Date().toISOString(),
    sources: {
      svgl: {},
      vectorlogozone: {},
      gilbarbara: {}
    }
  };

  for (const [sourceName, source] of Object.entries(sources)) {
    const paths = await fetchTree(source.repo);

    for (const path of paths) {
      const slug = source.match(path);

      if (!slug || !requiredSlugs.has(slug)) {
        continue;
      }

      index.sources[sourceName][slug] ||= [];
      index.sources[sourceName][slug].push(path);
    }
  }

  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");

  const indexedSlugCount = new Set(
    Object.values(index.sources).flatMap((source) => Object.keys(source))
  ).size;

  console.log(`required_slugs=${requiredSlugs.size}`);
  console.log(`indexed_slugs=${indexedSlugCount}`);
  console.log(`written=${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
