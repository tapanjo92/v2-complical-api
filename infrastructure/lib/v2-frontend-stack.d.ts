import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface V2FrontendStackProps extends cdk.StackProps {
    environment: string;
}
export declare class V2FrontendStack extends cdk.Stack {
    readonly distributionDomainName: string;
    readonly distributionId: string;
    readonly bucketName: string;
    constructor(scope: Construct, id: string, props: V2FrontendStackProps);
}
