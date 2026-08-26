# Contributing to the Clarvis Marketplace

Thank you for helping expand the Clarvis plugin ecosystem. This repository accepts community-built
plugins that are complete, inspectable, and useful to Clarvis users.

## Submission requirements

A plugin submission must:

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

## Before opening a pull request

Run the repository validator:

```bash
node scripts/validate-marketplace.mjs
```

Also exercise the plugin with a current Clarvis build and describe what you tested in the pull
request. If the plugin runs commands, connects to a service, or sends data over the network, call
that out explicitly.

## Review

Maintainers may ask for narrower permissions, clearer setup, tests, documentation, or provenance
before accepting a plugin. A passing validator proves the repository structure, not the plugin's
safety or correctness. Acceptance and later removal remain editorial decisions for the official
catalog.

By submitting a contribution, you agree that it is licensed under the MIT License in this
repository.
