import * as cdk from 'aws-cdk-lib';

export function applyTags(app: cdk.App, environment: string) {
  // Apply tags to all resources in all stacks
  cdk.Tags.of(app).add('name', `complical-${environment}`);
  cdk.Tags.of(app).add('environment', environment);
  cdk.Tags.of(app).add('project', 'complical');
  cdk.Tags.of(app).add('managed-by', 'cdk');
  cdk.Tags.of(app).add('owner', 'complical-team');
}