# @actions/action-class

A library for creating GitHub Actions with a class-based approach. This library simplifies the process of defining inputs, outputs, and other action properties, as well as handling the pre, main, and post steps of the action.

## Installation

```bash
npm install @actions/action-class
```

## Usage

Create a new GitHub Action class by extending the constructor returned by the `action` call from '@actions/action-class'.
Define action properties, inputs, and outputs in the `action` call argument.
To complete a runnable action you need to implement at least a `main` and optionally a `pre`, and a `post` method.

## Example

```typescript
import { action, runAction } from '@actions/action-class';

export class ExampleAction extends action({
  name: 'name',
  description: 'description',
  author: 'author',
  branding: {
    color: 'orange',
    icon: 'sunset',
  },
  inputs: {
    // Define your inputs here
  },
  outputs: {
    // Define your outputs here
  },
}) {
  // Define your class properties and constructor here

  async pre(): Promise<void> {
    // Define the pre step logic here
  }

  async main(): Promise<void> {
    // Define the main step logic here
  }

  async post(): Promise<void> {
    // Define the post step logic here
  }
}

// Execute the action with the constructor arguments
runAction(TestAction, 'test');
```

## API

### `action(options: ActionOptions): constructor`

The action function is a higher-order function that takes an `ActionOptions` object as an argument and returns a class constructor.
The `ActionOptions` object defines the properties, inputs, outputs, and branding for the action.

### `runAction(ActionClass: Class, ...args: any[]): Promise<void>`

The `runAction` function takes a GitHub Action class and its constructor arguments, then executes the action.
This async function needs to be called at the end of the action file and not being awaited.

### `ActionOptions`

- `name` _(optional)_: The name of the action. Defaults to the name from the `package.json`.
- `description` _(optional)_: A short description of the action. Defaults to the description from the `package.json`.
- `author` _(optional)_: The author of the action. Defaults to the author from the `package.json` if present.
- `branding` _(optional)_: An object with branding properties for the action.
- `inputs` _(optional)_: An object with the action inputs. See [Inputs](#inputs) for more information.
- `outputs` _(optional)_: An object with the action outputs. See [Outputs](#outputs) for more information.


#### Inputs and Outputs

The `inputs` and `outputs` properties of the `ActionOptions` object define the inputs and outputs of your GitHub Action.
Inputs and outputs are defined using key-value pairs, where the key is the name of the input or output, and the value is an object with specific properties.

##### Inputs

Inputs are defined in the `inputs` property of the `ActionOptions` object.
Each input is represented by an object with the following properties:

- `description`: A string describing the input.
- `required` (optional): A boolean indicating whether the input is required. Defaults to `false`.
- `defaultValue` (optional): The default value for the input if it's not provided.
- `trimWhitespace` (optional): A boolean indicating whether to trim whitespace from the input value. Defaults to `true`.
- `validate` (optional): A validation function for the input value. It takes the input value as an argument and returns either `true` if the value is valid or an error message string if it's not.

As well as one of the following mutually exclusive properties:
- `type`: The data type of the input. Can be one of 'string', 'number', 'boolean', or 'string[]'.
- `converter`: An object with `fromInput` and `toInput` methods for converting the input value from a string to a custom type and vice versa.

##### Outputs

Outputs are defined in the `outputs` property of the `ActionOptions` object. Each output is represented by an object with the following properties:

- `description`: A string describing the output.
- `type` (optional): The data type of the output. Can be one of 'string', 'number', 'boolean', or 'string[]'. Defaults to 'string'
- `initValue` (optional): The initial value for the output.
- `converter` (optional): A conversion function for the output value. It takes the output value as an argument and returns the converted value.

##### Example

```typescript
inputs: {
  a: { description: 'description a', required: true, type: 'string' },
  b: { description: 'description b', trimWhitespace: false, type: 'string[]' },
  c: { description: 'description c', defaultValue: true, type: 'boolean' },
  d: {
    description: 'description d',
    defaultValue: 123,
    type: 'number',
    validate: (value?: number) => (!!value && value > 0 ? true : 'Value must be greater than 0'),
  },
  e: { description: 'description e', type: 'number', deprecationMessage: 'e is deprecated' },
  f: {
    description: 'description f',
    required: true,
    converter: {
      fromInput: (value: string) => JSON.parse(value) as Repo,
      toInput: (value: Repo) => JSON.stringify(value),
    },
  },
  g: {
    description: 'description g',
    required: true,
    converter: {
      fromInput: (value: string) => new Date(value),
      toInput: (value: Date) => value.toISOString(),
    },
  },
},
outputs: {
  a: { description: 'description a' },
  b: { description: 'description b', type: 'boolean' },
  c: { description: 'description c', type: 'number' },
  d: { description: 'description d', converter: (value: Repo) => JSON.stringify(value) },
  e: { description: 'description e', type: 'number', initValue: 123 },
},
```

These inputs and outputs are used in the action class to retrieve input values and set output values.

```typescript
async main(): Promise<void> {
  console.log(this.inputs);

  this.outputs.a = this.inputs.a;
  this.outputs.b = this.inputs.c;
  this.outputs.c = this.inputs.d;
  this.outputs.d = this.inputs.f;

  console.log(JSON.stringify(this.outputs));
}
```

## Generating the `action.yml` with `generate-action-yml` tool

`generate-action-ym`l is a utility script provided by the '@actions/action-yml' package.
It helps you automatically generate an `action.yml` file from your action class definition.
This ensures that your action's metadata stays in sync with the actual code, reducing the chance of errors and inconsistencies.

To integrate the generate-action-yml tool into your action project, follow these steps:

1. Add a script to your `package.json` file that calls the `generate-action-yml` tool.
   You'll need to provide the action class name and, optionally, the paths to your `package.json` and main JavaScript file.

   In your `package.json`, add the following line under the scripts section:

   ```json
   "scripts": {
     // ...
     "action-yml": "generate-action-yml ExampleAction"
   }
   ```
   Replace `ExampleAction` with the name of your action class.

   In this example, the `generate-action-yml` tool will automatically locate your `package.json` and main JavaScript file (using the `main` field in your `package.json`).
   If you need to specify custom paths, you can do so using the `--package-json` and `--action-js` options:

   ```json
   "action-yml": "generate-action-yml --package-json <path-to-package-json> --action-js <path-to-action-js> ExampleAction"
    ```
   Replace `<path-to-package-json>` with the path to your `package.json` file and `<path-to-action-js>` with the path to your main JavaScript file relative to the location of the `package.json`.

2. Run the script to generate the `action.yml` file:
   ```bash
   npm run action-yml
   ```
   This command will execute the `generate-action-yml` script and create an `action.yml` file in the directory of your `package.json` file.
   The generated `action.yml` file will contain the metadata from your action class, such as the name, description, inputs, and outputs.

With the `generate-action-yml` tool integrated into your action project, you can easily keep your `action.yml` file up-to-date with your action class definition.
Make sure to run the script every time you make changes to your action class to ensure that the `action.yml` file remains consistent with your code.

## License

This library is published under the [MIT license](LICENSE.md).
