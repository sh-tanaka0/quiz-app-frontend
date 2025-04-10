/// <reference types="vitest" />
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare global {
  namespace Vi {
    interface JestAssertion<T = unknown>
      extends jest.Matchers<void, T>,
        TestingLibraryMatchers<T, void> {}
  }
}
