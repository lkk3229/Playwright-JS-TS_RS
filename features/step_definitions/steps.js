const { When, Then, Given } = require('@cucumber/cucumber')
const { expect } = require('@playwright/test');
const playwright = require('@playwright/test');
const { POManager } = require('../../pageObjects/POManager');

Given('a user login to Ecommerce application with {string} and {string}', { timeout: 100 * 1000 }, async function (username, password) {
    // Write code here that turns the phrase above into concrete actions


    const products = this.page.locator(".card-body");

    const loginPage = this.poManager.getLoginPage();
    await loginPage.goTo();
    await loginPage.validLogin(username, password);

});

When('Add {string} to Cart', { timeout: 100 * 1000 }, async function (productName) {
    // Write code here that turns the phrase above into concrete actions
    this.dashboardPage = this.poManager.getDashboardPage();
    await this.dashboardPage.searchProductAddCart(productName);
    await this.dashboardPage.navigateToCart();
});

Then('verify {string} is displayed in the cart', { timeout: 100 * 1000 }, async function (productName) {
    // Write code here that turns the phrase above into concrete actions
    const cartPage = this.poManager.getCartPage();
    await cartPage.verifyProductIsdisplayed(productName);
    await cartPage.Checkout();
});

When('Enter valid details and Place the Order', { timeout: 100 * 1000 }, async function () {
    // Write code here that turns the phrase above into concrete actions
    const ordersReviewPage = this.poManager.getOrdersReviewPage();
    await ordersReviewPage.searchCountryAndSelect("ind", "India");
    this.orderId = await ordersReviewPage.SubmitAndGetOrderId();
    console.log(this.orderId);
});


Then('Verify order is present in the OrderHistory', { timeout: 100 * 1000 }, async function () {
    // Write code here that turns the phrase above into concrete actions
    await this.dashboardPage.navigateToOrders();
    const ordersHistoryPage = this.poManager.getOrdersHistoryPage();
    await ordersHistoryPage.searchOrderAndSelect(this.orderId);
    expect(this.orderId.includes(await ordersHistoryPage.getOrderId())).toBeTruthy();
});

Given('a user login to Ecommerce2 application with {string} and {string}', { timeout: 100 * 1000 }, async function (username, password) {
    const userName = this.page.locator('#username');
    const Password = this.page.locator('#password');
    const signInBtn = this.page.locator('#signInBtn');
    // Write code here that turns the phrase above into concrete actions
    await this.page.goto('https://rahulshettyacademy.com/loginpagePractise/');

    console.log(await this.page.title());

    // css, xpath
    await userName.fill(username);
    await Password.fill(password);
    await signInBtn.click();
});

Then('Verify Error message is displayed', { timeout: 100 * 1000 }, async function () {

    console.log(await this.page.locator("[style*='block']").textContent());
    await expect(this.page.locator("[style*='block']")).toContainText('Incorrect');
});

