import { jest, describe, beforeEach, test, afterEach, expect } from '@jest/globals';
import * as process from 'process';

jest.mock('@actions/core');
const core = jest.mocked(await import('@actions/core'));
const { actionBuilder, runAction } = await import('../src/index.js');

describe('action-builder', () => {
  beforeEach(() => {
    process.env['ACTION_YAML_GENERATOR'] = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('has correct actionInfo', () => {
    class TestAction extends actionBuilder().name('name').description('description').build() {
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
    class TestAction extends actionBuilder()
      .name('name')
      .description('description')
      .author('author')
      .build() {
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

  test('parses inputs correctly', async () => {
    let parsedInputs: unknown = {};

    class TestAction extends actionBuilder()
      .input('a', '')
      .input('b', '', { type: 'string[]', trimWhitespace: false })
      .input('c', '', { type: 'boolean' })
      .input('d', '', { type: 'number' })
      .input('e', '', {
        converter: {
          fromInput: (val: string) => new Date(val),
          toInput: (val: Date) => val.toISOString(),
        },
      })
      .input('defaulted', '', { type: 'string', defaultValue: 'default' })
      .input('complex input-name', '', { type: 'string' })
      .input('deprecated', '', { type: 'string', deprecationMessage: 'deprecation message' })
      .build() {
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
    class TestAction extends actionBuilder()
      .input('deprecated', '', { type: 'string', deprecationMessage: 'deprecation message' })
      .build() {
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

    class TestAction extends actionBuilder()
      .output('a', 'description a')
      .output('b', 'description b', { type: 'boolean' })
      .output('c', 'description c', { type: 'number' })
      .output('d', 'description d', { converter: (value: Date) => value.toISOString() })
      .output('e', 'description e', { initValue: 123 })
      .build() {
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
