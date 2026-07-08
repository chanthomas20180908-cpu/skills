#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { gzipSync, gunzipSync } from "node:zlib";

const ROOT = path.resolve(import.meta.dirname);
const STATE_DIR = path.join(ROOT, "state");
const USER_AGENT = "Mozilla/5.0 (compatible; CompetitorIntelMonitor/1.0)";
const execFileAsync = promisify(execFile);
const curlOnlyHosts = new Set();
const localeSegments = new Set([
  "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "th",
  "vi", "zh", "zh-cn", "zh-hk", "zh-tw",
]);

const targets = {
  neuralframes: {
    stateFile: path.join(STATE_DIR, "neuralframes.json"),
    sitemapRoots: ["https://www.neuralframes.com/sitemap-0.xml"],
    skipSitemapPrefixes: [],
    alwaysFingerprint: [
      "https://www.neuralframes.com/",
      "https://www.neuralframes.com/pricing",
      "https://www.neuralframes.com/blog",
      "https://www.neuralframes.com/product",
      "https://www.neuralframes.com/about",
      "https://www.neuralframes.com/shortform-studio",
      "https://www.neuralframes.com/ai-music-video-generator",
      "https://www.neuralframes.com/audio-visualizer",
      "https://www.neuralframes.com/features/autopilot",
      "https://www.neuralframes.com/tunes",
    ],
    baselineKinds: new Set(["article"]),
  },
  freebeat: {
    stateFile: path.join(STATE_DIR, "freebeat.json"),
    sitemapRoots: ["https://freebeat.ai/sitemap.xml"],
    skipSitemapPrefixes: ["https://freebeat.ai/gallery/sitemap/"],
    alwaysFingerprint: [
      "https://freebeat.ai/",
      "https://freebeat.ai/pricing",
      "https://freebeat.ai/blogs",
      "https://freebeat.ai/tools",
      "https://freebeat.ai/agent",
      "https://freebeat.ai/music-video-generator",
      "https://freebeat.ai/music-video-maker",
      "https://freebeat.ai/suno-to-video",
      "https://freebeat.ai/lyrics-video-generator",
      "https://freebeat.ai/music-visualizer",
      "https://freebeat.ai/realtime",
      "https://freebeat.ai/cli",
    ],
    baselineKinds: new Set(["article", "blog"]),
  },
};

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const selected = requested.length ? requested : Object.keys(targets);

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeEntities(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(value = "") {
  return decodeEntities(value.replace(/<[^>]*>/g, " "));
}

function normalizeText(value = "") {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchText(url, attempts = 2) {
  const host = new URL(url).host;
  let lastError;
  if (!curlOnlyHosts.has(host)) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, {
          headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
          redirect: "follow",
          signal: controller.signal,
        });
        if (response.status === 403) {
          curlOnlyHosts.add(host);
          lastError = new Error("403 Forbidden");
          break;
        }
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return { text: await response.text(), status: response.status, finalUrl: response.url };
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  try {
    const { stdout } = await execFileAsync("curl", [
      "-L",
      "--max-time", "30",
      "--retry", "1",
      "-sS",
      url,
    ], { maxBuffer: 20 * 1024 * 1024, encoding: "utf8" });
    return { text: stdout, status: 200, finalUrl: url };
  } catch (curlError) {
    throw new Error(`Fetch failed for ${url}: ${lastError?.message || lastError}; curl fallback: ${curlError.message}`);
  }
}

function parseEntries(xml, tagName) {
  const entries = [];
  const blockPattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  for (const match of xml.matchAll(blockPattern)) {
    const block = match[1];
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    if (!loc) continue;
    entries.push({
      loc: decodeEntities(loc.trim()),
      lastmod: block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim() || null,
    });
  }
  return entries;
}

async function collectSitemaps(target) {
  const queue = [...target.sitemapRoots];
  const visited = new Set();
  const skipped = [];
  const urls = [];

  while (queue.length) {
    const sitemapUrl = queue.shift();
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);

    if (target.skipSitemapPrefixes.some((prefix) => sitemapUrl.startsWith(prefix))) {
      skipped.push(sitemapUrl);
      continue;
    }

    const { text } = await fetchText(sitemapUrl);
    if (/<sitemapindex\b/i.test(text)) {
      for (const entry of parseEntries(text, "sitemap")) {
        if (target.skipSitemapPrefixes.some((prefix) => entry.loc.startsWith(prefix))) {
          skipped.push(entry.loc);
        } else {
          queue.push(entry.loc);
        }
      }
      continue;
    }

    for (const entry of parseEntries(text, "url")) {
      urls.push({ url: entry.loc, lastmod: entry.lastmod, sitemap: sitemapUrl });
    }
  }

  const bySitemap = new Map();
  for (const item of urls) {
    if (new URL(item.url).host !== new URL(item.sitemap).host) {
      item.lastmod_raw = item.lastmod;
      item.lastmod = null;
      item.lastmod_volatile = true;
    }
    const group = bySitemap.get(item.sitemap) || [];
    group.push(item);
    bySitemap.set(item.sitemap, group);
  }
  for (const group of bySitemap.values()) {
    if (group.length < 50) continue;
    const counts = new Map();
    for (const item of group) {
      if (!item.lastmod) continue;
      counts.set(item.lastmod, (counts.get(item.lastmod) || 0) + 1);
    }
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!dominant || dominant[1] / group.length < 0.8) continue;
    for (const item of group) {
      if (item.lastmod !== dominant[0]) continue;
      item.lastmod_raw = item.lastmod;
      item.lastmod = null;
      item.lastmod_volatile = true;
    }
  }

  return { urls, sitemaps: [...visited], skipped: [...new Set(skipped)].sort() };
}

function classifyUrl(url, sitemap) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  let locale = null;
  if (parts.length && localeSegments.has(parts[0].toLowerCase())) locale = parts.shift();
  const pathname = `/${parts.join("/")}`;

  let kind = "page";
  if (/\/articles\//.test(pathname) || /\/post\//.test(pathname)) kind = "article";
  else if (/\/blogs?\//.test(pathname)) kind = "blog";
  else if (/pricing/.test(pathname)) kind = "pricing";
  else if (/\/tools?\//.test(pathname) || sitemap.includes("tool-details")) kind = "tool";
  else if (/seo-landings/.test(sitemap)) kind = "seo_landing";
  else if (/shortform-studio/.test(pathname)) kind = "template";
  else if (pathname === "/" || pathname === "") kind = "homepage";
  else if (/privacy|terms|imprint|policy|login|offline/.test(pathname)) kind = "system";

  return { kind, locale };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readJsonLines(file) {
  if (!existsSync(file)) return [];
  const text = await readFile(file, "utf8");
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

async function writeAtomic(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, data);
  await rename(temp, file);
}

async function appendJsonLines(file, records) {
  if (!records.length) return;
  await mkdir(path.dirname(file), { recursive: true });
  const existing = existsSync(file) ? await readFile(file, "utf8") : "";
  const prefix = existing && !existing.endsWith("\n") ? `${existing}\n` : existing;
  await writeAtomic(file, `${prefix}${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
}

function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeEntities(value.trim());
  }
  return null;
}

function extractJsonLdDate(html, field) {
  return html.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`, "i"))?.[1] || null;
}

function extractFingerprint(url, html, checkedAt, status) {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") || null;
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => normalizeText(stripTags(match[1])))
    .find((value) => value && !/^(Choose music|What do you want to create\?)$/i.test(value)) || null;

  let cleanedHtml = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/\b(?:Choose music|What do you want to create\?)\b/gi, " ");
  for (const marker of ["Agent Feature Tutorials", "Top Charts"]) {
    const markerIndex = cleanedHtml.indexOf(marker);
    if (markerIndex > 1000) cleanedHtml = cleanedHtml.slice(0, markerIndex);
  }
  const headings = [...cleanedHtml.matchAll(/<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => normalizeText(stripTags(match[2])))
    .filter(Boolean)
    .slice(0, 80);
  const text = normalizeText(stripTags(cleanedHtml));
  const sections = {};
  const sectionPattern = /<h([2-3])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-3]\b|$)/gi;
  for (const match of cleanedHtml.matchAll(sectionPattern)) {
    const heading = normalizeText(stripTags(match[2]));
    const body = normalizeText(stripTags(match[3]));
    if (!heading || !body) continue;
    if (heading === "Agent Feature Tutorials" || heading === "Top Charts") break;
    sections[heading] = {
      hash: hash(body),
      length: body.length,
      sample: body.slice(0, 280),
    };
    if (Object.keys(sections).length >= 80) break;
  }

  const ctas = [...html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)]
    .map((match) => normalizeText(stripTags(match[1])))
    .filter((value) => value && value.length <= 80)
    .slice(0, 40);
  const priceTokens = [...new Set(text.match(/(?:[$€£]\s?\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s?(?:USD|EUR|credits?))/gi) || [])]
    .slice(0, 80);

  return {
    fingerprint_version: 4,
    url,
    checked_at: checkedAt,
    http_status: status,
    title,
    h1,
    description: extractMeta(html, "description"),
    canonical: html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || null,
    date_published: extractJsonLdDate(html, "datePublished"),
    date_modified: extractJsonLdDate(html, "dateModified"),
    text_hash: hash(text),
    text_length: text.length,
    headings,
    headings_hash: hash(headings.join("\n")),
    sections,
    ctas: [...new Set(ctas)],
    price_tokens: priceTokens,
    content: text,
  };
}

function diffFingerprint(before, after) {
  const fields = ["title", "h1", "description", "canonical", "date_published", "date_modified", "headings_hash", "price_tokens"];
  const changedFields = fields.filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
  const beforeSections = before.sections || {};
  const afterSections = after.sections || {};
  const addedSections = Object.keys(afterSections).filter((key) => !beforeSections[key]);
  const removedSections = Object.keys(beforeSections).filter((key) => !afterSections[key]);
  const changedSections = Object.keys(afterSections).filter(
    (key) => beforeSections[key] && beforeSections[key].hash !== afterSections[key].hash,
  );
  return { changed_fields: changedFields, added_sections: addedSections, removed_sections: removedSections, changed_sections: changedSections };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function relativeStatePath(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

async function updateCompetitor(name) {
  const target = targets[name];
  if (!target) throw new Error(`Unknown competitor: ${name}`);

  const today = shanghaiDate();
  const state = await readJson(target.stateFile);
  const monitoring = state.monitoring || {};
  const inventoryFile = path.join(ROOT, monitoring.inventory_file || `state/inventory/${name}.jsonl`);
  const fingerprintsFile = path.join(ROOT, monitoring.fingerprints_file || `state/fingerprints/${name}.jsonl`);
  const contentFile = path.join(ROOT, monitoring.content_store_file || `state/content/${name}.json.gz`);
  const changesFile = path.join(ROOT, monitoring.changes_file || `state/changes/${name}.jsonl`);
  const previousInventory = await readJsonLines(inventoryFile);
  const previousByUrl = new Map(previousInventory.map((record) => [record.url, record]));
  const previousFingerprints = await readJsonLines(fingerprintsFile);
  const previousFingerprintByUrl = new Map(previousFingerprints.map((record) => [record.url, record]));
  const previousContent = existsSync(contentFile)
    ? JSON.parse(gunzipSync(await readFile(contentFile)).toString("utf8"))
    : {};
  const isBaseline = previousInventory.length === 0;

  const collected = await collectSitemaps(target);
  const deduped = new Map();
  for (const item of collected.urls) {
    const classified = classifyUrl(item.url, item.sitemap);
    deduped.set(item.url, { ...item, ...classified });
  }

  const currentUrls = new Set(deduped.keys());
  const inventory = [];
  const newUrls = [];
  const lastmodChanged = [];
  for (const item of [...deduped.values()].sort((a, b) => a.url.localeCompare(b.url))) {
    const before = previousByUrl.get(item.url);
    if (!before && !isBaseline) newUrls.push(item);
    if (before && before.lastmod !== item.lastmod) lastmodChanged.push({ before, after: item });
    inventory.push({
      url: item.url,
      sitemap: item.sitemap,
      kind: item.kind,
      locale: item.locale,
      lastmod: item.lastmod,
      lastmod_raw: item.lastmod_raw || item.lastmod,
      lastmod_volatile: Boolean(item.lastmod_volatile),
      first_seen: before?.first_seen || today,
      last_seen: today,
      missing_runs: 0,
      source_unobserved_runs: 0,
      status: "active",
    });
  }

  const pendingMissing = [];
  const removed = [];
  const observedSitemaps = new Set(collected.sitemaps);
  for (const before of previousInventory) {
    if (currentUrls.has(before.url)) continue;
    const sourceUnobservedRuns = observedSitemaps.has(before.sitemap)
      ? 0
      : (before.source_unobserved_runs || 0) + 1;
    if (sourceUnobservedRuns < 2) {
      inventory.push({
        ...before,
        last_seen: today,
        missing_runs: 0,
        source_unobserved_runs: sourceUnobservedRuns,
        status: "active",
      });
      continue;
    }
    const missingRuns = (before.missing_runs || 0) + 1;
    const record = {
      ...before,
      missing_runs: missingRuns,
      source_unobserved_runs: sourceUnobservedRuns,
      status: missingRuns >= (monitoring.removal_confirmation_runs || 2) ? "removed" : "pending_missing",
    };
    inventory.push(record);
    if (record.status === "removed" && before.status !== "removed") removed.push(record);
    else if (record.status === "pending_missing") pendingMissing.push(record);
  }
  inventory.sort((a, b) => a.url.localeCompare(b.url));

  const massThreshold = monitoring.mass_lastmod_threshold || 200;
  const fingerprintTargets = new Set(target.alwaysFingerprint);
  for (const record of previousFingerprints) {
    if (record.pending_change) fingerprintTargets.add(record.url);
  }
  if (isBaseline) {
    for (const item of deduped.values()) {
      if (!item.locale && target.baselineKinds.has(item.kind)) fingerprintTargets.add(item.url);
    }
  } else {
    for (const item of newUrls) fingerprintTargets.add(item.url);
    if (lastmodChanged.length <= massThreshold) {
      for (const item of lastmodChanged) fingerprintTargets.add(item.after.url);
    } else {
      const byKind = new Map();
      for (const item of lastmodChanged) {
        const list = byKind.get(item.after.kind) || [];
        if (list.length < 5) list.push(item.after.url);
        byKind.set(item.after.kind, list);
      }
      for (const urls of byKind.values()) for (const url of urls) fingerprintTargets.add(url);
    }
  }

  const fetched = await mapLimit([...fingerprintTargets].sort(), 8, async (url) => {
    try {
      const response = await fetchText(url);
      return extractFingerprint(url, response.text, today, response.status);
    } catch (error) {
      return { url, checked_at: today, error: error.message };
    }
  });

  const nextFingerprintByUrl = new Map(previousFingerprintByUrl);
  const nextContent = { ...previousContent };
  const changeRecords = [];
  for (const current of fetched) {
    const before = previousFingerprintByUrl.get(current.url);
    if (current.error) {
      nextFingerprintByUrl.set(current.url, before
        ? { ...before, checked_at: today, last_error: current.error }
        : current);
      continue;
    }

    const { content, ...metadata } = current;
    if (!before?.text_hash || before.fingerprint_version !== current.fingerprint_version || before.text_hash === current.text_hash) {
      nextFingerprintByUrl.set(current.url, { ...metadata, pending_change: null, last_error: null });
      nextContent[current.url] = content;
      continue;
    }

    const samePending = before.pending_change?.observed?.text_hash === current.text_hash;
    const pendingRuns = samePending ? before.pending_change.consecutive_runs + 1 : 1;
    if (pendingRuns < 2) {
      nextFingerprintByUrl.set(current.url, {
        ...before,
        checked_at: today,
        last_error: null,
        pending_change: {
          first_seen: samePending ? before.pending_change.first_seen : today,
          last_seen: today,
          consecutive_runs: pendingRuns,
          observed: metadata,
        },
      });
      continue;
    }

    nextFingerprintByUrl.set(current.url, { ...metadata, pending_change: null, last_error: null });
    nextContent[current.url] = content;
    if (before.text_hash !== current.text_hash) {
      changeRecords.push({
        observed_at: today,
        competitor: name,
        type: current.price_tokens?.length && JSON.stringify(before.price_tokens) !== JSON.stringify(current.price_tokens)
          ? "commercial_updated"
          : "content_updated",
        url: current.url,
        before: {
          title: before.title,
          h1: before.h1,
          date_published: before.date_published,
          date_modified: before.date_modified,
          text_hash: before.text_hash,
          text_length: before.text_length,
          price_tokens: before.price_tokens,
        },
        after: {
          title: current.title,
          h1: current.h1,
          date_published: current.date_published,
          date_modified: current.date_modified,
          text_hash: current.text_hash,
          text_length: current.text_length,
          price_tokens: current.price_tokens,
        },
        diff: diffFingerprint(before, current),
      });
    }
  }

  if (!isBaseline) {
    for (const item of newUrls) {
      changeRecords.push({ observed_at: today, competitor: name, type: "created", url: item.url, sitemap: item.sitemap, lastmod: item.lastmod });
    }
    for (const item of removed) {
      changeRecords.push({ observed_at: today, competitor: name, type: "removed", url: item.url, last_seen: item.last_seen });
      nextFingerprintByUrl.delete(item.url);
      delete nextContent[item.url];
    }
  }

  const changedContentUrls = new Set(changeRecords.filter((record) => record.type === "content_updated" || record.type === "commercial_updated").map((record) => record.url));
  const metadataOnly = lastmodChanged.filter((item) => !changedContentUrls.has(item.after.url));
  const summary = {
    observed_at: today,
    competitor: name,
    type: isBaseline ? "baseline_created" : "run_summary",
    inventory: {
      active_urls: inventory.filter((record) => record.status === "active").length,
      new_urls: newUrls.length,
      pending_missing: pendingMissing.length,
      removed_urls: removed.length,
      lastmod_changed: lastmodChanged.length,
      metadata_only_or_unverified: metadataOnly.length,
    },
    content: {
      checked_pages: fetched.length,
      content_updated: changeRecords.filter((record) => record.type === "content_updated").length,
      commercial_updated: changeRecords.filter((record) => record.type === "commercial_updated").length,
      pending_confirmation: [...nextFingerprintByUrl.values()].filter((record) => record.pending_change).length,
      fetch_errors: fetched.filter((record) => record.error).length,
    },
    skipped_sitemaps: collected.skipped,
    note: isBaseline
      ? "首次结构化基线，不将现有 URL 记为本期新增。"
      : lastmodChanged.length > massThreshold
        ? "检测到批量 lastmod 变化，仅抽查各页面类型；不得自动解释为正文更新。"
        : "lastmod 单独变化归为 metadata_only_or_unverified，只有内容指纹变化才记为正文更新。",
  };

  const fingerprintRecords = [...nextFingerprintByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  await writeAtomic(inventoryFile, `${inventory.map((record) => JSON.stringify(record)).join("\n")}\n`);
  await writeAtomic(fingerprintsFile, `${fingerprintRecords.map((record) => JSON.stringify(record)).join("\n")}\n`);
  await writeAtomic(contentFile, gzipSync(JSON.stringify(nextContent), { level: 9 }));
  await appendJsonLines(changesFile, [summary, ...changeRecords]);

  state.schema_version = 2;
  state.last_run = today;
  state.monitoring = {
    ...monitoring,
    mode: "all_public_actions",
    last_sync: today,
    sitemap_roots: target.sitemapRoots,
    always_fingerprint: target.alwaysFingerprint,
    inventory_file: relativeStatePath(inventoryFile),
    fingerprints_file: relativeStatePath(fingerprintsFile),
    content_store_file: relativeStatePath(contentFile),
    changes_file: relativeStatePath(changesFile),
    removal_confirmation_runs: monitoring.removal_confirmation_runs || 2,
    content_change_confirmation_runs: 2,
    mass_lastmod_threshold: massThreshold,
    change_types: ["created", "content_updated", "commercial_updated", "removed", "metadata_only", "unverified"],
    channels: {
      website: { mode: "automated_crud", storage: relativeStatePath(inventoryFile) },
      product_and_pricing: { mode: "automated_fingerprint", storage: relativeStatePath(fingerprintsFile) },
      seo_content: { mode: "automated_fingerprint", storage: relativeStatePath(fingerprintsFile) },
      social: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
      paid_ads: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
      reviews: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
      creator_and_partnerships: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
      media: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
      developer: { mode: "report_source_ledger", storage: relativeStatePath(changesFile) },
    },
    action_record_schema: [
      "observed_at",
      "competitor",
      "type",
      "channel",
      "url",
      "before",
      "after",
      "evidence",
    ],
    excluded_from_item_inventory: collected.skipped,
    current_counts: summary.inventory,
    current_content_counts: summary.content,
  };
  await writeAtomic(target.stateFile, `${JSON.stringify(state, null, 2)}\n`);

  return summary;
}

for (const name of selected) {
  const result = await updateCompetitor(name);
  console.log(JSON.stringify(result, null, 2));
}
