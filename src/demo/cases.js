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
  },
  "DEV-06": {
    name: "DEV-06 — Dependency / Package Configuration Failure",
    setup: [
      `echo '{"name": "app", "version": "1.0.0", "dependencies": {"express": "^4.18.0"}}' > package.json`,
      `echo "const express = require('express'); const cors = require('cors'); const app = express(); app.use(cors()); app.listen(3000);" > index.js`,
      `npm install`
    ],
    initialFailure: "node index.js failed: Error: Cannot find module 'cors'",
    verifierConfig: {
      type: 'process',
      command: 'node index.js',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  },
  "DEV-07": {
    name: "DEV-07 — Environment / Runtime Configuration Failure",
    setup: [
      `echo '{"name": "app", "dependencies": {"dotenv": "^16.0.0"}}' > package.json`,
      `echo "require('dotenv').config(); if (!process.env.API_KEY) { console.error('Error: API_KEY is missing'); process.exit(1); } console.log('Started');" > index.js`,
      `echo "API_KEY=test_key_123" > .env.test`,
      `npm install`
    ],
    initialFailure: "node index.js failed: Error: API_KEY is missing",
    verifierConfig: {
      type: 'process',
      command: 'node index.js',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  },
  "DEV-08": {
    name: "DEV-08 — File / Module Integration Failure",
    setup: [
      `mkdir utils`,
      `echo "module.exports = { Add: (a, b) => a + b };" > utils/math.js`,
      `echo "const { add } = require('./utils/math'); if (typeof add !== 'function') { throw new TypeError('add is not a function'); } console.log(add(1, 2));" > index.js`
    ],
    initialFailure: "node index.js failed: TypeError: add is not a function",
    verifierConfig: {
      type: 'process',
      command: 'node index.js',
      expectedExitCode: 0,
      timeoutMs: 5000
    }
  },
  "DEV-09": {
    name: "DEV-09 — Build / Configuration Failure",
    setup: [
      `echo '{"name": "app", "scripts": {"build": "webpack"}}' > package.json`,
      `npm install webpack webpack-cli --save-dev`,
      `echo "module.exports = { entry: './src/app.js', mode: 'development' };" > webpack.config.js`,
      `mkdir src`,
      `echo "console.log('hello');" > src/index.js`
    ],
    initialFailure: "npm run build failed: Module not found: Error: Can't resolve './src/app.js'",
    verifierConfig: {
      type: 'process',
      command: 'npm run build',
      expectedExitCode: 0,
      timeoutMs: 15000
    }
  },
  "DEV-10": {
    name: "DEV-10 — Multi-Step Cascading Failure",
    setup: [
      `echo '{"name": "app", "scripts": {"start": "node server.js"}}' > package.json`,
      `echo "const express = require('express'); const fs = require('fs'); const app = express(); app.get('/', (req, res) => { res.send('ok'); } const config = JSON.parse(fs.readFileSync('config.json', 'utf8')); app.listen(config.port);" > server.js`
    ],
    initialFailure: "npm start failed: SyntaxError: Unexpected token 'const'",
    verifierConfig: {
      type: 'process',
      command: 'npm start',
      expectedExitCode: 0,
      timeoutMs: 15000
    }
  }
};
