import assert from "node:assert/strict";
import { test } from "node:test";
import { agentGuide, aspects, intentError, migrationPrompt, suggestGuide } from "../src/index.ts";

test("every aspect says why it exists, and every value and modifier when it fits", () => {
  for (const aspect of aspects) {
    assert.ok(aspect.why.trim().length > 20, `${aspect.key} needs a why`);
    for (const option of [...aspect.values, ...aspect.modifiers]) {
      assert.ok(option.when.trim().length > 10, `${aspect.key}=${option.value} needs a when`);
    }
  }
});

test("the agent guide, the suggestion guide and the migration prompt carry the same reasons", () => {
  const guide = agentGuide();
  for (const aspect of aspects) {
    assert.ok(guide.includes(aspect.why), aspect.key);
    for (const option of aspect.values) assert.ok(guide.includes(option.when), `${aspect.key}=${option.value}`);
  }
  assert.ok(suggestGuide().includes(guide));
  assert.match(suggestGuide(), /^## The idea/);
  assert.ok(migrationPrompt().includes(guide.trimEnd()));
  assert.match(migrationPrompt(), /## The idea/);
});

test("intents are checked the way the attributes take them", () => {
  assert.equal(intentError("surface", "raised"), null);
  assert.equal(intentError("surface", null), null);
  assert.equal(intentError("response", "hover click"), null);
  assert.equal(intentError("color", "red tint"), null);
  assert.equal(intentError("text", "label muted"), null);
  assert.match(String(intentError("surface", "raised flat")), /modifiers/);
  assert.match(String(intentError("text", "label muted faint")), /exclude one another/);
  assert.match(String(intentError("response", "hover press")), /not press/);
  assert.match(String(intentError("shape", "round")), /Unknown aspect "shape"/);
});

test("accepted suggestions appear in the migration prompt, by page", () => {
  const prompt = migrationPrompt({
    elements: [{ page: "/demo/", element: 'button "Deploy"', source: "src/ColorLab.tsx:49:7", instruction: 'Set data-surface="raised" on this element.' }],
  });
  assert.match(prompt, /### Elements already decided/);
  assert.match(prompt, /#### \/demo\/\n\n- \*\*button "Deploy"\*\* \(src\/ColorLab\.tsx:49:7\)/);
});
