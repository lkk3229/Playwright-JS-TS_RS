import { test, expect, request } from '@playwright/test';
const { APIUtils } = require('../utils/APIUtils');
const loginPayload = { userEmail: "lkk3229@gmail.com", userPassword: "Lkk@3229" };
const orderPayload = { orders: [{ country: "cuba", productOrderedId: "6960eac0c941646b7a8b3e68" }] };


let response;

test.beforeAll(async () => {

    const apiContext = await request.newContext();
    const apiUtils = new APIUtils(apiContext, loginPayload);

    response = await apiUtils.createOrder(orderPayload);

});

// Create order is success 
test('@API Place the order', async ({ page }) => {

    await page.addInitScript(value => {
        window.localStorage.setItem("token", value);
    }, response.token);

    //js file- Login js, DashboardPage
    const email = loginPayload.userEmail;


    await page.goto("https://rahulshettyacademy.com/client");
    await page.locator("button[routerlink*='myorders']").click();
    await page.locator("tbody").waitFor();
    const rows = await page.locator("tbody tr");


    for (let i = 0; i < await rows.count(); ++i) {
        const rowOrderId = await rows.nth(i).locator("th").textContent();
        if (response.orderId.includes(rowOrderId)) {
            await rows.nth(i).locator("button").first().click();
            break;
        }
    }
    const orderIdDetails = await page.locator(".col-text").textContent();
    await page.pause();
    expect(response.orderId.includes(orderIdDetails)).toBeTruthy();

});

// verify if order created is showing in my orders page or not

