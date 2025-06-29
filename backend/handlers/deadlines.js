const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoDbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  console.log('Request:', JSON.stringify(event, null, 2));
  
  // Extract usage information from authorizer context
  const authContext = event.requestContext?.authorizer || {};
  const usageCount = authContext.usageCount || '0';
  const usageLimit = authContext.usageLimit || '10000';
  const remainingCalls = authContext.remainingCalls || '10000';
  const usageResetDate = authContext.usageResetDate;

  try {
    const params = {
      type: event.queryStringParameters?.type,
      from_date: event.queryStringParameters?.from_date,
      to_date: event.queryStringParameters?.to_date,
      limit: parseInt(event.queryStringParameters?.limit || '20'),
      nextToken: event.queryStringParameters?.nextToken,
    };

    // Extract jurisdiction and agency from path
    const pathParts = event.path.split('/');
    const jurisdiction = extractJurisdiction(pathParts);
    const agency = extractAgency(pathParts);

    let queryInput;

    if (agency) {
      // STRATEGY 1: Query by agency using GSI
      // Example: /v1/au/ato/deadlines
      queryInput = buildAgencyQuery(jurisdiction, agency, params);
    } else {
      // STRATEGY 2: Query by jurisdiction using primary key
      // Example: /v1/au/deadlines or /v1/deadlines?country=AU
      queryInput = buildJurisdictionQuery(jurisdiction, params);
    }

    // Handle pagination
    if (params.nextToken) {
      try {
        queryInput.ExclusiveStartKey = JSON.parse(
          Buffer.from(params.nextToken, 'base64').toString('utf-8')
        );
      } catch (error) {
        return errorResponse(400, 'Invalid pagination token');
      }
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(queryInput));

    // Transform results
    const deadlines = result.Items?.map(transformDeadline) || [];

    // Build response
    const response = {
      deadlines,
      count: deadlines.length,
    };

    if (result.LastEvaluatedKey) {
      response.nextToken = Buffer.from(
        JSON.stringify(result.LastEvaluatedKey)
      ).toString('base64');
    }

    response.meta = {
      requestId: event.requestContext.requestId,
      path: event.path,
      query: params,
    };

    return successResponse(response, {
      used: usageCount,
      limit: usageLimit,
      remaining: remainingCalls,
      resetDate: usageResetDate
    });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error');
  }
};

function buildAgencyQuery(jurisdiction, agency, params) {
  const query = {
    TableName: TABLE_NAME,
    IndexName: 'AgencyIndex',
    KeyConditionExpression: 'GSI_PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `AGENCY#${agency.toUpperCase()}#${jurisdiction.toUpperCase()}`,
    },
    Limit: params.limit,
  };

  // Add date range if provided
  if (params.from_date || params.to_date) {
    const conditions = ['GSI_PK = :pk'];
    
    if (params.from_date && params.to_date) {
      conditions.push('GSI_SK BETWEEN :from AND :to');
      query.ExpressionAttributeValues[':from'] = `DUEDATE#${params.from_date}`;
      query.ExpressionAttributeValues[':to'] = `DUEDATE#${params.to_date}#\uffff`;
    } else if (params.from_date) {
      conditions.push('GSI_SK >= :from');
      query.ExpressionAttributeValues[':from'] = `DUEDATE#${params.from_date}`;
    } else if (params.to_date) {
      conditions.push('GSI_SK <= :to');
      query.ExpressionAttributeValues[':to'] = `DUEDATE#${params.to_date}#\uffff`;
    }
    
    query.KeyConditionExpression = conditions.join(' AND ');
  }

  // Add type filter if provided
  if (params.type) {
    query.FilterExpression = '#type = :type';
    query.ExpressionAttributeNames = { '#type': 'type' };
    query.ExpressionAttributeValues[':type'] = params.type;
  }

  return query;
}

function buildJurisdictionQuery(jurisdiction, params) {
  // Determine date range for partition key
  const fromDate = params.from_date || new Date().toISOString().slice(0, 10);
  const toDate = params.to_date || 
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  // Extract year-month for partition key
  const fromYearMonth = fromDate.slice(0, 7);
  const toYearMonth = toDate.slice(0, 7);

  // If querying within a single month
  if (fromYearMonth === toYearMonth) {
    const query = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `JURISDICTION#${jurisdiction.toUpperCase()}#YEARMONTH#${fromYearMonth}`,
      },
      Limit: params.limit,
    };

    // Add sort key conditions for specific date range
    if (params.from_date || params.to_date) {
      query.KeyConditionExpression += ' AND SK BETWEEN :from AND :to';
      query.ExpressionAttributeValues[':from'] = `DUEDATE#${fromDate}`;
      query.ExpressionAttributeValues[':to'] = `DUEDATE#${toDate}#\uffff`;
    }

    // Add type filter
    if (params.type) {
      query.FilterExpression = '#type = :type';
      query.ExpressionAttributeNames = { '#type': 'type' };
      query.ExpressionAttributeValues[':type'] = params.type;
    }

    return query;
  } else {
    // Multi-month query requires multiple partition queries
    // For simplicity, we'll query the current month
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    
    const query = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `JURISDICTION#${jurisdiction.toUpperCase()}#YEARMONTH#${currentYearMonth}`,
      },
      Limit: params.limit,
    };

    if (params.type) {
      query.FilterExpression = '#type = :type';
      query.ExpressionAttributeNames = { '#type': 'type' };
      query.ExpressionAttributeValues[':type'] = params.type;
    }

    return query;
  }
}

function extractJurisdiction(pathParts) {
  // Look for country codes in path
  const countryIndex = pathParts.findIndex(part => 
    ['au', 'nz', 'australia', 'new-zealand'].includes(part.toLowerCase())
  );
  
  if (countryIndex >= 0) {
    const country = pathParts[countryIndex].toLowerCase();
    return country === 'australia' ? 'AU' : 
           country === 'new-zealand' ? 'NZ' : 
           country.toUpperCase();
  }
  
  return 'AU'; // default
}

function extractAgency(pathParts) {
  // Look for agency codes in path
  const agencies = ['ato', 'asic', 'ird', 'acc'];
  const agencyPart = pathParts.find(part => 
    agencies.includes(part.toLowerCase())
  );
  
  return agencyPart ? agencyPart.toUpperCase() : null;
}

function transformDeadline(item) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    description: item.description,
    jurisdiction: item.jurisdiction,
    agency: item.agency,
    dueDate: item.dueDate,
    period: item.period,
    applicableTo: item.applicableTo,
    sourceUrl: item.sourceUrl,
    notes: item.notes,
  };
}

function successResponse(data, usageInfo) {
  // Get reset date from authorizer context or calculate default
  let resetTimestamp;
  if (usageInfo?.resetDate) {
    resetTimestamp = Math.floor(new Date(usageInfo.resetDate).getTime() / 1000);
  } else {
    // Default to 30 days from now if not provided
    const defaultReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    resetTimestamp = Math.floor(defaultReset.getTime() / 1000);
  }
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Reset',
      'X-RateLimit-Limit': usageInfo?.limit || '10000',
      'X-RateLimit-Remaining': usageInfo?.remaining || '10000',
      'X-RateLimit-Used': usageInfo?.used || '0',
      'X-RateLimit-Reset': resetTimestamp.toString(), // Unix timestamp
    },
    body: JSON.stringify(data),
  };
}

function errorResponse(statusCode, message) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: message }),
  };
}