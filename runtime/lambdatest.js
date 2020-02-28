'use strict';

const selenium = require('selenium-webdriver');

// Replace <lambdatest-user> with your user and <lambdatest-accesskey> with your key.
/**
 * Creates a RemoteWebDriver for the given Selenium Server URL
 * @param lambdaHubUrl
 * @param browserName
 * @param user
 * @param key
 * @param shouldTunnel
 * @returns {!ThenableWebDriver}
 */
module.exports = function(browserName, lambdaHubUrl, shouldTunnel) {
    const caps = {
        browserName: browserName,
        javascriptEnabled: true,
        acceptSslCerts: true
    };

    if (shouldTunnel) {
        caps.tunnel = true;
    }

    const driver = new selenium.Builder()
          .usingServer(lambdaHubUrl)
          .withCapabilities(caps)
          .build();
    driver.manage().window().maximize();

    return driver;
};
