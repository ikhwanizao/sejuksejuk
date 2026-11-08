import assert from "node:assert/strict";
import test from "node:test";
import { completionStep } from "../src/lib/jobCompletion.ts";

test("new work starts at work details", () => {
  assert.equal(completionStep(null, null), 1);
});

test("refresh after work submission resumes photos", () => {
  assert.equal(completionStep({ attachments: [] }, null), 2);
});

test("refresh after uploading photos resumes payment", () => {
  assert.equal(completionStep({ attachments: [{} as never] }, null), 3);
});

test("payment can go back to photos without resubmitting completed work", () => {
  assert.equal(completionStep({ attachments: [{} as never] }, 2), 2);
});

test("deleting the last photo requires photos before payment", () => {
  assert.equal(completionStep({ attachments: [] }, 3), 2);
});
