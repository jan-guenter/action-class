# `@action-class/action-yml`

> Typed representation of the `action.yml` structure. See
> [Metadata syntax for GitHub Actions](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions)
> for more information about the `action.yml` structure.

## Usage

### Install the package

```bash
npm install @action-class/action-yml
```

### Import the `ActionYml` type

```typescript
import type { ActionYml } from '@action-class/action-yml';
```

## Examples

### Read an `action.yml` file

This example reads an `action.yml` file and parses it into a `ActionYml` object using the `js-yaml` package.

```typescript
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import type { ActionYml } from '@action-class/action-yml';

const actionYml = yaml.load(await fs.readFile('action.yml', 'utf8')) as ActionYml;
```

## License

This library is published under the [MIT license](LICENSE).
