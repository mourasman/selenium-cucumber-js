'use strict';

var selenium = require('selenium-webdriver');

/**
 * Creates a Selenium WebDriver using Chrome as the browser
 * @returns {ThenableWebDriver} selenium web driver
 */
module.exports = function(seleniumServer, browserName, browserstackUser, browserstackKey) {

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
