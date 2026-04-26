const playwright = require('@playwright/test');
const { POManager } = require('../../pageObjects/POManager');
const { Before, After, BeforeStep,AfterStep, Status } = require('@cucumber/cucumber')

Before(async function () {
    const browser = await playwright.chromium.launch({ headless: false});
    const context = await browser.newContext();
    this.page = await context.newPage();
    this.poManager = new POManager(this.page);
});

BeforeStep(async function () {
    console.log("I am executing before each step");
});

AfterStep(async function ({result}) {
    if(result.status === Status.FAILED)
    {
        await this.page.screenshot({path: 'BDDscreenshot.png', fullPage: true});
    }
});


After(async function () {
    console.log("I am last to execute");
});