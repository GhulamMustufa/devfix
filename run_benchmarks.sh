#!/bin/bash
set -e

echo "Running DEV-01..."
node -r dotenv/config bin/devfix demo DEV-01 > artifacts/dev-01.log 2>&1 || true

echo "Running DEV-02..."
node -r dotenv/config bin/devfix demo DEV-02 > artifacts/dev-02.log 2>&1 || true

echo "Running DEV-03..."
node -r dotenv/config bin/devfix demo DEV-03 > artifacts/dev-03.log 2>&1 || true

echo "Running DEV-04..."
node -r dotenv/config bin/devfix demo DEV-04 > artifacts/dev-04.log 2>&1 || true

echo "Running DEV-05..."
node -r dotenv/config bin/devfix demo DEV-05 > artifacts/dev-05.log 2>&1 || true

echo "Benchmarking complete."
