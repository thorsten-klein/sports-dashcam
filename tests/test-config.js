// Test fixture that auto-collects JS coverage from Chromium and writes
// Istanbul-format JSON files into .nyc_output for nyc to merge.
// Firefox / WebKit don't support page.coverage — they fall through silently.
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const v8toIstanbul = require('v8-to-istanbul');

const projectRoot = path.join(__dirname, '..');
const coverageDir = path.join(projectRoot, '.nyc_output');

if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
}

const test = base.extend({
    page: async ({ page, browserName }, use) => {
        const canCollect = browserName === 'chromium';

        if (canCollect) {
            await page.coverage.startJSCoverage({
                resetOnNavigation: false,
                reportAnonymousScripts: true,
            });
        }

        await use(page);

        if (canCollect) {
            try {
                const coverage = await page.coverage.stopJSCoverage();
                await saveCoverage(coverage);
            } catch (_) {
                // Page may already be closed; ignore.
            }
        }
    },
});

async function saveCoverage(coverageData) {
    if (!coverageData || coverageData.length === 0) return;

    const istanbulCoverage = {};

    for (const entry of coverageData) {
        // Only instrument this project's JS files served from the local dev server.
        if (!entry.url.startsWith('http://localhost:8000/js/')) continue;

        const relativePath = entry.url.replace('http://localhost:8000/', '');
        const filePath = path.join(projectRoot, relativePath);

        if (!fs.existsSync(filePath)) continue;

        try {
            const converter = v8toIstanbul(filePath);
            await converter.load();
            converter.applyCoverage(entry.functions);
            Object.assign(istanbulCoverage, converter.toIstanbul());
        } catch (_) {
            // Skip files that can't be processed
        }
    }

    if (Object.keys(istanbulCoverage).length > 0) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const coverageFile = path.join(coverageDir, `coverage-${timestamp}-${random}.json`);
        fs.writeFileSync(coverageFile, JSON.stringify(istanbulCoverage));
    }
}

module.exports = { test, expect };
