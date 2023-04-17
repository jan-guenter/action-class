/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  resolver: 'ts-jest-resolver',
  roots: ['<rootDir>/packages'],
  testEnvironment: 'node',
  verbose: true,
};
