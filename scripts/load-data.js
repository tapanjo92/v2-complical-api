const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const TABLE_NAME = process.env.TABLE_NAME || 'complical-deadlines-test';

// Helper to create items with correct key structure
function createDeadlineItem(data) {
  const id = uuidv4();
  const yearMonth = data.dueDate.slice(0, 7);
  
  return {
    // Primary key for jurisdiction queries
    PK: `JURISDICTION#${data.jurisdiction}#YEARMONTH#${yearMonth}`,
    SK: `DUEDATE#${data.dueDate}#TYPE#${data.type}#ID#${id}`,
    
    // GSI for agency queries
    GSI_PK: `AGENCY#${data.agency.toUpperCase().replace(/\s+/g, '_')}#${data.jurisdiction}`,
    GSI_SK: `DUEDATE#${data.dueDate}#TYPE#${data.type}`,
    
    // Item attributes
    id,
    type: data.type,
    name: data.name,
    description: data.description,
    jurisdiction: data.jurisdiction,
    agency: data.agency,
    dueDate: data.dueDate,
    period: data.period,
    applicableTo: data.applicableTo,
    sourceUrl: data.sourceUrl,
    notes: data.notes,
    lastUpdated: new Date().toISOString(),
  };
}

// Sample Australian data
const australianDeadlines = [
  // ATO deadlines
  {
    type: 'BAS_QUARTERLY',
    name: 'Q3 2024-25 BAS',
    description: 'Quarterly Business Activity Statement',
    jurisdiction: 'AU',
    agency: 'ATO',
    dueDate: '2025-02-28',
    period: 'Q3 2024-25',
    applicableTo: ['gst_registered', 'quarterly_reporters'],
    sourceUrl: 'https://www.ato.gov.au/business/business-activity-statements-bas/due-dates/',
    notes: 'Due 28th of month following quarter end',
  },
  {
    type: 'BAS_QUARTERLY',
    name: 'Q4 2024-25 BAS',
    description: 'Quarterly Business Activity Statement',
    jurisdiction: 'AU',
    agency: 'ATO',
    dueDate: '2025-07-28',
    period: 'Q4 2024-25',
    applicableTo: ['gst_registered', 'quarterly_reporters'],
    sourceUrl: 'https://www.ato.gov.au/business/business-activity-statements-bas/due-dates/',
    notes: 'Due 28th of month following quarter end',
  },
  {
    type: 'SUPER_GUARANTEE',
    name: 'Q3 Super Guarantee',
    description: 'Superannuation Guarantee contributions',
    jurisdiction: 'AU',
    agency: 'ATO',
    dueDate: '2025-01-28',
    period: 'Q3 2024-25',
    applicableTo: ['employers'],
    sourceUrl: 'https://www.ato.gov.au/business/super-for-employers/paying-super/',
    notes: '11.5% of ordinary time earnings',
  },
  {
    type: 'PAYG_WITHHOLDING',
    name: 'PAYG Withholding - January',
    description: 'Pay As You Go withholding for employees',
    jurisdiction: 'AU',
    agency: 'ATO',
    dueDate: '2025-02-21',
    period: 'January 2025',
    applicableTo: ['employers', 'medium_withholders'],
    sourceUrl: 'https://www.ato.gov.au/business/payg-withholding/',
    notes: 'Monthly reporters',
  },
  {
    type: 'PAYG_WITHHOLDING',
    name: 'PAYG Withholding - February',
    description: 'Pay As You Go withholding for employees',
    jurisdiction: 'AU',
    agency: 'ATO',
    dueDate: '2025-03-21',
    period: 'February 2025',
    applicableTo: ['employers', 'medium_withholders'],
    sourceUrl: 'https://www.ato.gov.au/business/payg-withholding/',
    notes: 'Monthly reporters',
  },
  
  // ASIC deadlines
  {
    type: 'ANNUAL_REVIEW',
    name: 'Annual Company Review',
    description: 'ASIC annual company review',
    jurisdiction: 'AU',
    agency: 'ASIC',
    dueDate: '2025-03-31',
    period: 'Annual',
    applicableTo: ['companies'],
    sourceUrl: 'https://asic.gov.au/for-business/running-a-company/annual-statements/',
    notes: 'Due within 2 months of review date',
  },
  
  // State deadlines
  {
    type: 'PAYROLL_TAX',
    name: 'NSW Payroll Tax - February',
    description: 'New South Wales payroll tax',
    jurisdiction: 'AU',
    agency: 'REVENUE_NSW',
    dueDate: '2025-03-07',
    period: 'February 2025',
    applicableTo: ['nsw_employers', 'payroll_above_threshold'],
    sourceUrl: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/payroll-tax',
    notes: 'Threshold $1.2M annually',
  },
  {
    type: 'PAYROLL_TAX',
    name: 'VIC Payroll Tax - February',
    description: 'Victoria payroll tax',
    jurisdiction: 'AU',
    agency: 'SRO_VIC',
    dueDate: '2025-03-07',
    period: 'February 2025',
    applicableTo: ['vic_employers', 'payroll_above_threshold'],
    sourceUrl: 'https://www.sro.vic.gov.au/payroll-tax',
    notes: 'Threshold $700k annually',
  },
];

// Sample New Zealand data
const newZealandDeadlines = [
  {
    type: 'GST_RETURN',
    name: 'GST Return - February',
    description: 'Goods and Services Tax return',
    jurisdiction: 'NZ',
    agency: 'IRD',
    dueDate: '2025-03-28',
    period: 'February 2025',
    applicableTo: ['gst_registered', 'monthly_filers'],
    sourceUrl: 'https://www.ird.govt.nz/gst',
    notes: 'Monthly filers',
  },
  {
    type: 'PAYE',
    name: 'PAYE - February',
    description: 'Pay As You Earn for employees',
    jurisdiction: 'NZ',
    agency: 'IRD',
    dueDate: '2025-03-20',
    period: 'February 2025',
    applicableTo: ['employers'],
    sourceUrl: 'https://www.ird.govt.nz/employing-staff',
    notes: 'File and pay by 20th',
  },
  {
    type: 'ACC_LEVY',
    name: 'ACC Levy Invoice',
    description: 'Annual workplace safety levy',
    jurisdiction: 'NZ',
    agency: 'ACC',
    dueDate: '2025-03-31',
    period: '2024-25',
    applicableTo: ['employers', 'self_employed'],
    sourceUrl: 'https://www.acc.co.nz/for-business/paying-levies/',
    notes: 'Annual payment',
  },
];

async function batchWrite(items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map(item => ({ PutRequest: { Item: item } }))
      }
    };
    
    try {
      await docClient.send(new BatchWriteCommand(params));
      console.log(`✅ Loaded ${chunk.length} items`);
    } catch (error) {
      console.error('❌ Batch write error:', error);
      throw error;
    }
  }
}

async function loadData() {
  console.log('🚀 Loading data into DynamoDB...');
  console.log(`📊 Table: ${TABLE_NAME}`);
  
  // Combine all data
  const allDeadlines = [...australianDeadlines, ...newZealandDeadlines];
  
  // Transform to DynamoDB items
  const items = allDeadlines.map(createDeadlineItem);
  
  console.log(`\n📋 Loading ${items.length} deadlines...`);
  
  // Show sample item structure
  console.log('\n🔍 Sample item structure:');
  const sample = items[0];
  console.log(`PK: ${sample.PK}`);
  console.log(`SK: ${sample.SK}`);
  console.log(`GSI_PK: ${sample.GSI_PK}`);
  console.log(`GSI_SK: ${sample.GSI_SK}`);
  
  // Load data
  await batchWrite(items);
  
  console.log('\n✅ Data loading complete!');
  console.log(`📊 Summary:`);
  console.log(`   - Australian deadlines: ${australianDeadlines.length}`);
  console.log(`   - New Zealand deadlines: ${newZealandDeadlines.length}`);
  console.log(`   - Total items: ${items.length}`);
  
  // Show unique agencies
  const agencies = new Set(items.map(i => i.GSI_PK.split('#')[1]));
  console.log(`   - Unique agencies: ${agencies.size}`);
  console.log(`   - Agencies: ${Array.from(agencies).join(', ')}`);
}

// Run if called directly
if (require.main === module) {
  loadData().catch(console.error);
}

module.exports = { loadData, createDeadlineItem };