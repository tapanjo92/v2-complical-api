const https = require('https');

const API_URL = process.env.API_URL || 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test';
const API_KEY = process.env.API_KEY || 'dAsn0VL7Bv4aU0XrXpjDt84g98NgVNZD2M56KubU';

async function makeRequest(path, description, skipAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {},
    };

    // Add API key header unless explicitly skipped
    if (!skipAuth) {
      options.headers['x-api-key'] = API_KEY;
    }

    console.log(`\n📍 ${description}`);
    console.log(`   GET ${url.pathname}${url.search}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`   ✅ Status: ${res.statusCode}`);
          console.log(`   📊 Count: ${response.count || 0} items`);
          
          if (response.deadlines && response.deadlines.length > 0) {
            console.log(`   📋 Sample:`);
            const sample = response.deadlines[0];
            console.log(`      - ${sample.name} (${sample.dueDate})`);
            console.log(`      - Agency: ${sample.agency}`);
            console.log(`      - Type: ${sample.type}`);
          }
          
          resolve(response);
        } catch (error) {
          console.error(`   ❌ Error parsing response:`, error);
          console.error(`   Response:`, data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request error:`, error);
      reject(error);
    });

    req.end();
  });
}

async function testApi() {
  console.log('🧪 Testing CompliCal API - Clean Implementation\n');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('='.repeat(60));

  try {
    // Test 1: Health check
    await makeRequest('/health', 'Health Check (no auth)', true);

    // Test 2: Global deadlines endpoint
    await makeRequest('/v1/deadlines?limit=5', 'Global deadlines endpoint');

    // Test 3: Australian deadlines
    await makeRequest('/v1/au/deadlines?limit=5', 'Australian deadlines');

    // Test 4: ATO specific deadlines
    await makeRequest('/v1/au/ato/deadlines?limit=5', 'ATO deadlines (agency query)');

    // Test 5: Date range query
    await makeRequest(
      '/v1/au/ato/deadlines?from_date=2025-01-01&to_date=2025-03-31',
      'ATO deadlines Q1 2025'
    );

    // Test 6: Type filter
    await makeRequest(
      '/v1/au/deadlines?type=BAS_QUARTERLY',
      'BAS quarterly deadlines'
    );

    // Test 7: New Zealand deadlines
    await makeRequest('/v1/nz/deadlines?limit=5', 'New Zealand deadlines');

    // Test 8: IRD specific
    await makeRequest('/v1/nz/ird/deadlines', 'IRD deadlines');

    console.log('\n✅ All tests completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testApi().catch(console.error);
}

module.exports = { testApi };