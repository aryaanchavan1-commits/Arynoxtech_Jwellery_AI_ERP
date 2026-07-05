module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFiles: ['<rootDir>/__mocks__/setupTests.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
