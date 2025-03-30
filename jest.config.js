/** @type {import('ts-jest').JestConfigWithTsJest} **/

module.exports = {
  testEnvironment: "node",
  verbose: true,
  detectOpenHandles: true,
  transform: {
    "^.+\.tsx?$": ["ts-jest",{}],
  }
};