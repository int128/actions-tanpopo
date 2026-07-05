# Remove js-yaml if not used

If the package.json depends on `js-yaml` but the codebase does not use it, removes `js-yaml` from package.json.

## Steps

1. Find out if `js-yaml` is used in the codebase, such as `import yaml from 'js-yaml'`.
2. If not used, run `pnpm remove js-yaml` to remove it from package.json.
