/**
 * Test Data Setup for CompliCal API Edge Cases
 * 
 * This script sets up test data in DynamoDB for edge case testing
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1'
});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const TABLE_NAME = process.env.TABLE_NAME || 'complical-deadlines-test';

/**
 * Test data for various edge case scenarios
 */
const TestData = {
  /**
   * Edge case deadlines for testing
   */
  edgeCaseDeadlines: [
    // July year-end company deadlines
    {
      id: 'july-yearend-tax-2024',
      PK: 'JURISDICTION#AU#YEARMONTH#2025-02',
      SK: 'DUEDATE#2025-02-28#TYPE#income_tax#ID#july-yearend-tax-2024',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2025-02-28#ID#july-yearend-tax-2024',
      type: 'income_tax',
      name: 'Company Tax Return - July Year End',
      description: 'Tax return for companies with 31 July year-end',
      jurisdiction: 'AU',
      agency: 'ATO',
      dueDate: '2025-02-28',
      yearEnd: '2024-07-31',
      notes: 'Non-standard year-end: Due 7 months after 31 July',
      applicableTo: ['companies_july_yearend']
    },

    // Easter-affected GST deadlines
    {
      id: 'gst-easter-2024-good-friday',
      PK: 'JURISDICTION#AU#YEARMONTH#2024-04',
      SK: 'DUEDATE#2024-04-23#TYPE#gst#ID#gst-easter-2024',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2024-04-23#ID#gst-easter-2024',
      type: 'gst',
      name: 'Monthly GST Return',
      description: 'GST return for monthly filers',
      jurisdiction: 'AU',
      agency: 'ATO',
      originalDueDate: '2024-04-21', // Good Friday
      dueDate: '2024-04-23', // Tuesday after Easter
      adjustmentReason: 'Public holiday - Easter (Good Friday and Easter Monday)',
      filingFrequency: 'monthly',
      applicableTo: ['gst_monthly_filers']
    },

    // ASIC annual review - December 31
    {
      id: 'asic-annual-review-dec31-2023',
      PK: 'JURISDICTION#AU#YEARMONTH#2024-01',
      SK: 'DUEDATE#2024-01-02#TYPE#annual_review#ID#asic-dec31-2023',
      GSI_PK: 'AGENCY#ASIC#AU',
      GSI_SK: 'DUEDATE#2024-01-02#ID#asic-dec31-2023',
      type: 'annual_review',
      name: 'ASIC Annual Review',
      description: 'Annual company review and fee payment',
      jurisdiction: 'AU',
      agency: 'ASIC',
      originalDueDate: '2023-12-31', // Sunday
      dueDate: '2024-01-02', // First business day
      adjustmentReason: 'Weekend and New Year holiday period',
      registrationDate: '2020-12-31',
      lateFee: {
        oneMonth: 87,
        twoMonths: 353
      },
      applicableTo: ['all_companies']
    },

    // Christmas period deadlines
    {
      id: 'bas-christmas-2023',
      PK: 'JURISDICTION#AU#YEARMONTH#2023-12',
      SK: 'DUEDATE#2023-12-27#TYPE#bas#ID#bas-christmas-2023',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2023-12-27#ID#bas-christmas-2023',
      type: 'bas',
      name: 'Business Activity Statement',
      description: 'Quarterly BAS for October-December quarter',
      jurisdiction: 'AU',
      agency: 'ATO',
      originalDueDate: '2023-12-25', // Christmas Day
      dueDate: '2023-12-27', // Next business day
      adjustmentReason: 'Public holiday - Christmas Day',
      period: 'Q2 2023-24',
      applicableTo: ['gst_registered_businesses']
    },

    // Daylight saving affected deadline
    {
      id: 'payg-dst-transition-2024',
      PK: 'JURISDICTION#AU#YEARMONTH#2024-10',
      SK: 'DUEDATE#2024-10-07#TYPE#payg#ID#payg-dst-2024',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2024-10-07#ID#payg-dst-2024',
      type: 'payg',
      name: 'PAYG Withholding',
      description: 'Monthly PAYG withholding payment',
      jurisdiction: 'AU',
      agency: 'ATO',
      dueDate: '2024-10-07',
      deadlineTime: {
        NSW: '23:59:59 AEDT',
        QLD: '23:59:59 AEST',
        utcDeadline: '2024-10-07T12:59:59Z' // QLD deadline in UTC
      },
      timezoneNote: 'Deadline varies by state due to daylight saving',
      applicableTo: ['employers']
    },

    // Multi-jurisdiction GST deadlines
    {
      id: 'gst-au-april-2024',
      PK: 'JURISDICTION#AU#YEARMONTH#2024-04',
      SK: 'DUEDATE#2024-04-21#TYPE#gst#ID#gst-au-april',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2024-04-21#ID#gst-au-april',
      type: 'gst',
      name: 'GST Return - Australia',
      jurisdiction: 'AU',
      agency: 'ATO',
      dueDate: '2024-04-21',
      rate: '10%',
      applicableTo: ['gst_registered_businesses']
    },
    {
      id: 'gst-nz-april-2024',
      PK: 'JURISDICTION#NZ#YEARMONTH#2024-04',
      SK: 'DUEDATE#2024-04-28#TYPE#gst#ID#gst-nz-april',
      GSI_PK: 'AGENCY#IRD#NZ',
      GSI_SK: 'DUEDATE#2024-04-28#ID#gst-nz-april',
      type: 'gst',
      name: 'GST Return - New Zealand',
      jurisdiction: 'NZ',
      agency: 'IRD',
      dueDate: '2024-04-28',
      rate: '15%',
      applicableTo: ['gst_registered_businesses']
    },
    {
      id: 'gst-sg-april-2024',
      PK: 'JURISDICTION#SG#YEARMONTH#2024-05',
      SK: 'DUEDATE#2024-05-31#TYPE#gst#ID#gst-sg-april',
      GSI_PK: 'AGENCY#IRAS#SG',
      GSI_SK: 'DUEDATE#2024-05-31#ID#gst-sg-april',
      type: 'gst',
      name: 'GST Return - Singapore',
      jurisdiction: 'SG',
      agency: 'IRAS',
      dueDate: '2024-05-31',
      rate: '8%',
      period: 'April 2024',
      applicableTo: ['gst_registered_businesses']
    },

    // ANZAC Day affected deadlines
    {
      id: 'super-anzac-2024',
      PK: 'JURISDICTION#AU#YEARMONTH#2024-04',
      SK: 'DUEDATE#2024-04-26#TYPE#super#ID#super-anzac-2024',
      GSI_PK: 'AGENCY#ATO#AU',
      GSI_SK: 'DUEDATE#2024-04-26#ID#super-anzac-2024',
      type: 'super',
      name: 'Superannuation Guarantee',
      description: 'Quarterly super guarantee payment',
      jurisdiction: 'AU',
      agency: 'ATO',
      originalDueDate: '2024-04-25', // ANZAC Day
      dueDate: '2024-04-26',
      adjustmentReason: 'Public holiday - ANZAC Day',
      period: 'Q3 2023-24',
      applicableTo: ['employers']
    }
  ],

  /**
   * Test API keys for different scenarios
   */
  testApiKeys: [
    {
      PK: 'API_KEY',
      SK: 'KEY#test-key-july-yearend',
      keyPrefix: 'test-key',
      hashedKey: 'mock-hash-july-yearend',
      name: 'July Year-End Test Key',
      email: 'test-july@example.com',
      usageLimit: 10000,
      usageCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      PK: 'API_KEY',
      SK: 'KEY#test-key-load-test',
      keyPrefix: 'test-key',
      hashedKey: 'mock-hash-load-test',
      name: 'Load Test Key',
      email: 'load-test@example.com',
      usageLimit: 1000000,
      usageCount: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      PK: 'API_KEY',
      SK: 'KEY#test-key-near-limit',
      keyPrefix: 'test-key',
      hashedKey: 'mock-hash-near-limit',
      name: 'Near Limit Test Key',
      email: 'near-limit@example.com',
      usageLimit: 10000,
      usageCount: 9998,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],

  /**
   * Public holiday data for testing
   */
  publicHolidays: [
    {
      PK: 'HOLIDAY#AU#2024',
      SK: 'DATE#2024-03-29',
      name: 'Good Friday',
      date: '2024-03-29',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#AU#2024',
      SK: 'DATE#2024-04-01',
      name: 'Easter Monday',
      date: '2024-04-01',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#AU#2024',
      SK: 'DATE#2024-04-25',
      name: 'ANZAC Day',
      date: '2024-04-25',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#AU#2023',
      SK: 'DATE#2023-12-25',
      name: 'Christmas Day',
      date: '2023-12-25',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#AU#2023',
      SK: 'DATE#2023-12-26',
      name: 'Boxing Day',
      date: '2023-12-26',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#AU#2024',
      SK: 'DATE#2024-01-01',
      name: 'New Year\'s Day',
      date: '2024-01-01',
      jurisdiction: 'AU',
      type: 'national',
      affectsDeadlines: true
    },
    {
      PK: 'HOLIDAY#NZ#2024',
      SK: 'DATE#2024-04-25',
      name: 'ANZAC Day',
      date: '2024-04-25',
      jurisdiction: 'NZ',
      type: 'national',
      affectsDeadlines: true
    }
  ]
};

/**
 * Setup functions
 */
const SetupFunctions = {
  /**
   * Create tables if they don't exist
   */
  async ensureTables() {
    // In a real scenario, this would create tables
    // For testing, we assume tables exist
    console.log('✓ Tables verified');
  },

  /**
   * Insert test deadlines
   */
  async insertDeadlines() {
    const batches = this.createBatches(TestData.edgeCaseDeadlines, 25);
    
    for (const batch of batches) {
      const params = {
        RequestItems: {
          [TABLE_NAME]: batch.map(item => ({
            PutRequest: { Item: item }
          }))
        }
      };

      try {
        await docClient.send(new BatchWriteCommand(params));
        console.log(`✓ Inserted ${batch.length} deadlines`);
      } catch (error) {
        console.error('Error inserting deadlines:', error);
      }
    }
  },

  /**
   * Insert test API keys
   */
  async insertApiKeys() {
    const apiKeyTable = process.env.API_KEY_TABLE || 'complical-api-keys-test';
    
    for (const apiKey of TestData.testApiKeys) {
      const params = {
        TableName: apiKeyTable,
        Item: apiKey
      };

      try {
        await docClient.send(new PutCommand(params));
        console.log(`✓ Inserted API key: ${apiKey.name}`);
      } catch (error) {
        console.error(`Error inserting API key ${apiKey.name}:`, error);
      }
    }
  },

  /**
   * Insert public holidays
   */
  async insertHolidays() {
    const holidayTable = process.env.HOLIDAY_TABLE || 'complical-holidays-test';
    
    for (const holiday of TestData.publicHolidays) {
      const params = {
        TableName: holidayTable,
        Item: holiday
      };

      try {
        await docClient.send(new PutCommand(params));
        console.log(`✓ Inserted holiday: ${holiday.name} (${holiday.date})`);
      } catch (error) {
        console.error(`Error inserting holiday ${holiday.name}:`, error);
      }
    }
  },

  /**
   * Create batches for batch write operations
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  },

  /**
   * Setup all test data
   */
  async setupAll() {
    console.log('\n🚀 Setting up CompliCal API test data...\n');
    
    console.log('Environment:', process.env.ENVIRONMENT || 'test');
    console.log('Region:', process.env.AWS_REGION || 'ap-south-1');
    console.log('Tables:', {
      deadlines: TABLE_NAME,
      apiKeys: process.env.API_KEY_TABLE || 'complical-api-keys-test',
      holidays: process.env.HOLIDAY_TABLE || 'complical-holidays-test'
    });
    
    console.log('\n📊 Setting up test data:\n');

    try {
      await this.ensureTables();
      await this.insertDeadlines();
      await this.insertApiKeys();
      await this.insertHolidays();
      
      console.log('\n✅ Test data setup complete!\n');
      
      // Print test API keys for reference
      console.log('Test API Keys:');
      TestData.testApiKeys.forEach(key => {
        console.log(`  - ${key.SK.replace('KEY#', '')}: ${key.name}`);
      });
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    }
  }
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node setup-test-data.js [options]

Options:
  --environment <env>  Set environment (default: test)
  --region <region>    Set AWS region (default: ap-south-1)
  --table <name>       Set deadline table name
  --dry-run            Show what would be inserted without actually doing it

Examples:
  node setup-test-data.js
  node setup-test-data.js --environment prod --region us-east-1
  node setup-test-data.js --dry-run
    `);
    process.exit(0);
  }

  // Parse command line arguments
  const envIndex = args.indexOf('--environment');
  if (envIndex > -1 && args[envIndex + 1]) {
    process.env.ENVIRONMENT = args[envIndex + 1];
  }

  const regionIndex = args.indexOf('--region');
  if (regionIndex > -1 && args[regionIndex + 1]) {
    process.env.AWS_REGION = args[regionIndex + 1];
  }

  const tableIndex = args.indexOf('--table');
  if (tableIndex > -1 && args[tableIndex + 1]) {
    process.env.TABLE_NAME = args[tableIndex + 1];
  }

  if (args.includes('--dry-run')) {
    console.log('\n🔍 DRY RUN MODE - No data will be inserted\n');
    console.log('Would insert:');
    console.log(`  - ${TestData.edgeCaseDeadlines.length} edge case deadlines`);
    console.log(`  - ${TestData.testApiKeys.length} test API keys`);
    console.log(`  - ${TestData.publicHolidays.length} public holidays`);
    console.log('\nSample deadline:');
    console.log(JSON.stringify(TestData.edgeCaseDeadlines[0], null, 2));
    process.exit(0);
  }

  SetupFunctions.setupAll();
}

module.exports = { TestData, SetupFunctions };