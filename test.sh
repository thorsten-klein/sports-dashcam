#!/bin/bash -e
# Run the playwright tests with coverage

# Clean previous coverage data
rm -rf .nyc_output

# Run tests (Playwright will start the MJPEG server via globalSetup)
npx playwright test --reporter=list "$@" 2>&1

# Clean previous coverage report
rm -rf coverage

# Generate coverage report if tests ran
if [ -d .nyc_output ] && [ "$(ls -A .nyc_output 2>/dev/null)" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Coverage Report"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    nyc_args="--reporter=text --reporter=html --report-dir=coverage"
    if [ -z "$CI" ]; then
        nyc_args="$nyc_args --check-coverage --lines 100 --functions 100 --branches 100 --statements 100"
    fi
    npx nyc report $nyc_args
    echo ""
    echo "HTML coverage report: coverage/index.html"
fi
