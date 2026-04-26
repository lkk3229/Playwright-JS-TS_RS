const base = require('@playwright/test');

exports.customtest = base.test.extend(
{
    testDataForOrder:
       {
        username: "lkk3229@gmail.com",
        password: "Lkk@3229",
        productName: "ZARA COAT 3"
        }
})


