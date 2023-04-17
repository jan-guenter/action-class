import { runAction, actionBuilder } from '@action-class/core';

interface Repo {
  owner: string;
  repo: string;
}

export class ExampleActionWithBuilder
  extends actionBuilder()
    .name('name')
    .description('description')
    .author('author')
    .branding('orange', 'sunset')
    .input('a', 'description a', { required: true })
    .input('b', 'description b', { trimWhitespace: false, type: 'string[]' })
    .input('c', 'description c', { defaultValue: true, type: 'boolean' })
    .input('d', 'description d', {
      defaultValue: 123,
      type: 'number',
      validate: (value?: number) => (!!value && value > 0 ? true : 'Value must be greater than 0'),
    })
    .input('e', 'description e', { type: 'number', deprecationMessage: 'e is deprecated' })
    .input('f', 'description f', {
      required: true,
      converter: {
        fromInput: (value: string) => JSON.parse(value) as Repo,
        toInput: (value: Repo) => JSON.stringify(value),
      },
    })
    .input('g', 'description g', {
      required: true,
      converter: {
        fromInput: (value: string) => new Date(value),
        toInput: (value: Date) => value.toISOString(),
      },
    })
    .input('h', 'description h', { defaultValue: 'foo' })
    .input('i', 'description i')
    .output('a', 'description a')
    .output('b', 'description b', { type: 'boolean' })
    .output('c', 'description c', { type: 'number' })
    .output('d', 'description d', { converter: (value: Repo) => JSON.stringify(value) })
    .output('e', 'description e', { initValue: 123 })
    .build()
{
  private test: string;

  constructor(test: string) {
    super();
    this.test = test;
  }

  async pre(): Promise<void> {
    console.log('post job');
  }

  async main(): Promise<void> {
    console.log(this.inputs);

    this.outputs.a = this.inputs.a;
    this.outputs.b = this.inputs.c;
    this.outputs.c = this.inputs.d;
    this.outputs.d = this.inputs.f;

    console.log(JSON.stringify(this.outputs));
  }

  async post(): Promise<void> {
    console.log('post job');
  }
}

// noinspection JSIgnoredPromiseFromCall
runAction(ExampleActionWithBuilder, 'test');
