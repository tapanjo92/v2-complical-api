const https = require('https');

const API_URL = 'https://vmvjp2v1fl.execute-api.ap-south-1.amazonaws.com/test';

// Test health endpoint
https.get(`${API_URL}/health`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Health endpoint status:', res.statusCode);
    console.log('Response:', data);
    
    // Check if there's a Lambda handler attached
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      if (parsed.meta && parsed.meta.path === '/health') {
        console.log('✅ Health endpoint is working - Lambda handler is attached');
      }
    }
  });
}).on('error', console.error);