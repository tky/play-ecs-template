#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';

const app = new cdk.App();

const env = { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION }

new NetworkStack(app, 'NetworkStack', {
  env,
  vpc: {
    cidr: "10.1.0.0/16",
    maxAzs: 2
  },
 publicIngressSubnets : [
    { cidrBlock: "10.1.2.0/24", name: "public-ingress-1", availabilityZone: "ap-northeast-2a" },
    { cidrBlock: "10.1.3.0/24", name: "public-ingress-2", availabilityZone: "ap-northeast-2b" },
  ],
});
