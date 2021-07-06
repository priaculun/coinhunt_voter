const puppeteer = require("puppeteer");
const tokenCode = "831207137";
const randomUseragent = require("random-useragent");
const tr = require("tor-request");
tr.setTorAddress("localhost", 9050);
tr.TorControlPort.password = "powerteam";

let launchOptions = {
  headless: true,
  ignoreHTTPSErrors: true,
};

(async () => {
  const args = ["--proxy-server=socks5://127.0.0.1:9050"];
  const browser = await puppeteer.launch({ args });
  const page = await browser.newPage();
  await page.goto("https://check.torproject.org/");
  const isUsingTor = await page.$eval("body", (el) =>
    el.innerHTML.includes(
      "Congratulations. This browser is configured to use Tor"
    )
  );

  if (!isUsingTor) {
    console.log("Not using Tor. Closing...");
    return await browser.close();
  }

  console.log("Using Tor. Continuing... ");

  // Now you can go wherever you want
  await page.goto("https://propub3r6espa33w.onion/");

  // You would add additional code to do stuff...

  // Then when you're done, just close
  await browser.close();
})();
