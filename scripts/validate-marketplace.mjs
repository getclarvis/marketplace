import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "marketplace.json");
const pluginsRoot = join(root, "plugins");
const reviewsRoot = join(root, "reviews");
const officialSource = "https://github.com/getclarvis/marketplace.git";
const pluginName = /^[a-z0-9_-]+$/;
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const revision = /^[0-9a-f]{40}$/;
const reviewDate = /^\d{4}-\d{2}-\d{2}$/;
const reservedNames = new Set(["__proto__", "constructor", "prototype"]);
const verifyUpstreams = process.argv.includes("--verify-upstreams");
const supportedArguments = new Set(["--verify-upstreams"]);
const errors = [];

for (const argument of process.argv.slice(2)) {
  if (!supportedArguments.has(argument)) errors.push(`unsupported argument '${argument}'`);
}

function report(condition, message) {
  if (!condition) errors.push(message);
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function safeRelativePath(value) {
  if (!nonEmpty(value) || value.startsWith("/") || value.includes("\\")) return false;
  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function validReviewDate(value) {
  if (typeof value !== "string" || !reviewDate.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(
      `${label} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

function exactKeys(value, allowed, label) {
  if (!record(value)) return;
  for (const key of Object.keys(value)) {
    report(allowed.has(key), `${label} contains unsupported field '${key}'`);
  }
}

function canonicalGithubRepository(value) {
  if (!nonEmpty(value)) return undefined;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repositoryWithSuffix = parts[1];
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      parts.length !== 2 ||
      owner === undefined ||
      repositoryWithSuffix === undefined ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) ||
      !/^[A-Za-z0-9._-]+\.git$/.test(repositoryWithSuffix)
    ) {
      return undefined;
    }
    const repository = repositoryWithSuffix.slice(0, -4);
    if (repository.length === 0 || repository === "." || repository === "..") return undefined;
    const source = `https://github.com/${owner}/${repository}.git`;
    if (value !== source) return undefined;
    return { source, homepage: `https://github.com/${owner}/${repository}` };
  } catch {
    return undefined;
  }
}

function readExternalReview(entry, label) {
  const reviewPath = join(reviewsRoot, `${entry.name}.json`);
  report(existsSync(reviewPath), `${label} needs reviews/${entry.name}.json`);
  if (!existsSync(reviewPath)) return undefined;
  const reviewStat = lstatSync(reviewPath);
  report(
    reviewStat.isFile() && !reviewStat.isSymbolicLink(),
    `reviews/${entry.name}.json must be a real file`,
  );
  if (!reviewStat.isFile() || reviewStat.isSymbolicLink()) return undefined;

  const rawReview = readFileSync(reviewPath, "utf8");
  const review = parseJson(reviewPath, `reviews/${entry.name}.json`);
  if (!record(review)) {
    if (review !== undefined) report(false, `reviews/${entry.name}.json must be an object`);
    return undefined;
  }
  exactKeys(
    review,
    new Set([
      "name",
      "source",
      "reviewedRevision",
      "reviewedAt",
      "manifestPath",
      "manifestVersion",
      "license",
    ]),
    `reviews/${entry.name}.json`,
  );
  report(
    rawReview === `${JSON.stringify(review, null, 2)}\n`,
    `reviews/${entry.name}.json must use two-space JSON formatting and end with a newline`,
  );
  report(review.name === entry.name, `reviews/${entry.name}.json name must match '${entry.name}'`);
  report(review.source === entry.source, `reviews/${entry.name}.json source must match the listing`);
  report(
    typeof review.reviewedRevision === "string" && revision.test(review.reviewedRevision),
    `reviews/${entry.name}.json needs a lowercase 40-character reviewedRevision`,
  );
  report(
    validReviewDate(review.reviewedAt),
    `reviews/${entry.name}.json needs a real reviewedAt date in YYYY-MM-DD form`,
  );
  report(
    typeof review.manifestPath === "string" &&
      safeRelativePath(review.manifestPath) &&
      (review.manifestPath === "plugin.json" || review.manifestPath.endsWith("/plugin.json")),
    `reviews/${entry.name}.json needs a safe relative manifestPath ending in plugin.json`,
  );
  report(
    nonEmpty(review.manifestVersion) && semver.test(review.manifestVersion),
    `reviews/${entry.name}.json needs a semantic manifestVersion`,
  );
  report(nonEmpty(review.license), `reviews/${entry.name}.json needs a license`);
  return review;
}

function gitEnvironment() {
  const environment = {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  };
  for (const key of [
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_COMMON_DIR",
    "GIT_CONFIG",
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_PARAMETERS",
    "GIT_DIR",
    "GIT_GRAFT_FILE",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_PREFIX",
    "GIT_SHALLOW_FILE",
    "GIT_WORK_TREE",
  ]) {
    delete environment[key];
  }
  return environment;
}

const rawCatalog = readFileSync(catalogPath, "utf8");
const catalog = parseJson(catalogPath, "marketplace.json");
const reviewedUpstreams = [];

if (record(catalog)) {
  exactKeys(
    catalog,
    new Set(["name", "displayName", "description", "plugins"]),
    "marketplace.json",
  );
  report(catalog.name === "clarvis-official", "marketplace.json name must be 'clarvis-official'");
  report(
    catalog.displayName === "Clarvis Marketplace",
    "marketplace.json displayName must be 'Clarvis Marketplace'",
  );
  report(nonEmpty(catalog.description), "marketplace.json needs a description");
  report(Array.isArray(catalog.plugins), "marketplace.json plugins must be an array");
  report(
    rawCatalog === `${JSON.stringify(catalog, null, 2)}\n`,
    "marketplace.json must use two-space JSON formatting and end with a newline",
  );

  if (Array.isArray(catalog.plugins)) {
    const names = catalog.plugins.map((entry) => (record(entry) ? entry.name : undefined));
    const comparableNames = names.filter((name) => typeof name === "string");
    const sortedNames = [...comparableNames].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    report(
      comparableNames.length === names.length &&
        comparableNames.every((name, index) => name === sortedNames[index]),
      "marketplace.json plugins must be ordered by name",
    );

    const seen = new Set();
    const bundledNames = new Set();
    const externalNames = new Set();
    for (const [index, entry] of catalog.plugins.entries()) {
      const label = `plugins[${String(index)}]`;
      report(record(entry), `${label} must be an object`);
      if (!record(entry)) continue;

      exactKeys(
        entry,
        new Set(["name", "source", "path", "description", "displayName", "homepage", "category"]),
        label,
      );
      report(nonEmpty(entry.name) && pluginName.test(entry.name), `${label}.name is invalid`);
      if (!nonEmpty(entry.name) || !pluginName.test(entry.name)) continue;
      report(!reservedNames.has(entry.name), `${label}.name is reserved`);
      report(!seen.has(entry.name), `${label}.name duplicates '${entry.name}'`);
      seen.add(entry.name);

      report(nonEmpty(entry.description), `${label}.description is required`);
      report(nonEmpty(entry.displayName), `${label}.displayName is required`);
      report(nonEmpty(entry.homepage), `${label}.homepage is required`);
      report(nonEmpty(entry.category), `${label}.category is required`);

      if (entry.source === officialSource) {
        bundledNames.add(entry.name);
        const expectedPath = `plugins/${entry.name}`;
        const expectedHomepage =
          `https://github.com/getclarvis/marketplace/tree/main/${expectedPath}`;
        report(entry.path === expectedPath, `${label}.path must be '${expectedPath}'`);
        report(entry.homepage === expectedHomepage, `${label}.homepage must be '${expectedHomepage}'`);

        const pluginRoot = join(root, expectedPath);
        report(existsSync(pluginRoot), `${label} points to missing directory '${expectedPath}'`);
        if (!existsSync(pluginRoot)) continue;
        const pluginStat = lstatSync(pluginRoot);
        report(
          pluginStat.isDirectory() && !pluginStat.isSymbolicLink(),
          `${expectedPath} must be a real directory`,
        );

        const manifestPath = join(pluginRoot, "plugin.json");
        report(existsSync(manifestPath), `${expectedPath}/plugin.json is missing`);
        if (!existsSync(manifestPath)) continue;
        const manifest = parseJson(manifestPath, `${expectedPath}/plugin.json`);
        if (!record(manifest)) {
          report(false, `${expectedPath}/plugin.json must be an object`);
          continue;
        }

        report(
          manifest.name === entry.name,
          `${expectedPath}/plugin.json name must match '${entry.name}'`,
        );
        report(
          nonEmpty(manifest.version) && semver.test(manifest.version),
          `${expectedPath}/plugin.json needs a semantic version`,
        );
        report(nonEmpty(manifest.description), `${expectedPath}/plugin.json needs a description`);
        report(
          nonEmpty(manifest.author) || (record(manifest.author) && nonEmpty(manifest.author.name)),
          `${expectedPath}/plugin.json needs an author`,
        );

        const contributionDirectory = ["agents", "skills", "hooks"].some((name) =>
          existsSync(join(pluginRoot, name)),
        );
        const contributionField = [
          "mcpServers",
          "hooks",
          "bootstrapSkill",
          "capabilityExecutables",
        ].some((name) => Object.hasOwn(manifest, name));
        report(
          contributionDirectory || contributionField,
          `${expectedPath} must contain at least one Clarvis contribution`,
        );
        continue;
      }

      externalNames.add(entry.name);
      const repository = canonicalGithubRepository(entry.source);
      report(
        repository !== undefined,
        `${label}.source must be '${officialSource}' or a canonical public GitHub HTTPS clone URL`,
      );
      if (repository === undefined) continue;
      if (entry.path !== undefined) {
        report(
          typeof entry.path === "string" && safeRelativePath(entry.path),
          `${label}.path must be a safe relative POSIX subdirectory when present`,
        );
      }
      report(
        entry.homepage === repository.homepage,
        `${label}.homepage must be '${repository.homepage}'`,
      );
      const review = readExternalReview(entry, label);
      if (review !== undefined) reviewedUpstreams.push(review);
    }

    const directoryNames = readdirSync(pluginsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    report(
      JSON.stringify(directoryNames) === JSON.stringify([...bundledNames].sort()),
      "every directory under plugins/ must have exactly one bundled marketplace.json entry",
    );

    const reviewNames = readdirSync(reviewsRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -5))
      .sort();
    report(
      JSON.stringify(reviewNames) === JSON.stringify([...externalNames].sort()),
      "every external marketplace entry must have exactly one reviews/<name>.json record",
    );
  }
} else if (catalog !== undefined) {
  report(false, "marketplace.json must contain an object");
}

if (verifyUpstreams && errors.length === 0) {
  for (const review of reviewedUpstreams) {
    const result = spawnSync(
      "git",
      ["ls-remote", "--exit-code", "--", review.source, "HEAD"],
      {
        cwd: tmpdir(),
        encoding: "utf8",
        env: gitEnvironment(),
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      },
    );
    if (result.error !== undefined || result.status !== 0) {
      const detail =
        result.error instanceof Error
          ? result.error.message
          : `${result.stderr || result.stdout || `exit ${String(result.status)}`}`.trim();
      errors.push(`could not verify ${review.name} upstream HEAD: ${detail}`);
      continue;
    }
    const head = result.stdout.trim().split(/\s+/)[0];
    report(
      head === review.reviewedRevision,
      `${review.name} upstream HEAD is ${head || "unknown"}, not reviewed revision ${review.reviewedRevision}`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const suffix = verifyUpstreams ? "; upstream revisions verified" : "";
  const count = catalog.plugins.length;
  const noun = count === 1 ? "plugin" : "plugins";
  console.log(`marketplace validation passed (${String(count)} ${noun}${suffix})`);
}
