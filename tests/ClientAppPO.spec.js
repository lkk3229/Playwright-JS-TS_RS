const { test, expect } = require('@playwright/test');
const {customtest} = require('../utils/test-base');
const { POManager } = require('../pageObjects/POManager');

// json -> string -> JS Object
const dataset = JSON.parse(JSON.stringify(require('../utils/placeorderTestData.json')));

for (const data of dataset) {
test(`@Web Client App login - ${data.productName}`, async ({ page }) => {
   //js file- Login js, DashboardPage
   const poManager = new POManager(page);
   const products = page.locator(".card-body");

   const loginPage = poManager.getLoginPage(); 
   await loginPage.goTo();
   await loginPage.validLogin(data.username,data.password); 

   const dashboardPage = poManager.getDashboardPage();
   await dashboardPage.searchProductAddCart(data.productName); 
   await dashboardPage.navigateToCart();

   const cartPage = poManager.getCartPage();
   await cartPage.verifyProductIsdisplayed(data.productName);
   await cartPage.Checkout();

   const ordersReviewPage = poManager.getOrdersReviewPage();
   await ordersReviewPage.searchCountryAndSelect("ind", "India");
   const orderId = await ordersReviewPage.SubmitAndGetOrderId();
   console.log(orderId);

   await dashboardPage.navigateToOrders();

   const ordersHistoryPage = poManager.getOrdersHistoryPage();
   await ordersHistoryPage.searchOrderAndSelect(orderId);
   expect(orderId.includes(await ordersHistoryPage.getOrderId())).toBeTruthy();


})
}

customtest.only(`Client App login`, async ({ page, testDataForOrder }) => {
   //js file- Login js, DashboardPage
   const poManager = new POManager(page);
   const products = page.locator(".card-body");

   const loginPage = poManager.getLoginPage(); 
   await loginPage.goTo();
   await loginPage.validLogin(testDataForOrder.username,testDataForOrder.password); 

   const dashboardPage = poManager.getDashboardPage();
   await dashboardPage.searchProductAddCart(testDataForOrder.productName); 
   await dashboardPage.navigateToCart();

   const cartPage = poManager.getCartPage();
   await cartPage.verifyProductIsdisplayed(testDataForOrder.productName);
   await cartPage.Checkout();

})