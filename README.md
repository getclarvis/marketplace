# Clarvis Marketplace

The official marketplace for community-contributed [Clarvis](https://github.com/getclarvis/clarvis)
plugins.

Clarvis includes this repository as its default marketplace source. Opening `/extensions/market`
fetches the catalog, but a listing never installs, enables, or approves anything by itself. The
operator must explicitly install a plugin, enable it, and approve each hook definition they trust.

Plugins appear here only after a contribution is reviewed and merged; no plugin is installed by
default. An official listing means the Clarvis maintainers accepted it into this catalog. It does
not transfer maintenance or authorship of an externally hosted plugin to Clarvis.

## Catalog

| Plugin | Maintainer and source | Last reviewed upstream | Clarvis contributions at review |
| ------ | --------------------- | ---------------------- | ------------------------------- |
| [Superpowers](https://github.com/obra/superpowers) | Jesse Vincent / Prime Radiant | `v6.3.0` at `b36e082` | 14 skills and 1 opt-in hook |

The review revision records what maintainers inspected and tested. Clarvis currently installs the
upstream repository's current default-branch `HEAD`, so the revision is evidence, not an install
pin. CI reports when a reviewed external source moves and needs another review.

## Repository layout

```text
.
├── marketplace.json
├── plugins/
│   └── <plugin-name>/
│       ├── plugin.json
│       └── ...
├── reviews/
│   └── <external-plugin-name>.json
└── scripts/
    └── validate-marketplace.mjs
```

Bundled entries point back to this repository and name their directory under `plugins/`. Reviewed
external entries point to a canonical public GitHub clone URL and carry a separate review record.
In either case, Clarvis clones the source into a staging directory and installs only the selected
plugin root into the user's global plugin directory.

## Contribute a plugin

Read [CONTRIBUTING.md](CONTRIBUTING.md), add either a bundled plugin or a reviewed external listing,
and update `marketplace.json`. Then run the structural validator:

```bash
node scripts/validate-marketplace.mjs
```

Maintainers also verify that every external source still points at its reviewed revision:

```bash
node scripts/validate-marketplace.mjs --verify-upstreams
```

Inclusion means that the plugin is available through the official catalog. It is not a guarantee
that the plugin is suitable for every environment or that an external source has not changed since
its recorded review. Review a plugin's current source and displayed contributions before enabling
it, and approve hooks only after reading their exact definitions.

## License

This repository and contributions accepted into it are available under the [MIT License](LICENSE).
