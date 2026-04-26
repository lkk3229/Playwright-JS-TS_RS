import{test, expect} from "@playwright/test";

//test.describe.configure({mode:'parallel'});     //for running in parallel
test.describe.configure({mode:'serial'});             // for running in sequence
test('@Web Pop up Validations', async ({page}) => {

    await page.goto("https://rahulshettyacademy.com/AutomationPractice/");

    await page.goto("https://www.google.com/");

    await page.goBack();
    await page.goForward();

    await page.reload();

    await page.goBack();

    await expect(page.locator("#displayed-text")).toBeVisible();
    await page.locator("#hide-textbox").click();
    await expect(page.locator("#displayed-text")).toBeHidden();

    page.on("dialog", dialog => dialog.accept());

    await page.locator("#confirmbtn").click();

    await page.locator("#mousehover").hover();

    const framepage = page.frameLocator("#courses-iframe");
    await framepage.locator("li a[href*='lifetime-access']:visible").click();
    
    await framepage.locator(".text h2").waitFor();
    const text = await framepage.locator(".text h2").textContent();
    console.log(text.split(" ")[1]);

});

test('Screenshot & Visual comparision', async ({page}) => {

    await page.goto("https://rahulshettyacademy.com/AutomationPractice/");

    await expect(page.locator("#displayed-text")).toBeVisible();
    await page.locator("#displayed-text").screenshot({ path: "element.png" });
    await page.locator("#hide-textbox").click();
    await page.screenshot({ path: "screenshot.png"});
    await expect(page.locator("#displayed-text")).toBeHidden();

});

// screenshot --> store --> screenshot

test('Visual comparision', async ({page}) => {

    await page.goto("https://flightaware.com/");
    expect (await page.screenshot()).toMatchSnapshot("landing.png");

});