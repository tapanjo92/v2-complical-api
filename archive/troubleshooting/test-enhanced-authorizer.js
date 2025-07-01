const { handler } = require('../handlers/auth/api-key-authorizer-enhanced');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-sns');
jest.mock('@aws-sdk/client-cloudwatch');

describe('Enhanced API Key Authorizer', () => {
  let mockDynamoDBSend;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Setup mocks
    mockDynamoDBSend = jest.fn();
    DynamoDBDocumentClient.from = jest.fn(() => ({
      send: mockDynamoDBSend
    }));

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Set environment variables
    process.env.TABLE_NAME = 'test-api-keys-table';
    process.env.API_USAGE_TABLE = 'test-api-usage-table';
    process.env.ENVIRONMENT = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Authorization Flow', () => {
    test('should authorize valid API key and track usage synchronously', async () => {
      // Mock successful API key lookup
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 100,
        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const mockUserKeys = [mockApiKey];

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] }) // API key lookup
        .mockResolvedValueOnce({ Items: mockUserKeys }) // User keys lookup
        .mockResolvedValue({}); // Usage updates (fire-and-forget)

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      const result = await handler(event);

      // Verify authorization succeeded
      expect(result).toMatchObject({
        principalId: 'test@example.com',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: expect.stringContaining('arn:aws:execute-api')
          }]
        },
        context: {
          apiKeyId: 'key123',
          userEmail: 'test@example.com',
          keyName: 'Test Key',
          usageCount: '101', // Should increment
          usageLimit: '10000',
          remainingCalls: '9899'
        }
      });

      // Verify usage tracking was initiated (but not awaited)
      const updateCalls = mockDynamoDBSend.mock.calls.filter(
        call => call[0] instanceof UpdateCommand
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    test('should deny request when API key is missing', async () => {
      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {}
      };

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    test('should deny request when API key is invalid', async () => {
      mockDynamoDBSend.mockResolvedValueOnce({ Items: [] }); // No key found

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'invalid-key'
        }
      };

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    test('should deny request when usage limit exceeded', async () => {
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 9999,
        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const mockUserKeys = [mockApiKey];

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValueOnce({ Items: mockUserKeys });

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      await expect(handler(event)).rejects.toThrow('Unauthorized');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded usage limit')
      );
    });

    test('should reset usage when 30-day window expires', async () => {
      const expiredResetDate = new Date(Date.now() - 1000).toISOString(); // Expired
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 5000,
        usageResetDate: expiredResetDate
      };

      const mockUserKeys = [mockApiKey];

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValueOnce({ Items: mockUserKeys })
        .mockResolvedValue({}); // Reset and usage updates

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      const result = await handler(event);

      // Verify authorization succeeded after reset
      expect(result.context.usageCount).toBe('1'); // Reset to 0, then incremented
      expect(result.context.remainingCalls).toBe('9999');

      // Verify reset was performed
      const updateCalls = mockDynamoDBSend.mock.calls.filter(
        call => call[0] instanceof UpdateCommand
      );
      const resetCall = updateCalls.find(call => 
        call[0].input.UpdateExpression.includes('usageCount = :zero')
      );
      expect(resetCall).toBeDefined();
    });
  });

  describe('Non-blocking Usage Tracking', () => {
    test('should not block authorization if usage tracking fails', async () => {
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 100,
        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockRejectedValue(new Error('DynamoDB error')); // Usage update fails

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      // Should still authorize successfully
      const result = await handler(event);
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was logged but didn't fail the request
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update usage'),
        expect.any(Error)
      );
    });

    test('should handle multiple concurrent requests efficiently', async () => {
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 100,
        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockDynamoDBSend
        .mockResolvedValue({ Items: [mockApiKey] })
        .mockResolvedValue({}); // All updates succeed

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      // Send multiple concurrent requests
      const requests = Array(5).fill(null).map(() => handler(event));
      const results = await Promise.all(requests);

      // All should succeed
      results.forEach(result => {
        expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      });

      // Usage updates should be initiated for all requests
      const updateCalls = mockDynamoDBSend.mock.calls.filter(
        call => call[0] instanceof UpdateCommand
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing usage table gracefully', async () => {
      delete process.env.API_USAGE_TABLE;
      
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active',
        usageCount: 100,
        usageResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValueOnce({ Items: [mockApiKey] });

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      // Should still authorize
      const result = await handler(event);
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    });

    test('should handle API key with no usage data', async () => {
      const mockApiKey = {
        id: 'key123',
        userEmail: 'test@example.com',
        name: 'Test Key',
        hashedKey: 'hashed123',
        status: 'active'
        // No usageCount or usageResetDate
      };

      mockDynamoDBSend
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValueOnce({ Items: [mockApiKey] })
        .mockResolvedValue({});

      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/deadlines',
        headers: {
          'x-api-key': 'test-api-key-123'
        }
      };

      const result = await handler(event);
      expect(result.context.usageCount).toBe('1');
      expect(result.context.remainingCalls).toBe('9999');
    });
  });
});