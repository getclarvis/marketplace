# Contributing to the Clarvis Marketplace

Thank you for helping expand the Clarvis plugin ecosystem. This repository accepts community-built
plugins that are complete, inspectable, and useful to Clarvis users.

## Submission requirements

A bundled plugin submission must:

- live at `plugins/<plugin-name>`;
- use a lowercase name containing only letters, numbers, `_`, and `-`;
- include `plugin.json` at its root, with a matching `name`, a semantic `version`, a useful
  `description`, and an `author`;
- include at least one real Clarvis contribution, such as an agent, skill, hook, MCP server, or
  capability executable;
- contain no credentials, generated dependency trees, vendored secrets, or unexplained binaries;
- document setup, external services, environment variables, network access, commands, and other
  trust-relevant behavior in the plugin directory;
- be licensed under this repository's MIT License; and
- add one matching, alphabetically ordered entry to `marketplace.json`.

Each catalog entry must use this repository as its source and its own directory as the path:

```json
{
  "name": "quality-kit",
  "source": "https://github.com/getclarvis/marketplace.git",
  "path": "plugins/quality-kit",
  "description": "Review-oriented agents, skills, and checks.",
  "displayName": "Quality Kit",
  "homepage": "https://github.com/getclarvis/marketplace/tree/main/plugins/quality-kit",
  "category": "Quality"
}
```

An externally maintained plugin may instead be submitted as a reviewed listing. It must:

- use a canonical public `https://github.com/<owner>/<repository>.git` source without credentials,
  query parameters, redirects, or a mutable download URL;
- use `path` only when the plugin lives in a safe relative subdirectory of that repository;
- expose a Clarvis-readable `plugin.json`, `.clarvis-plugin/plugin.json`, or
  `.<host>-plugin/plugin.json` with a name matching the listing;
- have a clear open-source license and retain its upstream authorship;
- document commands, hooks, network access, telemetry, credentials, environment variables, and
  other trust-relevant behavior upstream;
- have at least one contribution exercised with a current Clarvis build; and
- add `reviews/<plugin-name>.json` naming the exact upstream revision, manifest, version, license,
  and review date that maintainers inspected.

For example:

```json
{
  "name": "example",
  "source": "https://github.com/community/example.git",
  "reviewedRevision": "0123456789abcdef0123456789abcdef01234567",
  "reviewedAt": "2026-08-26",
  "manifestPath": ".clarvis-plugin/plugin.json",
  "manifestVersion": "1.2.3",
  "license": "MIT"
}
```

The review revision is not a lockfile. Clarvis currently installs the source repository's current
default-branch `HEAD`; CI detects drift so maintainers can re-review or remove a stale listing.

## Before opening a pull request

Run the repository validator:

```bash
node scripts/validate-marketplace.mjs
node scripts/validate-marketplace.mjs --verify-upstreams
```

Also exercise the plugin with a current Clarvis build and describe what you tested in the pull
request. If the plugin runs commands, connects to a service, or sends data over the network, call
that out explicitly.

## Review

Maintainers may ask for narrower permissions, clearer setup, tests, documentation, or provenance
before accepting a plugin. A passing validator proves the repository structure and, with
`--verify-upstreams`, that an external repository's `HEAD` still matches its recorded review. It
does not prove the plugin's safety or correctness. Acceptance and later removal remain editorial
decisions for the official catalog.

By submitting bundled code, you agree that it is licensed under the MIT License in this repository.
An external listing keeps the license and authorship declared by its upstream repository.
