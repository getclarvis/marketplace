# External plugin reviews

Each JSON file records the exact upstream revision inspected before an externally maintained plugin
was admitted to the official Clarvis catalog. The validator requires one review record per external
listing and no orphaned records.

A review record is evidence, not an install pin. Clarvis currently clones the source repository's
current default-branch `HEAD`; scheduled CI reports when that `HEAD` differs from the recorded
revision. Maintainers must then review the change, update the record, or remove the listing.
