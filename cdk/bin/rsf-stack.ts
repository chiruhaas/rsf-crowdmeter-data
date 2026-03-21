#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { RsfStackStack } from '../lib/rsf-stack-stack';

const app = new cdk.App();

const keyName = app.node.tryGetContext('keyName');
const densityToken = app.node.tryGetContext('densityToken');

if (!keyName || !densityToken) {
  throw new Error('Required context: --context keyName=<key> --context densityToken=<token>');
}

new RsfStackStack(app, 'rsf-stack', {
  keyName,
  densityToken,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});
