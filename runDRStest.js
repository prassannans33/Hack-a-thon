import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "tests", "examples.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

for (const user of data) {
  console.log(`🧩 USER ${user.id}: ${user.userText}`);
  console.log(`→ DRS: ${user.result.drs} (${user.result.label})`);
  console.log(`→ ${user.result.explanation}`);
  console.log("------------------------------------------------");
}
