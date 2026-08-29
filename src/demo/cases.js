export const DEMO_CASES = {
  "DEV-01": {
    name: "DEV-01 — Missing OS Dependency",
    setup: [
      `echo "FROM node:20-alpine\\nRUN make" > Dockerfile`
    ],
    initialFailure: "docker build -t dev-01 . failed: make: not found",
    verifierConfig: {
      type: 'process',
      command: 'docker build -t dev-01 .',
      expectedExitCode: 0,
      timeoutMs: 15000
    }
  },
  "DEV-02": {
    name: "DEV-02 — Missing Configuration",
    setup: [
      `echo "DATABASE_URL=postgres://localhost:5432\\n" > .env.example`,
      `echo "const db = process.env.DATABASE_URL; if (!db) { console.error('Missing DATABASE_URL'); process.exit(1); } console.log('App started');" > index.js`
    ],
    initialFailure: "node index.js failed: Missing DATABASE_URL",
    verifierConfig: {
      type: 'process',
      command: 'node index.js',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  },
  "DEV-03": {
    name: "DEV-03 — Service Port Conflict",
    setup: [
      `echo "const http = require('http'); http.createServer().listen(8080);" > bg.js`,
      `node bg.js &`,
      `sleep 1`,
      `echo "const http = require('http'); const port = process.env.PORT || 8080; http.createServer((req,res)=>{res.end('ok');}).listen(port).on('error', (e) => { console.error('EADDRINUSE :::'+port); process.exit(1); }); console.log('App started on ' + port);" > index.js`
    ],
    initialFailure: "node index.js failed: EADDRINUSE :::8080",
    verifierConfig: {
      type: 'http',
      command: 'node index.js',
      url: 'http://localhost:8080',
      expectedStatus: 200,
      timeoutMs: 5000
    }
  },
  "DEV-04": {
    name: "DEV-04 — Hidden CRLF Entrypoint",
    setup: [
      `printf "#!/bin/sh\\r\\necho hello\\r\\n" > entrypoint.sh`,
      `chmod +x entrypoint.sh`
    ],
    initialFailure: "./entrypoint.sh failed: /bin/sh^M: bad interpreter",
    verifierConfig: {
      type: 'process',
      command: './entrypoint.sh',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  },
  "DEV-05": {
    name: "DEV-05 — Multi-Step Cascading Failure",
    setup: [
      `echo "{\\"scripts\\":{\\"start\\":\\"tsc && node dist/server.js\\"}}" > package.json`,
      `echo "let port: string = 3000; console.log(port);" > index.ts`,
      `echo "{\\"compilerOptions\\":{\\"outDir\\":\\"./dist\\", \\"strict\\": true}}" > tsconfig.json`
    ],
    initialFailure: "npm start failed: sh: tsc: not found",
    verifierConfig: {
      type: 'process',
      command: 'npm start',
      expectedExitCode: 0,
      timeoutMs: 15000
    }
  }
};
