import fs from "fs";

// Step 1: Check file exists
const filePath = "./tests/examples.json";
if (!fs.existsSync(filePath)) {
  console.error("❌ Cannot find examples.json in ./tests folder!");
  process.exit(1);
}

// Step 2: Read and parse file
const content = fs.readFileSync(filePath, "utf8");
let examples = [];
try {
  examples = JSON.parse(content);
  console.log("✅ Successfully loaded examples.json");
} catch (err) {
  console.error("❌ Invalid JSON file:", err.message);
  process.exit(1);
}

// Step 3: Find portfolio entry
const portfolio = examples.find(e => e.type === "portfolio_test_result");

if (!portfolio) {
  console.error("⚠️ No portfolio_test_result found in examples.json");
} else {
  console.log("\n✅ Loaded Portfolio Result:\n");
  console.log(JSON.stringify(portfolio.result, null, 2));
}
