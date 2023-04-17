import { jest, describe, beforeEach, test, afterEach, expect } from '@jest/globals';
import * as process from 'process';

jest.mock('@actions/core');
const core = jest.mocked(await import('@actions/core'));
const { action, runAction } = await import('../src/index.js');

describe('action-class', () => {
  beforeEach(() => {
    process.env['ACTION_YAML_GENERATOR'] = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('has correct actionInfo', () => {
    class TestAction extends action({ name: 'name', description: 'description' }) {
      async main(): Promise<void> {
        return;
      }
    }

    expect(TestAction.actionInfo).toStrictEqual({
      name: 'name',
      description: 'description',
    });
  });

  test('has correct actionInfo with author', () => {
    class TestAction extends action({ name: 'name', description: 'description', author: 'author' }) {
      async main(): Promise<void> {
        return;
      }
    }

    expect(TestAction.actionInfo).toStrictEqual({
      name: 'name',
      description: 'description',
      author: 'author',
    });
  });

  test('fails on exceptions in main()', async () => {
    const ex = new Error('error message');

    class TestAction extends action({}) {
      async main(): Promise<void> {
        throw ex;
      }
    }

    await runAction(TestAction);

    expect(core.setFailed).toHaveBeenCalledWith(ex);
  });

  test('fails on exceptions in constructor', async () => {
    const ex = new Error('error message');

    class TestAction extends action({}) {
      constructor() {
        super();
        throw ex;
      }
      async main(): Promise<void> {
        return;
      }
    }

    await runAction(TestAction);

    expect(core.setFailed).toHaveBeenCalledWith(ex);
  });

  test('parses inputs correctly', async () => {
    let parsedInputs: unknown = {};

    class TestAction extends action({
      inputs: {
        'a': { description: '' },
        'b': { description: '', type: 'string[]', trimWhitespace: false },
        'c': { description: '', type: 'boolean' },
        'd': { description: '', type: 'number' },
        'e': {
          description: '',
          converter: {
            fromInput: (val: string) => new Date(val),
            toInput: (val: Date) => val.toISOString(),
          },
        },
        'defaulted': { description: '', type: 'string', defaultValue: 'default' },
        'complex input-name': { description: '', type: 'string' },
        'deprecated': { description: '', type: 'string', deprecationMessage: 'deprecation message' },
      },
    }) {
      async main(): Promise<void> {
        parsedInputs = this.inputs;
      }
    }

    core.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'a':
          return 'foo';
        case 'd':
          return '123';
        case 'e':
          return '1984-02-22T13:59:00.000Z';
        case 'complex input-name':
          return 'bar';
        default:
          return '';
      }
    });
    core.getMultilineInput.mockReturnValue(['foo', 'bar ', ' baz']);
    core.getBooleanInput.mockReturnValueOnce(true);

    await runAction(TestAction);

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.getInput).toHaveBeenCalledWith('a', {});
    expect(core.getInput).toHaveBeenCalledWith('d', {});
    expect(core.getInput).toHaveBeenCalledWith('e', {});
    expect(core.getInput).toHaveBeenCalledWith('defaulted', {});
    expect(core.getInput).toHaveBeenCalledWith('complex input-name', {});
    expect(core.getInput).toHaveBeenCalledWith('deprecated', {});
    expect(core.getMultilineInput).toHaveBeenCalledWith('b', { trimWhitespace: false });
    expect(core.getBooleanInput).toHaveBeenCalledWith('c', {});

    expect(parsedInputs).toStrictEqual({
      'a': 'foo',
      'b': ['foo', 'bar ', ' baz'],
      'c': true,
      'd': 123,
      'e': new Date('1984-02-22T13:59:00.000Z'),
      'defaulted': 'default',
      'complex input-name': 'bar',
    });

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
  });

  test('warns on use of deprecated input', async () => {
    class TestAction extends action({
      inputs: {
        deprecated: { description: '', type: 'string', deprecationMessage: 'deprecation message' },
      },
    }) {
      async main(): Promise<void> {
        return;
      }
    }

    core.getInput.mockReturnValue('foo');

    await runAction(TestAction);

    expect(core.getInput).toHaveBeenCalledWith('deprecated', {});
    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledWith("Input 'deprecated' is deprecated: deprecation message");
  });

  test('handles outputs correctly', async () => {
    let finalOutputs: unknown = {};

    class TestAction extends action({
      outputs: {
        a: { description: 'description a' },
        b: { description: 'description b', type: 'boolean' },
        c: { description: 'description c', type: 'number' },
        d: { description: 'description d', converter: (value: Date) => value.toISOString() },
        e: { description: 'description e', initValue: 123 },
      },
    }) {
      async main(): Promise<void> {
        this.outputs.a = 'foo';
        this.outputs.b = true;
        this.outputs.c = 123;
        this.outputs.d = new Date('1984-02-22T13:59:00.000Z');
        this.outputs.e = 456;
        finalOutputs = {
          ...this.outputs,
        };
      }
    }

    await runAction(TestAction);

    expect(core.setOutput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith('e', '123');
    expect(core.setOutput).toHaveBeenCalledWith('a', 'foo');
    expect(core.setOutput).toHaveBeenCalledWith('b', 'true');
    expect(core.setOutput).toHaveBeenCalledWith('c', '123');
    expect(core.setOutput).toHaveBeenCalledWith('d', '1984-02-22T13:59:00.000Z');
    expect(core.setOutput).toHaveBeenCalledWith('e', '456');

    expect(finalOutputs).toStrictEqual({
      a: 'foo',
      b: true,
      c: 123,
      d: new Date('1984-02-22T13:59:00.000Z'),
      e: 456,
    });

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
  });
});
