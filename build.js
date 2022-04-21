const {firefox} = require('playwright-firefox');
const hserver = require('http-server');
const fs = require("fs");
const path = require("path");

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function* walk(dir) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}

(async () => {

    // This script visits all files in the canvas/ directory, generates a mapping file, and screenshots the elements

    // first start server at localhost:8080 in canvas/
    hserver.createServer({root: '.'}).listen(8080);

    const browser = await firefox.launch({headless: true});
    const page = await browser.newPage();

    // visit all files in canvas/
    const mapping = {};
    for await (const p of walk('./canvas/simulations')) {

        // ignore not .html files
        if (!p.endsWith('.html')) {
            continue;
        }

        console.log(p);

        // visit the file
        // http://localhost:8080/canvas/simulations/shm.html
        await page.goto(`http://localhost:8080/${p}`);
        // wait for canvas#root to be loaded
        await page.waitForSelector('canvas#root');
        // wait 2 seconds
        await wait(3000);
        // take a screenshot of the canvas#root element
        await page.locator('canvas#root').screenshot(
            {
                path: `./canvas/screenshots/${p.replace('./canvas/simulations/', '')
                    .replace('.html', '.png')}`
            });

        const name = p.replace('./canvas/simulations/', '');
        mapping[name] = {
            screenshot: 'canvas/screenshots/' + name.replace('.html', '.png'),
        }
    }

    // close
    await browser.close();

    // save mapping.json
    fs.writeFileSync('./canvas/mapping.json', JSON.stringify(mapping, null, 2));

    // end script
    process.exit(0);
})();
