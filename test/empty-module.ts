// No-op stub for `server-only` / `client-only` under vitest. Those packages throw unless
// resolved with React's "react-server" export condition, which the test runner doesn't set;
// aliasing them here lets server modules (the agents) be imported in node-based unit tests.
export {};
