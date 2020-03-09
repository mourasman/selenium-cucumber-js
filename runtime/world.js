'use strict';

/**
 * world.js is loaded by the cucumber framework before loading the step definitions and feature files
 * it is responsible for setting up and exposing the driver/browser/expect/assert etc required within each step definition
 */
const fs = require('fs-plus');
const path = require('path');
const requireDir = require('require-dir');
const merge = require('merge');
const chalk = require('chalk');
const selenium = require('selenium-webdriver');
const expect = require('chai').expect;
const assert = require('chai').assert;
const reporter = require('cucumber-html-reporter');
const cucumberJunit = require('cucumber-junit');
const LambdaTunnel = require('@lambdatest/node-tunnel');

// Initialize the eyes SDK and set your private API key.
const Eyes = require('eyes.selenium').Eyes;

// drivers
const FireFoxDriver = require('./firefoxDriver.js');
const PhantomJSDriver = require('./phantomDriver.js');
const ElectronDriver = require('./electronDriver.js');
const ChromeDriver = require('./chromeDriver');
const RemoteDriver = require('./remote');
const LambdatestDriver = require('./lambdatest');

const lambdaTunnel = new LambdaTunnel();

/**
 * create the selenium browser based on global var set in index.js
 * @returns {ThenableWebDriver} selenium web driver
 */
function getDriverInstance() {

    let driver;

    if (seleniumServer) {

        if (lambdatestUser && lambdatestKey) {
            return new LambdatestDriver(browserName, seleniumServer, lambdatestUser, lambdatestKey, lambdatestUseTunnel);
        }

        return new RemoteDriver(seleniumServer, browserName);
    }

    switch (browserName || '') {

        case 'firefox': {
            driver = new FireFoxDriver();
        }
            break;

        case 'phantomjs': {
            driver = new PhantomJSDriver();
        }
            break;

        case 'electron': {
            driver = new ElectronDriver();
        }
            break;

        case 'chrome': {
            driver = new ChromeDriver();
        }
            break;

      // try to load from file
        default: {
            const driverFileName = path.resolve(process.cwd(), browserName);

            if (!fs.isFileSync(driverFileName)) {
                throw new Error('Could not find driver file: ' + driverFileName);
            }

            driver = require(driverFileName)();
        }
    }


    return driver;
}


/**
 * Initialize the eyes SDK and set your private API key via the config file.
 */
function getEyesInstance() {

    if (global.eyesKey) {

        const eyes = new Eyes();

        // retrieve eyes api key from config file in the project root as defined by the user
        eyes.setApiKey(global.eyesKey);

        return eyes;
    }

    return null;
}

function consoleInfo() {
    const args = [].slice.call(arguments),
        output = chalk.bgBlue.white('\n>>>>> \n' + args + '\n<<<<<\n');

    console.log(output);
}

/**
 * Creates a list of variables to expose globally and therefore accessible within each step definition
 * @returns {void}
 */
function createWorld() {

    const runtime = {
        driver: null,               // the browser object
        eyes: null,
        selenium: selenium,         // the raw nodejs selenium driver
        By: selenium.By,            // in keeping with Java expose selenium By
        by: selenium.By,            // provide a javascript lowercase version
        until: selenium.until,      // provide easy access to selenium until methods
        expect: expect,             // expose chai expect to allow variable testing
        assert: assert,             // expose chai assert to allow variable testing
        trace: consoleInfo,         // expose an info method to log output to the console in a readable/visible format
        page: global.page || {},    // empty page objects placeholder
        shared: global.shared || {} // empty shared objects placeholder
    };

    // expose properties to step definition methods via global variables
    Object.keys(runtime).forEach(function (key) {
        if (key === 'driver' && browserTeardownStrategy !== 'always') {
            return;
        }

        // make property/method available as a global (no this. prefix required)
        global[key] = runtime[key];
    });
}

/**
 * Import shared objects, pages object and helpers into global scope
 * @returns {void}
 */
function importSupportObjects() {

    // import shared objects from multiple paths (after global vars have been created)
    if (global.sharedObjectPaths && Array.isArray(global.sharedObjectPaths) && global.sharedObjectPaths.length > 0) {

        const allDirs = {};

        // first require directories into objects by directory
        global.sharedObjectPaths.forEach(function (itemPath) {

            if (fs.existsSync(itemPath)) {

                const dir = requireDir(itemPath, { camelcase: true, recurse: true });

                merge(allDirs, dir);
            }
        });

        // if we managed to import some directories, expose them
        if (Object.keys(allDirs).length > 0) {

            // expose globally
            global.shared = allDirs;
        }
    }

    // import page objects (after global vars have been created)
    if (global.pageObjectPath && fs.existsSync(global.pageObjectPath)) {

        // require all page objects using camel case as object names
        global.page = requireDir(global.pageObjectPath, { camelcase: true, recurse: true });
    }

    // add helpers
    global.helpers = require('../runtime/helpers.js');
}

function closeBrowser() {
    // firefox quits on driver.close on the last window
    return driver.close().then(function () {
        if (browserName !== 'firefox') {
            return driver.quit();
        }
    });
}

function teardownBrowser(done) {
    switch (browserTeardownStrategy) {
        case 'none':
            return Promise.resolve();
        case 'clear':
            return helpers.clearCookiesAndStorages();
        default:
            return closeBrowser(driver, done);
    }
}

// export the "World" required by cucumber to allow it to expose methods within step def's
module.exports = function () {

    createWorld();
    importSupportObjects();

    // this.World must be set!
    this.World = createWorld;

    // set the default timeout for all tests
    this.setDefaultTimeout(global.DEFAULT_TIMEOUT);

    this.registerHandler('BeforeFeatures', function (features, done) {
        if (lambdatestUser && lambdatestKey && lambdatestUseTunnel) {
            lambdaTunnel.start({
                user: lambdatestUser,
                key: lambdatestKey
            }).then(() => done())
              .catch(error => done(error));
        }
    });

    // create the driver and applitools eyes before scenario if it's not instantiated
    this.registerHandler('BeforeScenario', function (scenario) {

        if (!global.driver) {
            global.driver = getDriverInstance();
        }

        if (!global.eyes) {
            global.eyes = getEyesInstance();
        }
    });

    this.registerHandler('AfterFeatures', function (features, done) {

        const cucumberReportPath = path.resolve(global.reportsPath, 'cucumber-report.json');

        if (global.reportsPath && fs.existsSync(global.reportsPath)) {

            // generate the HTML report
            const reportOptions = {
                theme: 'bootstrap',
                jsonFile: cucumberReportPath,
                output: path.resolve(global.reportsPath, 'cucumber-report.html'),
                reportSuiteAsScenarios: true,
                launchReport: (!global.disableLaunchReport),
                ignoreBadJsonFile: true
            };

            reporter.generate(reportOptions);

            // grab the file data
            const reportRaw = fs.readFileSync(cucumberReportPath).toString().trim();
            const xmlReport = cucumberJunit(reportRaw);
            const junitOutputPath = path.resolve(global.junitPath, 'junit-report.xml');

            fs.writeFileSync(junitOutputPath, xmlReport);
        }

        if (browserTeardownStrategy !== 'always') {
            closeBrowser().then(() => done());
        }
        else if (lambdatestUseTunnel && lambdaTunnel.isRunning()) {
            lambdaTunnel.stop(done);
        }
        else {
            new Promise(resolve => resolve(done()));
        }
    });

    // executed after each scenario (always closes the browser to ensure fresh tests)
    this.After(function (scenario) {
        if (scenario.isFailed() && !global.noScreenshot) {
            // add a screenshot to the error report
            return driver.takeScreenshot().then(function (screenShot) {

                scenario.attach(new Buffer(screenShot, 'base64'), 'image/png');

                return teardownBrowser().then(function() {
                    if (eyes) {
                        // If the test was aborted before eyes.close was called ends the test as aborted.
                        return eyes.abortIfNotClosed();
                    }
                });
            });
        }
        return teardownBrowser();
    });
};
