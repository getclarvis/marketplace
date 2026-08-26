# Plugins

Community plugins bundled into the official Clarvis marketplace live here, one directory per
plugin. Externally maintained plugins remain in their upstream repositories and have review records
under [`reviews/`](../reviews/README.md) instead.

The minimal shape is:

```text
plugins/<plugin-name>/
├── plugin.json
└── README.md
```

Add contribution directories such as `agents/`, `skills/`, or `hooks/` when the plugin needs them.
See the [Clarvis plugin guide](https://clarvis.dev/guide/plugins) and the repository-level
[contribution guide](../CONTRIBUTING.md) for the complete submission contract.
