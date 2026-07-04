<script setup>
import axios from "axios";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { createInitialsAvatarSvg, resolveIconSvg, svgToDataUri } from "./lib/iconSources.js";

const messages = {
  zh: {
    title: "Gmail Avatar Filler",
    releasePrefix: "最新版本：",
    releaseFallback: "获取中",
    heroLineOne: "告别 Gmail 灰色秃头",
    heroLineTwo: "让通知邮件重获新生",
    description:
      "使用开放矢量品牌库生成带圆形头像的 vCard 通讯录文件。导入 Google Contacts，让收件箱里的通知邮件拥有清晰标识。",
    download: "下载最新 .vcf 文件",
    guide: "查看导入教程",
    libraryTitle: "支持的品牌库",
    libraryText: "目前已适配",
    librarySuffix: "个互联网品牌与服务。",
    search: "搜索品牌名称或域名",
    noResultTitle: "未找到相关品牌",
    noResultText: "可在 GitHub 提交数据源补充。",
    sourceLabel: "图标源",
    guideSteps: ["下载文件", "导入通讯录", "刷新 Gmail"],
    footer: "基于 MIT 协议开源。",
    disclaimer:
      "免责声明：本项目中涉及的公司名称、品牌标识及商标归其各自合法拥有者所有。Logo 仅用于辅助识别邮件来源。"
  },
  en: {
    title: "Gmail Avatar Filler",
    releasePrefix: "Latest release: ",
    releaseFallback: "Loading",
    heroLineOne: "Replace blank Gmail avatars",
    heroLineTwo: "Give notification email a clear face",
    description:
      "Generate a vCard file with clean circular brand avatars from open vector logo libraries. Import it into Google Contacts and make notification email easier to scan.",
    download: "Download latest vCard File",
    guide: "View import guide",
    libraryTitle: "Supported brands",
    libraryText: "Currently matched",
    librarySuffix: "internet brands and services.",
    search: "Search brand or domain",
    noResultTitle: "No matching brand",
    noResultText: "Add a data source on GitHub.",
    sourceLabel: "Logo source",
    guideSteps: ["Download", "Import contacts", "Refresh Gmail"],
    footer: "Open sourced under the MIT License.",
    disclaimer:
      "Disclaimer: Company names, brand marks, and trademarks belong to their respective owners. Logos are used only to identify email sources."
  }
};

const language = ref(getInitialLanguage());
const query = ref("");
const brands = ref([]);
const randomBrands = ref([]);
const iconIndex = ref(null);
const loading = ref(true);
const loadError = ref("");
const stars = ref("—");
const releaseName = ref("");
const iconState = reactive({});
const previewLimit = 12;

const githubRepo = "ZhonFortune/gmail-avatar-filler";
const faviconUrl = `${import.meta.env.BASE_URL}favicon.ico`;
const releaseUrl = `https://github.com/${githubRepo}/releases/latest/download/google-contacts-avatar.vcf`;
const repoUrl = `https://github.com/${githubRepo}`;

const text = computed(() => messages[language.value]);
const releaseText = computed(() => {
  return `${text.value.releasePrefix}${releaseName.value || text.value.releaseFallback}`;
});
const filteredBrands = computed(() => {
  const value = query.value.trim().toLowerCase();

  if (!value) {
    return randomBrands.value;
  }

  return brands.value.filter((brand) => {
    return `${brand.name} ${brand.domain}`.toLowerCase().includes(value);
  }).slice(0, previewLimit);
});

const visibleBrands = computed(() => filteredBrands.value.slice(0, previewLimit));

function getInitialLanguage() {
  let saved = "";

  try {
    saved = localStorage.getItem("gmail-avatar-language") || "";
  } catch {
    saved = "";
  }

  if (saved === "zh" || saved === "en") {
    return saved;
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function setLanguage(value) {
  language.value = value;
  try {
    localStorage.setItem("gmail-avatar-language", value);
  } catch {
  }
  document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
}

function createEmails(brand) {
  const exact = Array.isArray(brand.email) ? brand.email : [];
  const prefixes = Array.isArray(brand.prefixes) ? brand.prefixes : [];
  const generated = prefixes.map((prefix) => `${prefix}@${brand.domain}`);

  return [...new Set([...exact, ...generated])];
}

function fallbackAvatar(brand) {
  return svgToDataUri(createInitialsAvatarSvg(brand));
}

function getIconState(brand) {
  return iconState[brand.domain] || {
    loading: true,
    url: "",
    provider: ""
  };
}

function pickRandomBrands(items, limit) {
  const pool = [...items];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool.slice(0, limit);
}

async function loadBrands() {
  loading.value = true;
  loadError.value = "";

  try {
    const [brandsResponse, iconIndexResponse] = await Promise.all([
      axios.get(`${import.meta.env.BASE_URL}data/brands.json`, {
        timeout: 10000
      }),
      axios.get(`${import.meta.env.BASE_URL}data/icon-index.json`, {
        timeout: 10000
      })
    ]);

    brands.value = Array.isArray(brandsResponse.data) ? brandsResponse.data : [];
    iconIndex.value = iconIndexResponse.data && typeof iconIndexResponse.data === "object" ? iconIndexResponse.data : null;
    randomBrands.value = pickRandomBrands(brands.value, previewLimit);
  } catch {
    loadError.value = language.value === "zh" ? "品牌数据加载失败" : "Brand data failed to load";
  } finally {
    loading.value = false;
  }
}

async function loadBrandIcon(brand) {
  const key = brand.domain;

  if (iconState[key]?.loading || iconState[key]?.url) {
    return;
  }

  iconState[key] = {
    loading: true,
    url: "",
    provider: ""
  };

  const icon = iconIndex.value ? await resolveIconSvg(axios, brand, iconIndex.value) : null;

  if (icon) {
    iconState[key] = {
      loading: false,
      url: svgToDataUri(icon.svg),
      provider: icon.provider
    };
    return;
  }

  iconState[key] = {
    loading: false,
    url: fallbackAvatar(brand),
    provider: "fallback"
  };
}

function handleAvatarError(brand) {
  iconState[brand.domain] = {
    loading: false,
    url: fallbackAvatar(brand),
    provider: "fallback"
  };
}

async function loadStars() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${githubRepo}`, {
      timeout: 10000
    });
    const count = Number(response.data?.stargazers_count ?? 0);
    stars.value = count > 999 ? `${(count / 1000).toFixed(1)}k` : String(count);
  } catch {
    stars.value = "—";
  }
}

async function loadLatestRelease() {
  try {
    const response = await axios.get(`https://api.github.com/repos/${githubRepo}/releases/latest`, {
      timeout: 10000
    });
    const name = String(response.data?.name || response.data?.tag_name || "").trim();
    releaseName.value = name || text.value.releaseFallback;
  } catch {
    releaseName.value = text.value.releaseFallback;
  }
}

onMounted(() => {
  setLanguage(language.value);
  loadBrands();
  loadStars();
  loadLatestRelease();
});

watch(
  visibleBrands,
  (items) => {
    for (const brand of items) {
      loadBrandIcon(brand);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="page">
    <nav class="nav">
      <div class="nav-inner">
        <a class="brand" href="#">
          <img class="brand-icon" :src="faviconUrl" alt="" width="32" height="32" decoding="async" aria-hidden="true" />
          <span>{{ text.title }}</span>
        </a>

        <div class="nav-actions">
          <div class="language-switch" aria-label="Language">
            <button :class="{ active: language === 'zh' }" type="button" @click="setLanguage('zh')">中</button>
            <button :class="{ active: language === 'en' }" type="button" @click="setLanguage('en')">EN</button>
          </div>

          <a class="github-link" :href="repoUrl" target="_blank" rel="noreferrer">
            <span class="stars" aria-label="GitHub stars">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3.4 2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.42 6.9 19.1l.98-5.68L3.75 9.4l5.7-.83L12 3.4Z" />
              </svg>
              {{ stars }}
            </span>
            <svg class="github-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.9 1.24 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>

    <main class="main">
      <section class="hero">
        <div class="release">
          <span class="pulse" aria-hidden="true"><span></span></span>
          {{ releaseText }}
        </div>
        <h1>
          {{ text.heroLineOne }}
          <span>{{ text.heroLineTwo }}</span>
        </h1>
        <p>{{ text.description }}</p>
        <div class="hero-actions">
          <a class="button primary" :href="releaseUrl">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
            </svg>
            {{ text.download }}
          </a>
          <a class="button secondary" href="#how-it-works">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 17v-6m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            </svg>
            {{ text.guide }}
          </a>
        </div>
      </section>

      <section id="explore" class="library">
        <div class="library-header">
          <div>
            <h2>{{ text.libraryTitle }}</h2>
            <p>
              {{ text.libraryText }}
              <strong>{{ brands.length }}</strong>
              {{ text.librarySuffix }}
            </p>
          </div>
          <label class="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
            </svg>
            <input v-model="query" type="search" :placeholder="`${text.search}`" />
          </label>
        </div>

        <div class="library-body">
          <div v-if="loading" class="empty-state">
            <div class="empty-icon loading-dot"></div>
          </div>

          <div v-else-if="loadError" class="empty-state">
            <div class="empty-icon">!</div>
            <h3>{{ loadError }}</h3>
          </div>

          <div v-else-if="visibleBrands.length" class="brand-grid">
            <article v-for="brand in visibleBrands" :key="brand.domain" class="brand-card">
              <figure class="brand-avatar">
                <div
                  v-if="getIconState(brand).loading || !getIconState(brand).url"
                  class="brand-avatar-loading"
                  aria-hidden="true"
                ></div>
                <img
                  v-else
                  class="brand-avatar-image"
                  :src="getIconState(brand).url"
                  :alt="brand.name"
                  width="56"
                  height="56"
                  decoding="async"
                  @error="handleAvatarError(brand)"
                />
              </figure>
              <div class="brand-copy">
                <h3>{{ brand.name }}</h3>
                <p :title="createEmails(brand).join(', ')">
                  {{ createEmails(brand)[0] }}
                  <span v-if="createEmails(brand).length > 1">(+{{ createEmails(brand).length - 1 }})</span>
                </p>
                <small v-if="getIconState(brand).provider">
                  {{ text.sourceLabel }}: {{ getIconState(brand).provider }}
                </small>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 5.3-12.8M19 5l-5 5m0-5 5 5" />
              </svg>
            </div>
            <h3>{{ text.noResultTitle }}</h3>
            <p>{{ text.noResultText }}</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" class="guide">
        <div v-for="(step, index) in text.guideSteps" :key="step" class="guide-step">
          <strong>{{ index + 1 }}</strong>
          <span>{{ step }}</span>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <a :href="repoUrl" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.41-4.04-1.41-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.9 1.24 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
          </svg>
        </a>
        <div>
          <p>© 2026 Gmail Avatar Filler. {{ text.footer }}</p>
          <p>{{ text.disclaimer }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>
