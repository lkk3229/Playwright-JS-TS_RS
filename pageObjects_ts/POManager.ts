/*const { LoginPage } = require('./LoginPage')
const { DashboardPage } = require('./DashboardPage')
const { CartPage } = require('./CartPage')
const {OrdersReviewPage} = require('./OrdersReviewPage')
const {OrdersHistoryPage} = require('./OrdersHistoryPage')
*/
import {LoginPage} from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { CartPage } from './CartPage';    
import { OrdersReviewPage } from './OrdersReviewPage';
import { OrdersHistoryPage } from './OrdersHistoryPage';
import { Page } from '@playwright/test';   




export class POManager {
    page:Page
    loginPage:LoginPage
    dashboardPage:DashboardPage
    cartPage: CartPage
    ordersReviewPage: OrdersReviewPage
    ordersHistoryPage: OrdersHistoryPage


    constructor(page:Page) {
        this.page = page;
        this.loginPage = new LoginPage(page);
        this.dashboardPage = new DashboardPage(page);
        this.cartPage = new CartPage(page);
        this.ordersReviewPage = new OrdersReviewPage(page);
        this.ordersHistoryPage = new OrdersHistoryPage(page);
    }

    getLoginPage() {
        return this.loginPage;
    }

    getDashboardPage() {
        return this.dashboardPage;
    }

    getOrdersReviewPage() {
        return this.ordersReviewPage;
    }

    getOrdersHistoryPage() {
        return this.ordersHistoryPage;
    }

    getCartPage() {
        return this.cartPage;
    }


}
module.exports = { POManager };
