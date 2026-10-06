import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {allScenarios} from "../examples/business.js";

// The same input/output fixture also runs from an independently installed archive.
const expected=JSON.parse(readFileSync(new URL("../../examples/expected.json",import.meta.url),"utf8"));
test("seven business scenarios execute through public package imports",()=>{
  assert.deepEqual(allScenarios(),expected);
});
