# Security Policy

Do not open a public issue for a suspected vulnerability in a marketplace plugin or in the catalog
infrastructure. Use the repository's
[private vulnerability reporting](https://github.com/getclarvis/marketplace/security/advisories/new)
flow and include the affected plugin, revision, impact, and a minimal reproduction when possible.

Marketplace inclusion is not an execution grant. Clarvis users must still install and enable a
plugin explicitly, and plugin hooks require approval of each exact definition.

Externally hosted listings are mutable upstream. The catalog records the revision maintainers
reviewed and CI detects a changed default-branch `HEAD`, but Clarvis currently installs the source's
current `HEAD` rather than that recorded revision. Include unexpected upstream drift in a private
report when it appears security-relevant.
