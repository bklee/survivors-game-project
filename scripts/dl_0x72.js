const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    console.log('Navigating to itch.io...');
    await page.goto('https://0x72.itch.io/dungeontileset-ii');

    // Click download button
    console.log('Clicking "Download Now"...');
    await page.click('a.button.download_btn');

    // Wait for the dialog to open, click "No thanks"
    console.log('Clicking "No thanks"...');
    await page.click('a.direct_download_btn');

    // On the download page, find the zip button for v1.7
    console.log('Finding zip download button...');
    await page.waitForSelector('.download_list');

    const [download] = await Promise.all([
        page.waitForEvent('download'), // Wait for the download to start
        page.locator('text=0x72_DungeonTilesetII_v1.7.zip').locator('..').locator('.button').click()
    ]);

    const downloadPath = path.join(__dirname, '..', 'public/assets/0x72_dungeon.zip');
    await download.saveAs(downloadPath);
    console.log('Downloaded to ' + downloadPath);

    await browser.close();
})();
