'use strict';

const selenium = require('selenium-webdriver');
const browserstack = require('browserstack-local');

/**
 * Creates a Selenium WebDriver using Chrome as the browser
 * @returns {ThenableWebDriver} selenium web driver
 */
module.exports = function(seleniumServer, browserName, browserstackUser, browserstackKey) {

    new browserstack.Local().start({ key: browserstackKey }, function () {
        console.log('BrowserStackLocal successfully started!');
    });

    const driver = new selenium.Builder()
      .usingServer(seleniumServer)
      .withCapabilities(
        {
            browserName: browserName,
            javascriptEnabled: true,
            acceptSslCerts: true,
            'browserstack.user': browserstackUser,
            'browserstack.key': browserstackKey

        }).build();

    driver.manage().window().maximize();

    return driver;
};
