import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "marketplace.json");
const pluginsRoot = join(root, "plugins");
const officialSource = "https://github.com/getclarvis/marketplace.git";
const pluginName = /^[a-z0-9_-]+$/;
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const reservedNames = new Set(["__proto__", "constructor", "prototype"]);
const errors = [];

function report(condition, message) {
  if (!condition) errors.push(message);
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function exactKeys(value, allowed, label) {
  if (!record(value)) return;
  for (const key of Object.keys(value)) {
    report(allowed.has(key), `${label} contains unsupported field '${key}'`);
  }
}

const rawCatalog = readFileSync(catalogPath, "utf8");
const catalog = parseJson(catalogPath, "marketplace.json");

if (record(catalog)) {
  exactKeys(
    catalog,
    new Set(["name", "displayName", "description", "plugins"]),
    "marketplace.json",
  );
  report(catalog.name === "clarvis-official", "marketplace.json name must be 'clarvis-official'");
  report(catalog.displayName === "Clarvis Marketplace", "marketplace.json displayName must be 'Clarvis Marketplace'");
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

      const expectedPath = `plugins/${entry.name}`;
      const expectedHomepage = `https://github.com/getclarvis/marketplace/tree/main/${expectedPath}`;
      report(entry.source === officialSource, `${label}.source must be '${officialSource}'`);
      report(entry.path === expectedPath, `${label}.path must be '${expectedPath}'`);
      report(nonEmpty(entry.description), `${label}.description is required`);
      report(nonEmpty(entry.displayName), `${label}.displayName is required`);
      report(entry.homepage === expectedHomepage, `${label}.homepage must be '${expectedHomepage}'`);
      report(nonEmpty(entry.category), `${label}.category is required`);

      const pluginRoot = join(root, expectedPath);
      report(existsSync(pluginRoot), `${label} points to missing directory '${expectedPath}'`);
      if (!existsSync(pluginRoot)) continue;
      const pluginStat = lstatSync(pluginRoot);
      report(pluginStat.isDirectory() && !pluginStat.isSymbolicLink(), `${expectedPath} must be a real directory`);

      const manifestPath = join(pluginRoot, "plugin.json");
      report(existsSync(manifestPath), `${expectedPath}/plugin.json is missing`);
      if (!existsSync(manifestPath)) continue;
      const manifest = parseJson(manifestPath, `${expectedPath}/plugin.json`);
      if (!record(manifest)) {
        report(false, `${expectedPath}/plugin.json must be an object`);
        continue;
      }

      report(manifest.name === entry.name, `${expectedPath}/plugin.json name must match '${entry.name}'`);
      report(nonEmpty(manifest.version) && semver.test(manifest.version), `${expectedPath}/plugin.json needs a semantic version`);
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
    }

    const directoryNames = readdirSync(pluginsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();
    const listedNames = [...seen].sort();
    report(
      JSON.stringify(directoryNames) === JSON.stringify(listedNames),
      "every directory under plugins/ must have exactly one marketplace.json entry",
    );
  }
} else if (catalog !== undefined) {
  report(false, "marketplace.json must contain an object");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`marketplace validation passed (${String(catalog.plugins.length)} plugins)`);
}
