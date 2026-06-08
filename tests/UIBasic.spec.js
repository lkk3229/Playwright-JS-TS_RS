const { test, expect } = require('@playwright/test');

test('@Web First Playwright Test', async ({ browser }) => {
    
    const context = await browser.newContext();
    const page = await context.newPage();
    //abort the network calls for images, css, etc. to speed up the test execution
    //page.route('**/*.{jpg,jpeg,png,css}', route => route.abort());

    const username = page.locator('#username');
    const password = page.locator('#password');
    const signInBtn = page.locator('#signInBtn');
    const cardTitles = page.locator('.card-body a');
    page.on('request', request => console.log(request.url()));
    page.on('response', response => console.log(response.url(), response.status()));
    await page.goto('https://rahulshettyacademy.com/loginpagePractise/');

    console.log(await page.title());

    // css, xpath
    await username.fill('rahulshettyacademy');
    await password.fill('Learning@830$3mK2');
    await signInBtn.click();
    //await page.waitForTimeout(2000); // Wait for 2 seconds to observe the result

    console.log(await page.locator("[style*='blok']").textContent()); 
    await expect(page.locator("[style*='blok']")).toContainText('Incorrect');

    await username.fill("");
    await username.fill('rahulshettyacademy');

    await signInBtn.click();

   // console.log(await cardTitles.first().textContent());
   // console.log(await cardTitles.nth(1).textContent());

    const allCardTitles = await cardTitles.allTextContents();
    console.log(allCardTitles);
});

test('Page Playwright Test', async ({ page }) => {
    await page.goto('https://google.com');

    console.log(await page.title());

    await expect(page).toHaveTitle(/Google/);
});

test('@Web UI Controls', async ({page}) => {
   
    const username = page.locator('#username');
    const password = page.locator('#password');
    const signInBtn = page.locator("#signInBtn");
    const dropdown = page.locator("select.form-control");
    const documentlink = page.locator("[href*='documents-request']");

    await page.goto('https://rahulshettyacademy.com/loginpagePractise/');

    await dropdown.selectOption('consult');
    await page.locator('.radiotextsty').last().click();
    await page.locator('#okayBtn').click();

    // assertion for radio button
    await expect(page.locator('.radiotextsty').last()).toBeChecked();
    console.log(await page.locator('.radiotextsty').last().isChecked());

    await page.locator("#terms").click();
    await expect(page.locator("#terms")).toBeChecked();

    await page.locator("#terms").uncheck();
    await expect(page.locator("#terms")).not.toBeChecked();
    expect(await page.locator('#terms').isChecked()).toBeFalsy();

    await expect(documentlink).toHaveAttribute('class', 'blinkingText');
    //await page.pause();

});

test('Child windows Handle', async ({browser}) => {
   
    const context = await browser.newContext();
    const page = await context.newPage();
    const username = page.locator('#username');
    const documentlink = page.locator("[href*='documents-request']");

    await page.goto('https://rahulshettyacademy.com/loginpagePractise/');
    
    const [newPage] = await Promise.all([
        context.waitForEvent('page'),  // listen for any new page pending, rejected, fulfilled
        documentlink.click()  // new page will open
    ]); // new page opened, now we can perform any action on new page

    const text= await newPage.locator(".red").textContent()
    const arrayText = text.split("@");
    const domain = arrayText[1].split(" ")[0];
    //console.log(text);
    //console.log(domain);

    await username.fill(domain);
    //console.log(await username.textContent());
    console.log(await username.inputValue());

    
});




/* 

CSS Selectors
====================

1. If Id is present 
css -> tagname#id   (or) #id

2. If class is present 
css -> tagname.class   (or) .class

3. Write CSS based on any atribute
css -> [attribute='value']

4. Write CSS with transversing from Parent to Child
css -> ParentTagName >> ChildTagName

5. If needs to write the locator based on text
text=' '

*/