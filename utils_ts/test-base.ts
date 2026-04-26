import {test as baseTest} from '@playwright/test';

interface TestDataForOrder {
    username: string;
    password: string;
    productName: string;
}

export const customTest = baseTest.extend<{testDataForOrder:TestDataForOrder}>(
{
    
    testDataForOrder:
       {
        username: "lkk3229@gmail.com",
        password: "Lkk@3229",
        productName: "ZARA COAT 3"
        }
})


