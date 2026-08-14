# Transitional Docs

Some repositories will be in a mixed state:

- area docs exist, but `docs/_index.md` does not
- technical docs live outside the intended long-term docs tree
- instruction fragments exist in legacy folders

Use those repositories as follows:

1. Read the smallest useful legacy material for the current task.
2. Make the gap explicit.
3. Prefer normalizing toward:
   - root `docs/_index.md`
   - area `_index.md` files
   - structured `_index.md` entries with `Path`, `Summary`, `Read when`, and `Tags`
   - canonical topic docs in `docs/`

Do not assume transitional locations are the intended long-term system.
