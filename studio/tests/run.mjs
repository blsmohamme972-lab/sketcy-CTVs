// One process gives a readable per-assertion report in both the managed runtime
// and ordinary Node. node:test still owns isolation of test cases and exit codes.
import "./model.test.mjs";
import "./timeline.test.mjs";
import "./agent.test.mjs";
