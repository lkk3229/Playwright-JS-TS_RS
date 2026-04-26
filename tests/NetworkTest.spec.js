import { test, expect, request } from '@playwright/test';
const { APIUtils } = require('../utils/APIUtils');
const loginPayload = { userEmail: "lkk3229@gmail.com", userPassword: "Lkk@3229" };
const orderPayload = { orders: [{ country: "India", productOrderedId: "6960eac0c941646b7a8b3e68" }] };
const fakePayLoadOrders = { data: [], message: "No Orders" };

let response;

test.beforeAll(async () => {

    const apiContext = await request.newContext();
    const apiUtils = new APIUtils(apiContext, loginPayload);
    response = await apiUtils.createOrder(orderPayload);

});

// Create order is success 
test('Place the order', async ({ page }) => {

    await page.addInitScript(value => {
        window.localStorage.setItem("token", value);
    }, response.token);
    //js file- Login js, DashboardPage
   // const email = loginPayload.userEmail;
    await page.goto("https://rahulshettyacademy.com/client");
    await page.route("**/api/ecom/order/get-orders-for-customer/*",
        async route => {
            const response = await route.fetch();
            const body = JSON.stringify(fakePayLoadOrders);
            await route.fulfill(
                {
                    response,
                    body,
                }
            );
            //intercepting the response - API response ->{playwright fake response} -> browser -> render data on frontend

        });
    await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/ecom/order/get-orders-for-customer/') && resp.status() === 200),
        page.locator("button[routerlink*='myorders']").click(),
    ]);

    await expect(page.locator('.mt-4')).toContainText('No Orders');

});
