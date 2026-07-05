import React from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '../renderer/contexts/AppContext';

beforeEach(() => {
  window.electronAPI = {
    db: { all: jest.fn(), get: jest.fn(), run: jest.fn() },
    config: { get: jest.fn(), set: jest.fn() },
    printer: { list: jest.fn(), print: jest.fn(), printSilent: jest.fn() },
    ai: { chat: jest.fn() },
    app: { close: jest.fn() },
  };
});

describe('AppContext', () => {
  test('provides dbQuery and dbRun functions', () => {
    let contextValue;
    function TestComponent() {
      const ctx = React.useContext(require('../renderer/contexts/AppContext').AppContext);
      contextValue = ctx;
      return null;
    }
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );
    expect(contextValue.dbQuery).toBeDefined();
    expect(contextValue.dbRun).toBeDefined();
  });
});
