import { test } from "node:test";
import assert from "node:assert/strict";
import { localStorageAdapter } from "../src/adapters/local-storage.js";
import { haUserDataAdapter } from "../src/adapters/ha.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- localStorage adapter --------------------------------------------------
test("localStorage adapter round-trips via injected storage", async () => {
  const mem = {};
  const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => (mem[k] = v) };
  const a = localStorageAdapter("k", storage);
  assert.deepEqual(await a.load(), {});
  await a.save({ accent: "#f00" });
  assert.deepEqual(await a.load(), { accent: "#f00" });
});

test("localStorage adapter tolerates missing storage + bad JSON", async () => {
  const a = localStorageAdapter("k", undefined);
  assert.deepEqual(await a.load(), {});
  await a.save({ x: 1 }); // must not throw
  const bad = localStorageAdapter("k", { getItem: () => "{not json", setItem: () => {} });
  assert.deepEqual(await bad.load(), {});
});

// ---- HA frontend user-data adapter -----------------------------------------
function fakeHass(initial = {}) {
  let store = { ...initial };
  const calls = [];
  return {
    calls,
    get store() { return store; },
    callWS: async (msg) => {
      calls.push(msg);
      if (msg.type === "frontend/get_user_data") return { value: store };
      if (msg.type === "frontend/set_user_data") { store = msg.value; return null; }
    },
  };
}

test("HA adapter uses the frontend user-data WS commands", async () => {
  const hass = fakeHass({ accent: "#3b82f6" });
  const a = haUserDataAdapter(hass, "theme-kit", { saveDebounceMs: 0 });
  assert.deepEqual(await a.load(), { accent: "#3b82f6" });

  await a.save({ accent: "#e11d48" });
  const setCall = hass.calls.find((c) => c.type === "frontend/set_user_data");
  assert.equal(setCall.key, "theme-kit");
  assert.deepEqual(setCall.value, { accent: "#e11d48" });
  assert.deepEqual(await a.load(), { accent: "#e11d48" });
});

test("HA adapter accepts a getter and degrades to no-op when hass is absent", async () => {
  let current = null;
  const a = haUserDataAdapter(() => current, "k", { saveDebounceMs: 0 });
  assert.deepEqual(await a.load(), {}); // no hass yet
  await a.save({ x: 1 }); // must not throw
  current = fakeHass();
  await a.save({ y: 2 });
  assert.deepEqual(await a.load(), { y: 2 }); // persists once hass appears
});

test("HA adapter debounces rapid saves into one write, flush forces it", async () => {
  const hass = fakeHass();
  const a = haUserDataAdapter(hass, "k", { saveDebounceMs: 30 });
  a.save({ n: 1 });
  a.save({ n: 2 });
  a.save({ n: 3 });
  assert.equal(hass.calls.filter((c) => c.type === "frontend/set_user_data").length, 0); // nothing yet
  await wait(50);
  const sets = hass.calls.filter((c) => c.type === "frontend/set_user_data");
  assert.equal(sets.length, 1); // coalesced
  assert.deepEqual(sets[0].value, { n: 3 }); // last value wins
});

test("HA adapter falls back to connection.sendMessagePromise", async () => {
  let store = { a: 1 };
  const hass = {
    connection: {
      sendMessagePromise: async (m) =>
        m.type === "frontend/get_user_data" ? { value: store } : ((store = m.value), null),
    },
  };
  const a = haUserDataAdapter(hass, "k", { saveDebounceMs: 0 });
  assert.deepEqual(await a.load(), { a: 1 });
  await a.save({ a: 2 });
  assert.deepEqual(await a.load(), { a: 2 });
});
