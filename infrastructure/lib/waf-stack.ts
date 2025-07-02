import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface WafStackProps extends cdk.StackProps {
  apiArn: string;
  environment: string;
}

export class WafStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    // Create IP rate limiting rule for all endpoints
    const rateLimitRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'RateLimitRule',
      priority: 1,
      statement: {
        rateBasedStatement: {
          limit: 2000, // 2000 requests per 5 minutes per IP
          aggregateKeyType: 'IP',
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 429,
            customResponseBodyKey: 'rateLimitExceeded',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
      },
    };

    // Strict rate limiting for public auth endpoints (prevent credential stuffing)
    const authEndpointRateLimit: wafv2.CfnWebACL.RuleProperty = {
      name: 'AuthEndpointRateLimit',
      priority: 2,
      statement: {
        rateBasedStatement: {
          limit: 100, // Only 100 requests per 5 minutes per IP (across all endpoints)
          aggregateKeyType: 'IP',
          scopeDownStatement: {
            byteMatchStatement: {
              searchString: '/v1/auth/',
              fieldToMatch: {
                uriPath: {},
              },
              textTransformations: [{
                priority: 0,
                type: 'NONE',
              }],
              positionalConstraint: 'CONTAINS',
            },
          },
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 429,
            customResponseBodyKey: 'authRateLimitExceeded',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AuthEndpointRateLimit',
      },
    };

    // Health check endpoint rate limit (prevent abuse)
    const healthCheckRateLimit: wafv2.CfnWebACL.RuleProperty = {
      name: 'HealthCheckRateLimit',
      priority: 3,
      statement: {
        rateBasedStatement: {
          limit: 300, // 300 requests per 5 minutes per IP
          aggregateKeyType: 'IP',
          scopeDownStatement: {
            byteMatchStatement: {
              searchString: '/health',
              fieldToMatch: {
                uriPath: {},
              },
              textTransformations: [{
                priority: 0,
                type: 'NONE',
              }],
              positionalConstraint: 'EXACTLY',
            },
          },
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 429,
            customResponseBodyKey: 'healthRateLimitExceeded',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'HealthCheckRateLimit',
      },
    };

    // Geo-blocking rule (optional - can be customized)
    const geoBlockingRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'GeoBlockingRule',
      priority: 4,
      statement: {
        notStatement: {
          statement: {
            geoMatchStatement: {
              // Allow only from specific countries (customize as needed)
              countryCodes: ['AU', 'NZ', 'SG', 'US', 'GB', 'CA', 'IN'],
            },
          },
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 403,
            customResponseBodyKey: 'geoBlocked',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'GeoBlockingRule',
      },
    };

    // SQL injection rule
    const sqlInjectionRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'SQLInjectionRule',
      priority: 5,
      statement: {
        orStatement: {
          statements: [
            {
              sqliMatchStatement: {
                fieldToMatch: {
                  body: {
                    oversizeHandling: 'CONTINUE',
                  },
                },
                textTransformations: [{
                  priority: 0,
                  type: 'URL_DECODE',
                }, {
                  priority: 1,
                  type: 'HTML_ENTITY_DECODE',
                }],
              },
            },
            {
              sqliMatchStatement: {
                fieldToMatch: {
                  queryString: {},
                },
                textTransformations: [{
                  priority: 0,
                  type: 'URL_DECODE',
                }, {
                  priority: 1,
                  type: 'HTML_ENTITY_DECODE',
                }],
              },
            },
          ],
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 403,
            customResponseBodyKey: 'sqlInjectionDetected',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'SQLInjectionRule',
      },
    };

    // XSS (Cross-site scripting) rule
    const xssRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'XSSRule',
      priority: 6,
      statement: {
        orStatement: {
          statements: [
            {
              xssMatchStatement: {
                fieldToMatch: {
                  body: {
                    oversizeHandling: 'CONTINUE',
                  },
                },
                textTransformations: [{
                  priority: 0,
                  type: 'URL_DECODE',
                }, {
                  priority: 1,
                  type: 'HTML_ENTITY_DECODE',
                }],
              },
            },
            {
              xssMatchStatement: {
                fieldToMatch: {
                  queryString: {},
                },
                textTransformations: [{
                  priority: 0,
                  type: 'URL_DECODE',
                }, {
                  priority: 1,
                  type: 'HTML_ENTITY_DECODE',
                }],
              },
            },
          ],
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 403,
            customResponseBodyKey: 'xssDetected',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'XSSRule',
      },
    };

    // Size constraint rule
    const sizeConstraintRule: wafv2.CfnWebACL.RuleProperty = {
      name: 'SizeConstraintRule',
      priority: 7,
      statement: {
        orStatement: {
          statements: [
            {
              sizeConstraintStatement: {
                fieldToMatch: {
                  body: {
                    oversizeHandling: 'MATCH',
                  },
                },
                comparisonOperator: 'GT',
                size: 8192, // 8KB limit for body
                textTransformations: [{
                  priority: 0,
                  type: 'NONE',
                }],
              },
            },
            {
              sizeConstraintStatement: {
                fieldToMatch: {
                  queryString: {},
                },
                comparisonOperator: 'GT',
                size: 1024, // 1KB limit for query string
                textTransformations: [{
                  priority: 0,
                  type: 'NONE',
                }],
              },
            },
          ],
        },
      },
      action: {
        block: {
          customResponse: {
            responseCode: 413,
            customResponseBodyKey: 'requestTooLarge',
          },
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'SizeConstraintRule',
      },
    };

    // AWS Managed Rules - Core Rule Set
    const awsManagedCoreRuleSet: wafv2.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 10,
      overrideAction: {
        none: {},
      },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          excludedRules: [
            // Exclude rules that might cause false positives
            { name: 'SizeRestrictions_BODY' },
            { name: 'GenericRFI_BODY' },
          ],
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesCommonRuleSetMetric',
      },
    };

    // AWS Managed Rules - Known Bad Inputs
    const awsManagedKnownBadInputsRuleSet: wafv2.CfnWebACL.RuleProperty = {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 20,
      overrideAction: {
        none: {},
      },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
      },
    };

    // Create custom response bodies
    const customResponseBodies: { [key: string]: wafv2.CfnWebACL.CustomResponseBodyProperty } = {
      rateLimitExceeded: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Too many requests from your IP address. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        }),
      },
      geoBlocked: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Access denied from your location.',
          code: 'GEO_BLOCKED',
        }),
      },
      sqlInjectionDetected: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Invalid request detected.',
          code: 'INVALID_REQUEST',
        }),
      },
      xssDetected: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Invalid request detected.',
          code: 'INVALID_REQUEST',
        }),
      },
      requestTooLarge: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Request size exceeds limit.',
          code: 'REQUEST_TOO_LARGE',
        }),
      },
      authRateLimitExceeded: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Too many authentication attempts from your IP address. Please try again later.',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
        }),
      },
      healthRateLimitExceeded: {
        contentType: 'APPLICATION_JSON',
        content: JSON.stringify({
          error: 'Too many health check requests from your IP address.',
          code: 'HEALTH_RATE_LIMIT_EXCEEDED',
        }),
      },
    };

    // Create Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      scope: 'REGIONAL',
      defaultAction: {
        allow: {},
      },
      name: `complical-waf-${props.environment}`,
      description: 'WAF rules for CompliCal API',
      rules: [
        rateLimitRule,
        authEndpointRateLimit,
        healthCheckRateLimit,
        geoBlockingRule,
        sqlInjectionRule,
        xssRule,
        sizeConstraintRule,
        awsManagedCoreRuleSet,
        awsManagedKnownBadInputsRuleSet,
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `complical-waf-${props.environment}`,
      },
      customResponseBodies,
    });

    // Associate WAF with API Gateway
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: props.apiArn,
      webAclArn: this.webAcl.attrArn,
    });

    // Output WAF ARN
    new cdk.CfnOutput(this, 'WafArn', {
      value: this.webAcl.attrArn,
      description: 'ARN of the WAF Web ACL',
    });
  }
}