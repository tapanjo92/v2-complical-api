#!/usr/bin/env node

/**
 * CompliCal API Edge Case Test Runner
 * 
 * Executes comprehensive test scenarios for complex deadline calculations
 * Usage: node run-edge-case-tests.js [scenario] [environment]
 */

const { EdgeCaseScenarios, TestHelpers } = require('./edge-case-scenarios');
const colors = require('colors/safe');

// Configuration
const CONFIG = {
  environments: {
    local: {
      apiUrl: 'http://localhost:3000/',
      apiKey: 'test-local-key'
    },
    test: {
      apiUrl: 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test/',
      apiKey: process.env.TEST_API_KEY
    },
    prod: {
      apiUrl: 'https://api.complical.com/',
      apiKey: process.env.PROD_API_KEY
    }
  }
};

// Test report generator
class TestReporter {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addResult(scenario, test, result) {
    this.results.push({
      scenario,
      test: test.name,
      passed: result.passed,
      duration: result.duration,
      details: result
    });
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(80));
    console.log(colors.cyan.bold('CompliCal API Edge Case Test Results'));
    console.log('='.repeat(80));
    
    console.log(`\nTest Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ${colors.green('Passed')}: ${passedTests}`);
    console.log(`  ${colors.red('Failed')}: ${failedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s\n`);

    // Group results by scenario
    const resultsByScenario = {};
    this.results.forEach(result => {
      if (!resultsByScenario[result.scenario]) {
        resultsByScenario[result.scenario] = [];
      }
      resultsByScenario[result.scenario].push(result);
    });

    // Print detailed results
    console.log('Detailed Results:\n');
    for (const [scenario, results] of Object.entries(resultsByScenario)) {
      console.log(colors.yellow.bold(`📋 ${scenario}`));
      
      results.forEach(result => {
        const status = result.passed ? colors.green('✓ PASS') : colors.red('✗ FAIL');
        console.log(`   ${status} ${result.test}`);
        
        if (!result.passed && result.details.error) {
          console.log(`      ${colors.red('Error')}: ${result.details.error}`);
        }
        
        if (result.details.stats) {
          console.log(`      Stats: ${JSON.stringify(result.details.stats)}`);
        }
      });
      
      console.log('');
    }

    // Generate JSON report
    this.saveReport();
  }

  saveReport() {
    const reportPath = `./test-results-${new Date().toISOString().slice(0, 10)}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length
      },
      results: this.results
    };

    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Main test runner
async function runTests(scenarioFilter = null, environment = 'test') {
  console.log(colors.cyan.bold('\n🚀 CompliCal API Edge Case Test Runner\n'));
  
  // Validate environment
  if (!CONFIG.environments[environment]) {
    console.error(colors.red(`Invalid environment: ${environment}`));
    console.log(`Available environments: ${Object.keys(CONFIG.environments).join(', ')}`);
    process.exit(1);
  }

  // Set API configuration
  process.env.API_URL = CONFIG.environments[environment].apiUrl;
  const defaultApiKey = CONFIG.environments[environment].apiKey;

  if (!defaultApiKey && environment !== 'local') {
    console.error(colors.red(`API key not configured for ${environment} environment`));
    console.log(`Set ${environment.toUpperCase()}_API_KEY environment variable`);
    process.exit(1);
  }

  console.log(`Environment: ${colors.green(environment)}`);
  console.log(`API URL: ${process.env.API_URL}`);
  console.log(`Default API Key: ${defaultApiKey ? defaultApiKey.slice(0, 8) + '...' : 'Not set'}\n`);

  const reporter = new TestReporter();
  
  // Filter scenarios
  const scenariosToRun = scenarioFilter 
    ? { [scenarioFilter]: EdgeCaseScenarios[scenarioFilter] }
    : EdgeCaseScenarios;

  if (scenarioFilter && !EdgeCaseScenarios[scenarioFilter]) {
    console.error(colors.red(`Invalid scenario: ${scenarioFilter}`));
    console.log(`Available scenarios: ${Object.keys(EdgeCaseScenarios).join(', ')}`);
    process.exit(1);
  }

  // Run tests
  for (const [scenarioName, scenario] of Object.entries(scenariosToRun)) {
    console.log(colors.yellow.bold(`\n🧪 Testing: ${scenario.description}`));
    console.log('-'.repeat(60));

    for (const testCase of scenario.testCases) {
      process.stdout.write(`  Running: ${testCase.name}... `);
      
      // Set default API key if not specified in test
      if (!testCase.request.headers['x-api-key'] && defaultApiKey) {
        testCase.request.headers['x-api-key'] = defaultApiKey;
      }

      const startTime = Date.now();
      
      try {
        const result = await TestHelpers.executeTest(testCase);
        result.duration = Date.now() - startTime;
        
        if (result.passed) {
          console.log(colors.green('✓ PASS'));
        } else {
          console.log(colors.red('✗ FAIL'));
        }
        
        reporter.addResult(scenarioName, testCase, result);
      } catch (error) {
        console.log(colors.red('✗ ERROR'));
        reporter.addResult(scenarioName, testCase, {
          passed: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }
  }

  // Generate report
  reporter.generateReport();
}

// Mock implementations for testing without actual API calls
if (process.env.MOCK_MODE === 'true') {
  console.log(colors.yellow('\n⚠️  Running in MOCK MODE - No actual API calls\n'));
  
  // Override fetch for mock responses
  global.fetch = async (url, options) => {
    return {
      status: 200,
      headers: new Map([
        ['x-ratelimit-limit', '10000'],
        ['x-ratelimit-remaining', '9999'],
        ['x-ratelimit-used', '1']
      ]),
      json: async () => ({
        deadlines: [
          {
            id: 'mock-deadline-1',
            type: 'gst',
            name: 'GST Return',
            dueDate: '2024-04-21',
            jurisdiction: 'AU'
          }
        ],
        count: 1,
        meta: {
          requestId: 'mock-request-id'
        }
      })
    };
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const scenario = args[0] || null;
  const environment = args[1] || 'test';

  console.log(colors.cyan(`
╔══════════════════════════════════════════════════════════╗
║        CompliCal API Edge Case Test Suite                ║
╚══════════════════════════════════════════════════════════╝
  `));

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node run-edge-case-tests.js [scenario] [environment]

Scenarios:
  ${Object.keys(EdgeCaseScenarios).join('\n  ')}

Environments:
  local - Local development
  test  - Test environment (default)
  prod  - Production environment

Examples:
  node run-edge-case-tests.js                    # Run all tests in test env
  node run-edge-case-tests.js julyYearEndDuringEOFY test
  node run-edge-case-tests.js monthlyGSTWithEaster local
  MOCK_MODE=true node run-edge-case-tests.js     # Run with mock responses

Environment Variables:
  TEST_API_KEY  - API key for test environment
  PROD_API_KEY  - API key for production environment
  MOCK_MODE     - Set to 'true' to use mock responses
    `);
    process.exit(0);
  }

  runTests(scenario, environment).catch(error => {
    console.error(colors.red('\n❌ Test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = { runTests, TestReporter };