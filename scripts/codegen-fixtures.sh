#!/bin/bash

# Script to run codegen on all test fixtures for manual inspection

set -e

CLI="node ./dist/cli.mjs"

echo "Running codegen on all fixtures..."
echo ""

# Simple fixture
echo "📦 Generating simple fixture..."
$CLI --proto_dir=./tests/fixtures/simple --out=./tests/fixtures/simple/output
echo "✅ Simple fixture complete"
echo ""

# Nested imports fixture
echo "📦 Generating nested-imports fixture..."
$CLI --proto_dir=./tests/fixtures/nested-imports --out=./tests/fixtures/nested-imports/output
echo "✅ Nested imports fixture complete"
echo ""

# Third-party Google fixture
echo "📦 Generating third-party-google fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-google --out=./tests/fixtures/third-party-google/output
echo "✅ Third-party Google fixture complete"
echo ""

# Third-party Google API fixture
echo "📦 Generating third-party-google-api fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-google-api --out=./tests/fixtures/third-party-google-api/output
echo "✅ Third-party Google API fixture complete"
echo ""

# Third-party buf.validate fixture
echo "📦 Generating third-party-buf-validate fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-buf-validate --out=./tests/fixtures/third-party-buf-validate/output
echo "✅ Third-party buf.validate fixture complete"
echo ""

# Third-party OpenAPI fixture
echo "📦 Generating third-party-openapi fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-openapi --out=./tests/fixtures/third-party-openapi/output
echo "✅ Third-party OpenAPI fixture complete"
echo ""

# Third-party descriptor fixture
echo "📦 Generating third-party-descriptor fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-descriptor --out=./tests/fixtures/third-party-descriptor/output
echo "✅ Third-party descriptor fixture complete"
echo ""

# Third-party all-combined fixture
echo "📦 Generating third-party-all-combined fixture..."
$CLI --proto_dir=./tests/fixtures/third-party-all-combined --out=./tests/fixtures/third-party-all-combined/output
echo "✅ Third-party all-combined fixture complete"
echo ""

echo "🎉 All fixtures generated successfully!"
echo ""
echo "Output directories:"
echo "  - tests/fixtures/simple/output/"
echo "  - tests/fixtures/nested-imports/output/"
echo "  - tests/fixtures/third-party-google/output/"
echo "  - tests/fixtures/third-party-google-api/output/"
echo "  - tests/fixtures/third-party-buf-validate/output/"
echo "  - tests/fixtures/third-party-openapi/output/"
echo "  - tests/fixtures/third-party-descriptor/output/"
echo "  - tests/fixtures/third-party-all-combined/output/"
