// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { worker } from 'node:cluster';
import { permission } from 'node:process';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const config = {
  testDir: './tests',
  retries : 3,
  workers : 4,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },

  reporter: 'html',
  projects: [
    {
      name: 'chromium',
      use: {

        browserName: 'webkit',
        headless: false,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'off',
        ...devices['iPhone 11'],

      }
    },

    {

      name: 'chromium',
      use: {

        browserName: 'chromium',
        headless: false,
        permissions: ['geolocation'],
        ignoreHTTPSErrors: true,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'on',
        viewport : { width: 720, height: 720 },

      },
    },


  ]


};

module.exports = config;
