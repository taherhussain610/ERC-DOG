// Blanks unfilled .env placeholders so services fall back to built-in defaults.
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
const PLACEHOLDER = /YOUR_|your-|example\.com|<.*>/;

const lines = fs.readFileSync(envPath, "utf8").split("\n");
const blanked = [];

const output = lines.map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match === null) {
    return line;
  }

  const key = match[1];
  const value = match[2];
  if (value !== "" && PLACEHOLDER.test(value)) {
    blanked.push(key);
    return key + "=";
  }
  return line;
});

fs.writeFileSync(envPath, output.join("\n"));
console.log("Blanked " + blanked.length + " placeholder values:");
console.log(blanked.join(", "));
