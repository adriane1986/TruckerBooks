const crypto = require("crypto");
const readline = require("readline");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

function askHidden(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
  return new Promise((resolve) => {
    const originalWrite = rl._writeToOutput;
    rl._writeToOutput = function writeMasked(text) {
      if (rl.stdoutMuted && text !== "\n" && text !== "\r\n") {
        rl.output.write("*");
      } else {
        rl.output.write(text);
      }
    };
    rl.stdoutMuted = true;
    rl.question(query, (answer) => {
      rl.stdoutMuted = false;
      rl._writeToOutput = originalWrite;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const password = process.argv.slice(2).join(" ") || await askHidden("Owner password to hash: ");
  if (!password || password.length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }
  console.log(hashPassword(password));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
