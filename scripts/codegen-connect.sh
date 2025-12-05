#!/bin/bash

# Script to run codegen on all test fixtures for manual inspection

set -e

CLI="node ./dist/cli.mjs"

echo "Running codegen on all fixtures..."
echo ""

# Simple fixture
echo "📦 Generating simple fixture..."
rm -rf ./tests/fixtures/simple/output
$CLI --proto_dir=./tests/fixtures/simple --out=./tests/fixtures/simple/output --connect_only
echo "✅ Simple fixture complete"
echo ""

# Nested imports fixture
echo "📦 Generating nested-imports fixture..."
rm -rf ./tests/fixtures/nested-imports/output
$CLI --proto_dir=./tests/fixtures/nested-imports --out=./tests/fixtures/nested-imports/output --connect_only
echo "✅ Nested imports fixture complete"
echo ""

# Third-party Google fixture
echo "📦 Generating third-party-google fixture..."
rm -rf ./tests/fixtures/third-party-google/output
$CLI --proto_dir=./tests/fixtures/third-party-google --out=./tests/fixtures/third-party-google/output --connect_only
echo "✅ Third-party Google fixture complete"
echo ""

# Third-party Google API fixture
echo "📦 Generating third-party-google-api fixture..."
rm -rf ./tests/fixtures/third-party-google-api/output
$CLI --proto_dir=./tests/fixtures/third-party-google-api --out=./tests/fixtures/third-party-google-api/output --connect_only
echo "✅ Third-party Google API fixture complete"
echo ""

# Third-party buf.validate fixture
echo "📦 Generating third-party-buf-validate fixture..."
rm -rf ./tests/fixtures/third-party-buf-validate/output
$CLI --proto_dir=./tests/fixtures/third-party-buf-validate --out=./tests/fixtures/third-party-buf-validate/output --connect_only
echo "✅ Third-party buf.validate fixture complete"
echo ""

# Third-party OpenAPI fixture
echo "📦 Generating third-party-openapi fixture..."
rm -rf ./tests/fixtures/third-party-openapi/output
$CLI --proto_dir=./tests/fixtures/third-party-openapi --out=./tests/fixtures/third-party-openapi/output --connect_only
echo "✅ Third-party OpenAPI fixture complete"
echo ""

# Third-party descriptor fixture
echo "📦 Generating third-party-descriptor fixture..."
rm -rf ./tests/fixtures/third-party-descriptor/output
$CLI --proto_dir=./tests/fixtures/third-party-descriptor --out=./tests/fixtures/third-party-descriptor/output --connect_only
echo "✅ Third-party descriptor fixture complete"
echo ""

# Third-party all-combined fixture
echo "📦 Generating third-party-all-combined fixture..."
rm -rf ./tests/fixtures/third-party-all-combined/output
$CLI --proto_dir=./tests/fixtures/third-party-all-combined --out=./tests/fixtures/third-party-all-combined/output --connect_only
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
