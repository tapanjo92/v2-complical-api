#!/usr/bin/env node

/**
 * Script to update all Lambda handlers to use security headers
 * This is a one-time migration script
 */

const fs = require('fs');
const path = require('path');

const handlers = [
  '../handlers/auth/auth-secure.js',
  '../handlers/auth/api-keys-secure.js',
  '../handlers/auth/webhooks.js',
  '../handlers/auth/usage.js',
  '../handlers/deadlines.js',
  '../handlers/simplified-deadlines.js',
  '../handlers/health.js',
];

const securityHeadersImport = `const { addSecurityHeaders } = require('../../utils/security-headers');`;
const securityHeadersImportRelative = `const { addSecurityHeaders } = require('../utils/security-headers');`;

handlers.forEach(handlerPath => {
  const filePath = path.join(__dirname, handlerPath);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has security headers
    if (content.includes('addSecurityHeaders')) {
      console.log(`✓ ${handlerPath} - Already has security headers`);
      return;
    }
    
    // Add import based on path depth
    const importStatement = handlerPath.includes('auth/') ? 
      securityHeadersImport : securityHeadersImportRelative;
    
    // Add import after the first require statement
    const firstRequireIndex = content.indexOf('require(');
    if (firstRequireIndex !== -1) {
      const lineEnd = content.indexOf('\n', firstRequireIndex);
      content = content.slice(0, lineEnd + 1) + importStatement + '\n' + content.slice(lineEnd + 1);
    }
    
    // Update the file
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${handlerPath} - Updated with security headers import`);
    
  } catch (error) {
    console.error(`✗ ${handlerPath} - Error: ${error.message}`);
  }
});

console.log('\nDone! Now manually update each handler to use addSecurityHeaders() wrapper.');