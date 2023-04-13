import { action, runAction } from '../src/action';
import * as core from '@actions/core';
import * as process from 'process';

describe('@action-class/core', () => {
  beforeAll(() => {});

  beforeEach(() => {
    process.env['ACTION_YAML_GENERATOR'] = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('has correct actionInfo', () => {
    class TestAction extends action({ name: 'name', description: 'description' }) {
      async main(): Promise<void> {}
    }

    expect(TestAction.actionInfo).toStrictEqual({
      name: 'name',
      description: 'description',
    });
  });

  it('has correct actionInfo with author', () => {
    class TestAction extends action({ name: 'name', description: 'description', author: 'author' }) {
      async main(): Promise<void> {}
    }

    expect(TestAction.actionInfo).toStrictEqual({
      name: 'name',
      description: 'description',
      author: 'author',
    });
  });

  it('fails on exceptions in main()', async () => {
    const ex = new Error('error message');

    class TestAction extends action({}) {
      async main(): Promise<void> {
        throw ex;
      }
    }

    const setFailed = jest.spyOn(core, 'setFailed');

    await runAction(TestAction);

    expect(setFailed).toHaveBeenCalledWith(ex);
  });

  it('fails on exceptions in constructor', async () => {
    const ex = new Error('error message');

    class TestAction extends action({}) {
      constructor() {
        super();
        throw ex;
      }
      async main(): Promise<void> {}
    }

    const setFailed = jest.spyOn(core, 'setFailed');

    await runAction(TestAction);

    expect(setFailed).toHaveBeenCalledWith(ex);
  });

  it('parses inputs correctly', async () => {
    let parsedInputs: unknown;

    class TestAction extends action({
      inputs: {
        'a': { description: '', type: 'string' },
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

    const getInput = jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
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
    const getMultilineInput = jest.spyOn(core, 'getMultilineInput').mockReturnValueOnce(['foo', 'bar ', ' baz']);
    const getBooleanInput = jest.spyOn(core, 'getBooleanInput').mockReturnValueOnce(true);

    const setFailed = jest.spyOn(core, 'setFailed');
    const error = jest.spyOn(core, 'error');
    const warning = jest.spyOn(core, 'warning');

    await runAction(TestAction);

    expect(getInput).toHaveBeenCalledTimes(6);
    expect(getInput).toHaveBeenCalledWith('a', {});
    expect(getInput).toHaveBeenCalledWith('d', {});
    expect(getInput).toHaveBeenCalledWith('e', {});
    expect(getInput).toHaveBeenCalledWith('defaulted', {});
    expect(getInput).toHaveBeenCalledWith('complex input-name', {});
    expect(getInput).toHaveBeenCalledWith('deprecated', {});
    expect(getMultilineInput).toHaveBeenCalledWith('b', { trimWhitespace: false });
    expect(getBooleanInput).toHaveBeenCalledWith('c', {});

    expect(parsedInputs).toStrictEqual({
      'a': 'foo',
      'b': ['foo', 'bar ', ' baz'],
      'c': true,
      'd': 123,
      'e': new Date('1984-02-22T13:59:00.000Z'),
      'defaulted': 'default',
      'complex input-name': 'bar',
    });

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
  });

  it('warns on use of deprecated input', async () => {
    class TestAction extends action({
      inputs: {
        deprecated: { description: '', type: 'string', deprecationMessage: 'deprecation message' },
      },
    }) {
      async main(): Promise<void> {}
    }

    const getInput = jest.spyOn(core, 'getInput').mockReturnValue('foo');

    const setFailed = jest.spyOn(core, 'setFailed');
    const error = jest.spyOn(core, 'error');
    const warning = jest.spyOn(core, 'warning');

    await runAction(TestAction);

    expect(getInput).toHaveBeenCalledWith('deprecated', {});
    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledWith("Input 'deprecated' is deprecated: deprecation message");
  });

  it('handles outputs correctly', async () => {
    let finalOutputs: unknown;

    class TestAction extends action({
      outputs: {
        a: { description: 'description a' },
        b: { description: 'description b', type: 'boolean' },
        c: { description: 'description c', type: 'number' },
        d: { description: 'description d', converter: (value: Date) => value.toISOString() },
        e: { description: 'description e', type: 'number', initValue: 123 },
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

    const setOutput = jest.spyOn(core, 'setOutput');

    const setFailed = jest.spyOn(core, 'setFailed');
    const error = jest.spyOn(core, 'error');
    const warning = jest.spyOn(core, 'warning');

    await runAction(TestAction);

    expect(setOutput).toHaveBeenCalledTimes(6);
    expect(setOutput).toHaveBeenCalledWith('e', '123');
    expect(setOutput).toHaveBeenCalledWith('a', 'foo');
    expect(setOutput).toHaveBeenCalledWith('b', 'true');
    expect(setOutput).toHaveBeenCalledWith('c', '123');
    expect(setOutput).toHaveBeenCalledWith('d', '1984-02-22T13:59:00.000Z');
    expect(setOutput).toHaveBeenCalledWith('e', '456');

    expect(finalOutputs).toStrictEqual({
      a: 'foo',
      b: true,
      c: 123,
      d: new Date('1984-02-22T13:59:00.000Z'),
      e: 456,
    });

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
  });
});
