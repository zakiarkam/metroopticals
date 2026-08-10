// # Docker Health Check Script
// # This script checks if the Next.js application is healthy

const http = require("http");

const options = {
  host: "localhost",
  port: 3000,
  path: "/api/health",
  timeout: 2000,
  method: "GET",
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on("error", (err) => {
  console.error("ERROR:", err);
  process.exit(1);
});

request.on("timeout", () => {
  console.error("TIMEOUT");
  request.destroy();
  process.exit(1);
});

request.end();
