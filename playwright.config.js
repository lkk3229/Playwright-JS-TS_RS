// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const config = {
  testDir: './tests',
  timeout: 30 * 1000, 
  expect: {
    timeout: 5000,
  },

  reporter: [['html'],
              ['allure-playwright']],


  projects : [
{
  name: 'chromium',
  use: {

    browserName: 'chromium',
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on', 
    
  }
}
  
]

};

module.exports = config;
