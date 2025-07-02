# CompliCal Data Management Guide

## Loading Initial Data

### Prerequisites
- CompliCal infrastructure deployed
- DynamoDB tables created
- AWS CLI configured

### Load Compliance Deadlines

```bash
cd /home/ubuntu/v2-complical-api/infrastructure

# Set the table name (adjust for your environment)
export TABLE_NAME=complical-deadlines-test

# Load all data
npm run load-data
```

This loads:
- 421 Australian deadlines
- 48 New Zealand deadlines
- Total: 469 compliance deadlines

### Data Categories

#### Australian Data (421 deadlines)
- **Federal** (185): ATO, ASIC, Fair Work, Excise taxes
- **State Payroll Tax** (50): All 8 states/territories
- **State Land Tax** (10): 7 states (NT exempt)
- **Workers Compensation** (6): All states
- **Stamp Duty** (24): Property, vehicle, insurance
- **Vehicle Registration** (96): Monthly reminders
- **Mining & Gaming** (24): Royalties and gaming taxes
- **Other State Taxes** (26): Various levies

#### New Zealand Data (48 deadlines)
- GST returns
- PAYE and employment info
- Provisional tax
- Company annual returns
- ACC levies
- Various withholding taxes

## Data Verification

### Check Total Count
```bash
aws dynamodb scan \
  --table-name $TABLE_NAME \
  --select COUNT \
  --region ap-south-1
```

### Query by Country
```bash
# Australian deadlines
aws dynamodb query \
  --table-name $TABLE_NAME \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"COUNTRY#AU"}}' \
  --select COUNT \
  --region ap-south-1

# New Zealand deadlines  
aws dynamodb query \
  --table-name $TABLE_NAME \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"COUNTRY#NZ"}}' \
  --select COUNT \
  --region ap-south-1
```

## Adding Custom Data

### Single Deadline
```javascript
// Create a file: add-custom-deadline.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const deadline = {
  PK: 'COUNTRY#AU',
  SK: 'DEADLINE#CUSTOM#2025-12-31',
  GSI1PK: 'AGENCY#CUSTOM',
  GSI1SK: 'DEADLINE#2025-12-31',
  id: 'custom-deadline-2025',
  deadlineId: 'CUSTOM_DEADLINE',
  type: 'CUSTOM_DEADLINE',
  title: 'Custom Compliance Deadline',
  description: 'Custom deadline for specific business requirement',
  dueDate: '2025-12-31',
  frequency: 'ANNUAL',
  category: 'OTHER',
  agency: 'CUSTOM',
  agencyFullName: 'Custom Agency',
  jurisdiction: 'AU',
  applicableTo: ['All businesses'],
  metadata: {
    source: 'Manual Entry',
    lastUpdated: new Date().toISOString()
  }
};

await docClient.send(new PutCommand({
  TableName: process.env.TABLE_NAME,
  Item: deadline
}));
```

## Data Updates

### Update Existing Deadline
```bash
aws dynamodb update-item \
  --table-name $TABLE_NAME \
  --key '{"PK":{"S":"COUNTRY#AU"},"SK":{"S":"DEADLINE#BAS_QUARTERLY#2025-01-28"}}' \
  --update-expression "SET description = :desc" \
  --expression-attribute-values '{":desc":{"S":"Updated description"}}' \
  --region ap-south-1
```

### Bulk Updates
Use the provided scripts in `/scripts/` directory for bulk operations.

## Data Backup

### Export to S3
```bash
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:ap-south-1:ACCOUNT:table/$TABLE_NAME \
  --s3-bucket complical-backups \
  --s3-prefix dynamodb-export/
```

### Create On-Demand Backup
```bash
aws dynamodb create-backup \
  --table-name $TABLE_NAME \
  --backup-name complical-backup-$(date +%Y%m%d) \
  --region ap-south-1
```

## Data Quality Checks

### Find Duplicates
```javascript
// Check for duplicate deadlines
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

const result = await docClient.send(new ScanCommand({
  TableName: process.env.TABLE_NAME
}));

const seen = new Map();
result.Items.forEach(item => {
  const key = `${item.jurisdiction}-${item.type}-${item.dueDate}`;
  if (seen.has(key)) {
    console.log('Duplicate found:', key);
  }
  seen.set(key, item);
});
```

## Future Data Sources

Planned additions:
- Singapore compliance deadlines
- Hong Kong compliance deadlines  
- Industry-specific deadlines (healthcare, finance)
- Professional licensing renewals
- Environmental compliance dates