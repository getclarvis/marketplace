# Clarvis Marketplace

The official marketplace for community-contributed [Clarvis](https://github.com/getclarvis/clarvis)
plugins.

Clarvis includes this repository as its default marketplace source. Opening `/extensions/market`
fetches the catalog, but a listing never installs, enables, or approves anything by itself. The
operator must explicitly install a plugin, enable it, and approve each hook definition they trust.

The catalog intentionally starts empty. Plugins appear here only after a contribution is reviewed
and merged; no plugin is installed by default.

## Repository layout

```text
.
├── marketplace.json
├── plugins/
│   └── <plugin-name>/
│       ├── plugin.json
│       └── ...
└── scripts/
    └── validate-marketplace.mjs
```

Every catalog entry points back to this repository and names its plugin subdirectory. Clarvis clones
the repository into a staging directory and installs only that subdirectory into the user's global
plugin directory.

## Contribute a plugin

Read [CONTRIBUTING.md](CONTRIBUTING.md), add the plugin under `plugins/<plugin-name>`, and add its
entry to `marketplace.json`. Then run:

```bash
node scripts/validate-marketplace.mjs
```

Inclusion means that the plugin is available through the official catalog. It is not a guarantee
that the plugin is suitable for every environment. Review a plugin's source and displayed
contributions before enabling it.

## License

This repository and contributions accepted into it are available under the [MIT License](LICENSE).
