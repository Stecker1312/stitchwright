import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { createI18n, DEFAULT_LANGUAGE, HTML_LANGUAGE } from "../src/core/i18n.js";

const de = JSON.parse(fs.readFileSync(new URL("../src/locales/de.json", import.meta.url)));
const en = JSON.parse(fs.readFileSync(new URL("../src/locales/en.json", import.meta.url)));

test("English is the default presentation language", () => {
  assert.equal(DEFAULT_LANGUAGE, "en");
  assert.equal(HTML_LANGUAGE.en, "en-GB");
  assert.equal(HTML_LANGUAGE.de, "de");
});

test("German and English have the same keys", () => {
  const deKeys = Object.keys(de).filter((key) => key !== "_meta").sort();
  const enKeys = Object.keys(en).filter((key) => key !== "_meta").sort();
  assert.deepEqual(enKeys, deKeys);
});

test("translation falls back to English and then to the key", () => {
  const i18n = createI18n({
    lang: "de",
    messages: { de: { "only.de": "Nur Deutsch" }, en: { "only.en": "English only" } }
  });
  assert.equal(i18n.t("only.de"), "Nur Deutsch");
  assert.equal(i18n.t("only.en"), "English only");
  assert.equal(i18n.t("missing.key"), "missing.key");
});

test("interpolation replaces named variables", () => {
  const i18n = createI18n({
    lang: "de",
    messages: { de: { greetings: "Hallo {name}, {count} Maschen" }, en: {} }
  });
  assert.equal(i18n.t("greetings", { name: "Daniel", count: 12 }), "Hallo Daniel, 12 Maschen");
});

test("switching language updates the translator", async () => {
  const i18n = createI18n({
    lang: "de",
    messages: { de: { hello: "Hallo" }, en: { hello: "Hello" } }
  });
  assert.equal(i18n.t("hello"), "Hallo");
  await i18n.setLanguage("en");
  assert.equal(i18n.t("hello"), "Hello");
  assert.equal(i18n.language, "en");
});

test("locale files declare a status", () => {
  assert.equal(de._meta.status, "reviewed");
  assert.equal(en._meta.status, "reviewed");
});
