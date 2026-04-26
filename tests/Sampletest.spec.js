const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://stgwww.agilent.com';

test.describe('Agilent Staging - Sanity Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        // Dismiss cookie consent banner if present
        const acceptCookies = page.locator('button:has-text("Accept All Cookies")');
        if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
            await acceptCookies.click();
            await acceptCookies.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        }
    });

    test('Homepage loads successfully and has correct title', async ({ page }) => {
        await expect(page).toHaveURL(/stgwww\.agilent\.com/);
        const title = await page.title();
        console.log('Page title:', title);
        expect(title).toBeTruthy();
        await expect(page).toHaveTitle(/Agilent/);
    });

    test('Header and navigation are visible', async ({ page }) => {
        // Agilent logo / brand should be present in header
        const header = page.locator('header').first();
        await expect(header).toBeVisible();
        await expect(header.locator('img[alt="Agilent Technologies"]').first()).toBeAttached();

        // Main navigation buttons in the header bar
        await expect(page.getByRole('button', { name: 'Products' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Services' }).first()).toBeVisible();
        await expect(page.locator('button.header__nav-section-button:has-text("Support & Resources")')).toBeVisible();
        await expect(page.locator('header a:has-text("ORDER CENTER")')).toBeVisible();

        // Contact Us link in top nav
        await expect(page.locator('header').getByText('CONTACT US').first()).toBeVisible();

        // Search bar
        const searchBar = page.locator('header input[type="search"], header input[placeholder*="Search"]').first();
        await expect(searchBar).toBeVisible();
    });

    test('Browse by Category section is present', async ({ page }) => {
        const categorySection = page.locator('h2:has-text("Browse by category")').first();
        await categorySection.scrollIntoViewIfNeeded();
        await expect(categorySection).toBeVisible();

        // Verify "See all categories" link is visible
        const seeAll = page.getByRole('link', { name: 'See all categories' }).first();
        await expect(seeAll).toBeVisible();
    });

    test('Featured Products and Promotions section is present', async ({ page }) => {
        const promoSection = page.locator('h2:has-text("Featured products and promotions")').first();
        await promoSection.scrollIntoViewIfNeeded();
        await expect(promoSection).toBeVisible();
    });

    test('Featured Applications and Industries section is present', async ({ page }) => {
        const appsSection = page.locator('h2:has-text("Featured applications and industries")').first();
        await appsSection.scrollIntoViewIfNeeded();
        await expect(appsSection).toBeVisible();
    });

    test('Services and Support section is present', async ({ page }) => {
        const servicesSection = page.locator('h2:has-text("Services and support")').first();
        await servicesSection.scrollIntoViewIfNeeded();
        await expect(servicesSection).toBeVisible();

        // These links are within the page body (not header dropdown)
        const servicePlans = page.locator('main a[href*="service-plans"], section a[href*="service-plans"]').first();
        await servicePlans.scrollIntoViewIfNeeded();
        await expect(servicePlans).toBeVisible();

        const requestService = page.locator('main a[href*="request-service-support"], section a[href*="request-service-support"]').first();
        await requestService.scrollIntoViewIfNeeded();
        await expect(requestService).toBeVisible();
    });

    test('Sign In and Create Account links are present', async ({ page }) => {
        const signIn = page.locator('a[href*="#login"]:has-text("Sign in")').first();
        await signIn.scrollIntoViewIfNeeded();
        await expect(signIn).toBeVisible();

        const createAccount = page.locator('a[href*="#registration"]:has-text("Create account")').first();
        await createAccount.scrollIntoViewIfNeeded();
        await expect(createAccount).toBeVisible();
    });

    test('Footer contains copyright and key links', async ({ page }) => {
        const footer = page.locator('footer').first();
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible();

        // Privacy and Terms links
        const privacyLink = page.locator('footer a[href*="privacy-policy"]').first();
        await expect(privacyLink).toBeVisible();

        const termsLink = page.locator('footer a[href*="terms-of-use"]').first();
        await expect(termsLink).toBeVisible();

        // Copyright text
        const copyright = page.locator('footer >> text=Agilent Technologies, Inc.').first();
        await expect(copyright).toBeVisible();
    });

    test('Social media links are present in footer', async ({ page }) => {
        const footer = page.locator('footer').first();
        await footer.scrollIntoViewIfNeeded();

        await expect(page.locator('footer a[href*="facebook.com"]').first()).toBeVisible();
        await expect(page.locator('footer a[href*="linkedin.com"]').first()).toBeVisible();
        await expect(page.locator('footer a[href*="youtube.com"]').first()).toBeVisible();
    });

    test('News section is present', async ({ page }) => {
        const newsSection = page.locator('h2#news, h2:has-text("News")').first();
        await newsSection.scrollIntoViewIfNeeded();
        await expect(newsSection).toBeVisible();
    });

    test('Navigate to Products page via header', async ({ page }) => {
        await page.getByRole('button', { name: 'Products' }).click();
        // Mega-menu opens; click visible "See All Products" link
        const seeAllProducts = page.getByRole('link', { name: 'See All Products' }).first();
        await expect(seeAllProducts).toBeVisible({ timeout: 10000 });
        await seeAllProducts.click();
        await expect(page).toHaveURL(/\/products/, { timeout: 15000 });
    });

    test('Navigate to Contact Us page', async ({ page }) => {
        await page.locator('header').getByText('CONTACT US').first().click();
        await expect(page).toHaveURL(/contact-us/, { timeout: 15000 });
    });

    test('Navigate to Applications & Industries page via header', async ({ page }) => {
        await page.getByRole('button', { name: 'Applications & Industries' }).click();
        // After clicking, wait for mega-menu and click "See All" link
        const seeAllLink = page.locator('a[href*="/solutions"]').first();
        await expect(seeAllLink).toBeVisible({ timeout: 10000 });
        await seeAllLink.click();
        await expect(page).toHaveURL(/\/solutions/, { timeout: 15000 });
    });
});



