const puppeteer = require('puppeteer');
const lineByLine = require('n-readlines');

/**
 * Coinhunt.cc robot voter
 * The bot is written to perform votes automatically on coinhunt
 * Features:
 *  - Check if the corresponding IP is already voted
 *  - Rotate trough a list of proxies
 *  - Runtime statistic
 */

/**
 * STATIC CONFIGURATION
 */

/**
 * Puppeter configurations.
 * If there any issue with the bot, change the headless parameter to true and then you can debug
 */
let launchOptions = { 
    headless: true, 
    ignoreHTTPSErrors: true,
};

/**
 * Token ID for vote. 
 * Token ID can be obtained from coinhunt. Use the browser debug tool to identify the token ID
 */
const tokenCode = ''

/**
 * Proxy list input file
 * The input format must be the following: <ip>:<port>:<username>:<password>
 */
const proxyListPath = './proxies.txt'



/**
 * HELPER FUNCTIONS
 */
const liner = new lineByLine(proxyListPath);

/**
 * 
 * @param {Input string which will 1 line from the proxies.txt} lineStr 
 * @returns proxy object. The following shape must be maintained:
 * {ip: <ip>, port: <port>, username: <username>, password: <password>}
 */
function parseProxy(lineStr) {
    const proxy_parts = lineStr.split(':', 4)
    return {ip: proxy_parts[0], port: proxy_parts[1], username: proxy_parts[2], password: proxy_parts[3]}
}

function getProxies() {
    const proxy_list = []

    while (line = liner.next()) {
        proxy_list.push(parseProxy(line.toString('ascii')))
    }
    return proxy_list
}

const average = (...args) => args.reduce((a, b) => a + b) / args.length

/**
 * CORE FUNCTIONS 
 */

async function vote(proxy) {
    const options = {
        args: [ `--proxy-server=https=${proxy.ip}:${proxy.port}` ],
        ...launchOptions
    }
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    
    await page.authenticate({
        username: proxy.username,
        password: proxy.password,
    });
    
    // TODO Randomize
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(req.resourceType() === 'image' || req.resourceType() === 'font' /* || req.resourceType() === 'stylesheet'*/){
            req.abort();
        }
        else {
            req.continue();
        }
    })

    await page.goto('https://coinhunt.cc/');

    const allTimeBest = '//a[contains(concat(" ",normalize-space(@class)," ")," nav-item ")][1]'
    await page.waitForXPath(allTimeBest);

    // Navigate to the all time best page
    let allTimeBestButton = await page.$x(allTimeBest)
    await allTimeBestButton[0].click() 

    // Sleep 1 sec. If sleep is not initiated it will throw an exception.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for the ShowMore button to be visible
    const showMore = '//div[contains(concat(" ",normalize-space(@class)," ")," Landing_RowShowAll__2CnUX ")]'
    await page.waitForXPath(showMore);

    let showMoreButton = await page.$x(showMore)
    await showMoreButton[0].click() 

    // Wait for the 11th element to load the full list. By default only 10 element shown
    const fullListXpath = '//div[contains(concat(" ",normalize-space(@class)," ")," fade ")][contains(concat(" ",normalize-space(@class)," ")," active ")]//div[contains(concat(" ",normalize-space(@class)," ")," Landing_RowContain__2mn6k ")][11]'
    await page.waitForXPath(fullListXpath);

    // Xpath for the token, if the IP is already voted, the selector won't find it. (This is the expected behaviour)
    const tokenXpath = `//a[contains(@href, "coin/${tokenCode}")]/../..//button[contains(@class, "btn-outline-success")]`
    try {
        let token = await page.$x(tokenXpath)
        await token[0].click() 
        console.log(`IP: ${proxy.ip}:${proxy.port} voted successfully!`)

    } catch (e) {
        console.log(`IP: ${proxy.ip}:${proxy.port} already voted.`)
    }

    await browser.close();
};

const proxy_list = getProxies()

let min_exec_time = 99999999999
let max_exec_time = 0
const exec_times = []

async function run() {
    for (const proxy of proxy_list) {
        const start = new Date()
        await vote(proxy)
        const end = new Date() - start
        //console.info("Execution time: %dms", end)

        exec_times.push(end)
        min_exec_time = Math.min(min_exec_time, end)
        max_exec_time = Math.max(max_exec_time, end)
    }

    console.info(`
******* FINISHED *******
* Runtime statistic:
* Min execution time: ${(min_exec_time/1000).toFixed(2)}s
* Max execution time: ${(max_exec_time/1000).toFixed(2)}s
* Avarage execution time: ${(average(...exec_times)/1000).toFixed(2)}s
`)
}

if (tokenCode === '') {
    console.error('Missing token ID! Edit the index.js file at line 30.')
} else {
    run()
}


