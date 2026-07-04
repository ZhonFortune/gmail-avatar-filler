const rawBase = "https://raw.githubusercontent.com";
const avatarSpec = {
  size: 256,
  center: 128,
  backgroundRadius: 120,
  iconBox: 148,
  defaultBackground: "#fff",
  darkBackground: "#111827"
};
const sourceConfig = {
  svgl: {
    provider: "svgl",
    repo: "pheralb/svgl",
    branch: "main"
  },
  vectorlogozone: {
    provider: "vectorlogozone",
    repo: "VectorLogoZone/vectorlogozone",
    branch: "main"
  },
  gilbarbara: {
    provider: "gilbarbara/logos",
    repo: "gilbarbara/logos",
    branch: "main"
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function createIconCandidates(iconSlug, domain) {
  const slug = normalizeSlug(iconSlug);
  const domainSlug = normalizeSlug(String(domain ?? "").split(".")[0]);
  const slugs = unique([slug, domainSlug]);

  return [
    ...slugs.flatMap((candidate) => [
      {
        provider: "svgl",
        url: `${rawBase}/pheralb/svgl/main/static/library/${candidate}_light.svg`
      },
      {
        provider: "svgl",
        url: `${rawBase}/pheralb/svgl/main/static/library/${candidate}.svg`
      },
      {
        provider: "svgl",
        url: `${rawBase}/pheralb/svgl/main/static/library/${candidate}_dark.svg`
      }
    ]),
    ...slugs.flatMap((candidate) => [
      {
        provider: "vectorlogozone",
        url: `${rawBase}/VectorLogoZone/vectorlogozone/main/src/content/logos/${candidate}/${candidate}-icon.svg`
      },
      {
        provider: "vectorlogozone",
        url: `${rawBase}/VectorLogoZone/vectorlogozone/main/src/content/logos/${candidate}/${candidate}-official.svg`
      },
      {
        provider: "vectorlogozone",
        url: `${rawBase}/VectorLogoZone/vectorlogozone/main/src/content/logos/${candidate}/${candidate}-ar21.svg`
      }
    ]),
    ...slugs.flatMap((candidate) => [
      {
        provider: "gilbarbara/logos",
        url: `${rawBase}/gilbarbara/logos/main/logos/${candidate}-icon.svg`
      },
      {
        provider: "gilbarbara/logos",
        url: `${rawBase}/gilbarbara/logos/main/logos/${candidate}.svg`
      }
    ])
  ];
}

function scorePath(source, slug, path) {
  if (source === "svgl") {
    if (path.endsWith(`/${slug}_light.svg`)) return 0;
    if (path.endsWith(`/${slug}.svg`)) return 1;
    if (path.endsWith(`/${slug}_logo.svg`)) return 2;
    if (path.endsWith(`/${slug}_dark.svg`)) return 3;
    if (path.includes("wordmark")) return 50;
    return 4;
  }

  if (source === "vectorlogozone") {
    if (path.endsWith(`/${slug}-icon.svg`)) return 0;
    if (path.endsWith(`/${slug}-official.svg`)) return 1;
    if (path.endsWith(`/${slug}-ar21.svg`)) return 7;
    return 4;
  }

  if (path.endsWith(`/${slug}-icon.svg`)) return 0;
  if (path.endsWith(`/${slug}.svg`)) return 2;

  return 4;
}

function createIndexedIconCandidates(iconSlug, domain, iconIndex) {
  const slug = normalizeSlug(iconSlug);
  const domainSlug = normalizeSlug(String(domain ?? "").split(".")[0]);
  const slugs = unique([slug, domainSlug]);
  const sources = ["svgl", "vectorlogozone", "gilbarbara"];
  const candidates = [];

  for (const [sourceIndex, source] of sources.entries()) {
    const config = sourceConfig[source];

    for (const candidateSlug of slugs) {
      const paths = iconIndex?.sources?.[source]?.[candidateSlug] || [];
      const sortedPaths = [...paths].sort((first, second) => {
        return scorePath(source, candidateSlug, first) - scorePath(source, candidateSlug, second);
      });

      for (const path of sortedPaths) {
        candidates.push({
          provider: config.provider,
          score: sourceIndex * 10 + scorePath(source, candidateSlug, path),
          url: `${rawBase}/${config.repo}/${config.branch}/${path}`
        });
      }
    }
  }

  return candidates.sort((first, second) => first.score - second.score);
}

function escapeXmlAttribute(value) {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/"/gu, "&quot;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
}

function formatNumber(value) {
  return Number(value.toFixed(6)).toString();
}

function readSvgBox(svg) {
  const viewBox = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/iu);

  if (viewBox) {
    const values = viewBox.slice(1, 5).map(Number);

    if (values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3]
      };
    }
  }

  const width = Number(svg.match(/\swidth=["']([\d.]+)(?:px)?["']/iu)?.[1] || 256);
  const height = Number(svg.match(/\sheight=["']([\d.]+)(?:px)?["']/iu)?.[1] || 256);

  return {
    x: 0,
    y: 0,
    width: width > 0 ? width : 256,
    height: height > 0 ? height : 256
  };
}

function readSvgRatio(svg) {
  const box = readSvgBox(svg);

  return box.width / box.height;
}

function isAvatarSvg(svg) {
  const ratio = readSvgRatio(svg);

  return ratio >= 0.2 && ratio <= 5;
}

function readSvgEnvelope(svg) {
  const cleanSvg = svg
    .replace(/<\?xml[\s\S]*?\?>/iu, "")
    .replace(/<!doctype[\s\S]*?>/iu, "");
  const root = cleanSvg.match(/<svg\b([^>]*)>/iu);

  return {
    attrs: root?.[1] || "",
    inner: cleanSvg
      .replace(/<svg\b[^>]*>/iu, "")
      .replace(/<\/svg>\s*$/iu, "")
      .trim()
  };
}

function readNamespaceAttributes(attrs) {
  const namespaces = [];
  const pattern = /\s(xmlns(?::[a-zA-Z][\w.-]*)?)=["']([^"']+)["']/giu;
  let match = pattern.exec(attrs);

  while (match) {
    if (match[1] !== "xmlns") {
      namespaces.push(`${match[1]}="${escapeXmlAttribute(match[2])}"`);
    }
    match = pattern.exec(attrs);
  }

  return namespaces.join(" ");
}

function readAttribute(attrs, name) {
  return attrs.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "iu"))?.[1] || "";
}

function readLengthAttribute(attrs, name, fallback = null) {
  const value = readAttribute(attrs, name);

  if (value === "100%") {
    return "100%";
  }

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function nearlyEqual(first, second, tolerance = 1) {
  return Math.abs(first - second) <= tolerance;
}

function shapeCoversCanvas(tag, attrs, box) {
  if (tag === "rect") {
    const x = readLengthAttribute(attrs, "x", box.x);
    const y = readLengthAttribute(attrs, "y", box.y);
    const width = readLengthAttribute(attrs, "width");
    const height = readLengthAttribute(attrs, "height");
    const fullWidth = width === "100%" || nearlyEqual(Number(width), box.width);
    const fullHeight = height === "100%" || nearlyEqual(Number(height), box.height);

    return fullWidth && fullHeight && nearlyEqual(Number(x), box.x) && nearlyEqual(Number(y), box.y);
  }

  return false;
}

function extractSolidBackground(inner, box, sourceUrl) {
  const trimmed = inner.trimStart();
  const shape = trimmed.match(/^<(rect)\b([^>]*)\/?>/iu);
  const fallback = sourceUrl.includes("_dark.svg") ? avatarSpec.darkBackground : avatarSpec.defaultBackground;

  if (!shape || !shapeCoversCanvas(shape[1].toLowerCase(), shape[2], box)) {
    return {
      background: fallback,
      inner
    };
  }

  const fill = readAttribute(shape[2], "fill");

  if (!fill || fill === "none" || fill === "transparent") {
    return {
      background: fallback,
      inner
    };
  }

  return {
    background: fill,
    inner: trimmed.slice(shape[0].length).trimStart()
  };
}

function fitBox(sourceBox) {
  const ratio = sourceBox.width / sourceBox.height;
  const width = ratio >= 1 ? avatarSpec.iconBox : avatarSpec.iconBox * ratio;
  const height = ratio >= 1 ? avatarSpec.iconBox / ratio : avatarSpec.iconBox;

  return {
    x: (avatarSpec.size - width) / 2,
    y: (avatarSpec.size - height) / 2,
    width,
    height
  };
}

export function normalizeAvatarSvg(svg, sourceUrl = "") {
  const sourceBox = readSvgBox(svg);
  const envelope = readSvgEnvelope(svg);
  const namespaceAttributes = readNamespaceAttributes(envelope.attrs);
  const extracted = extractSolidBackground(envelope.inner, sourceBox, sourceUrl);
  const fitted = fitBox(sourceBox);
  const sourceViewBox = [
    formatNumber(sourceBox.x),
    formatNumber(sourceBox.y),
    formatNumber(sourceBox.width),
    formatNumber(sourceBox.height)
  ].join(" ");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"${namespaceAttributes ? ` ${namespaceAttributes}` : ""} viewBox="0 0 ${avatarSpec.size} ${avatarSpec.size}" width="${avatarSpec.size}" height="${avatarSpec.size}">`,
    `<circle cx="${avatarSpec.center}" cy="${avatarSpec.center}" r="${avatarSpec.backgroundRadius}" fill="${escapeXmlAttribute(extracted.background)}"/>`,
    `<svg x="${formatNumber(fitted.x)}" y="${formatNumber(fitted.y)}" width="${formatNumber(fitted.width)}" height="${formatNumber(fitted.height)}" viewBox="${escapeXmlAttribute(sourceViewBox)}" preserveAspectRatio="xMidYMid meet">${extracted.inner}</svg>`,
    "</svg>"
  ].join("");
}

export function createInitialsAvatarSvg(brand) {
  const initials = String(brand?.name ?? "?")
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase()
    .replace(/[<>&"']/gu, "");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">',
    '<circle cx="128" cy="128" r="120" fill="#fff"/>',
    '<circle cx="128" cy="128" r="118" fill="#f8fafc" stroke="#e5e7eb" stroke-width="4"/>',
    `<text x="128" y="142" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="700" fill="#475569">${initials || "?"}</text>`,
    "</svg>"
  ].join("");
}

export async function resolveIconSvg(axiosClient, brand, iconIndex = null) {
  const indexedCandidates = iconIndex ? createIndexedIconCandidates(brand.icon_slug, brand.domain, iconIndex) : [];
  const candidates = iconIndex ? indexedCandidates : createIconCandidates(brand.icon_slug, brand.domain);

  for (const candidate of candidates) {
    try {
      const response = await axiosClient.get(candidate.url, {
        responseType: "text",
        timeout: 10000,
        transformResponse: [(data) => data],
        validateStatus: (status) => status >= 200 && status < 300
      });

      const svg = String(response.data ?? "").trim();

      if (svg.includes("<svg") && isAvatarSvg(svg)) {
        return {
          ...candidate,
          svg: normalizeAvatarSvg(svg, candidate.url)
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function svgToDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
