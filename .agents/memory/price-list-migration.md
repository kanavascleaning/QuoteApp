---
name: Price-list migration
description: Compatibility rule for converting one local rate card into named lists while preserving historical quotes.
---

When moving this app from one rate card to named price lists, migrate the old rate card into “Default” but do not rewrite historical quote line prices or totals. Older quotes have no original list ID, so their edit flow must use a temporary list reconstructed from their own saved line-item price snapshot; new quotes store the selected list ID and name.

**Why:** A historical quote can predate named lists or reflect a rate card that has since changed. Linking it to the current list would silently replace the values that were actually quoted.

**How to apply:** Preserve this distinction in any future storage migration, quote import, list deletion, and editing-flow changes.
