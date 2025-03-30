/** @type {import('ts-jest').JestConfigWithTsJest} **/

module.exports = {
  testEnvironment: "node",
  verbose: true,
  detectOpenHandles: true,
  setupFiles: [
    'dotenv/config',
  ],
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  }
};