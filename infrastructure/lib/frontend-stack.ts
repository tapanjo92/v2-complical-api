import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // S3 bucket for frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `complical-frontend-${props.environment}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.environment !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // S3 bucket for CloudFront logs
    const logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `complical-frontend-logs-${props.environment}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{
        expiration: cdk.Duration.days(30),
      }],
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
    });

    // Grant CloudFront permission to write logs
    logsBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${logsBucket.bucketArn}/*`],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/*`,
        },
      },
    }));

    // CloudFront Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for CompliCal ${props.environment}`,
    });

    // Grant OAI read permissions to the bucket
    frontendBucket.grantRead(oai);

    // Create or import custom response headers policy with comprehensive security headers
    // We'll always create a new policy to ensure CSP matches the deployed API
    const responseHeadersPolicyId = undefined; // Always create new policy
    
    // If we don't have a policy ID, create the policy
    const responseHeadersPolicy = responseHeadersPolicyId 
      ? cloudfront.ResponseHeadersPolicy.fromResponseHeadersPolicyId(this, 'SecurityHeadersPolicy', responseHeadersPolicyId)
      : new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
          responseHeadersPolicyName: `complical-security-headers-${props.environment}`,
          comment: 'Security headers for CompliCal frontend',
          securityHeadersBehavior: {
            contentTypeOptions: {
              override: true,
            },
            frameOptions: {
              frameOption: cloudfront.HeadersFrameOption.DENY,
              override: true,
            },
            referrerPolicy: {
              referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
              override: true,
            },
            strictTransportSecurity: {
              accessControlMaxAge: cdk.Duration.seconds(63072000), // 2 years
              includeSubdomains: true,
              preload: true,
              override: true,
            },
            xssProtection: {
              protection: true,
              modeBlock: true,
              override: true,
            },
            contentSecurityPolicy: {
              contentSecurityPolicy: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://5jhvtpw59k.execute-api.us-east-1.amazonaws.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;`,
              override: true,
            },
          },
          customHeadersBehavior: {
            customHeaders: [
              {
                header: 'Permissions-Policy',
                value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
                override: true,
              },
              {
                header: 'X-Permitted-Cross-Domain-Policies',
                value: 'none',
                override: true,
              },
              {
                header: 'X-DNS-Prefetch-Control',
                value: 'off',
                override: true,
              },
              {
                header: 'Expect-CT',
                value: 'max-age=86400, enforce',
                override: true,
              },
              {
                header: 'Cache-Control',
                value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                override: true,
              },
            ],
          },
        });

    // CloudFront distribution with security headers
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(frontendBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        // Use our custom security headers policy
        responseHeadersPolicy: responseHeadersPolicy,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responsePagePath: '/index.html',
          responseHttpStatus: 200,
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // Temporarily disable logging due to ACL issues
      // logBucket: logsBucket,
      // logFilePrefix: 'cloudfront-logs/',
    });

    this.distributionDomainName = distribution.distributionDomainName;

    // Deploy frontend files to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 bucket name',
    });
  }
}