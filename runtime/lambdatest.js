'use strict';

const selenium = require('selenium-webdriver');
const LambdaTunnel = require('@lambdatest/node-tunnel');

// Creates an instance of Tunnel
const tunnel = new LambdaTunnel();

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
module.exports = function(browserName, lambdaHubUrl, user, key, shouldTunnel) {
    const caps = {
        browserName: browserName,
        javascriptEnabled: true,
        acceptSslCerts: true
    };

    if (shouldTunnel) {
        caps.tunnel = true;

        (async function() {
            try {
                await tunnel.start({
                    user: user,
                    key: key
                });
                console.log('Tunnel is Running Successfully');
            }
            catch (error) {
                console.log(error);
            }
        })();
    }

    const driver = new selenium.Builder()
      .usingServer(lambdaHubUrl)
      .withCapabilities(caps)
      .build();

    driver.manage().window().maximize();

    return driver;
};
