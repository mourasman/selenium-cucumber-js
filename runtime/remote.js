'use strict';

const selenium = require('selenium-webdriver');

/**
 * Creates a RemoteWebDriver for the given Selenium Server URL
 * @param seleniumServer
 * @param browserName
 * @returns {!ThenableWebDriver}
 */
module.exports = function(seleniumServer, browserName) {

    const driver = new selenium.Builder()
    .usingServer(seleniumServer)
    .withCapabilities(
        {
            browserName: browserName,
            javascriptEnabled: true,
            acceptSslCerts: true
        }).build();

    driver.manage().window().maximize();

    return driver;
};
