#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { EcrStack } from '../lib/ecr-stack';
import { ApplicationStack } from '../lib/application-stack';

const app = new cdk.App();

const env = { account: process.env.AWS_ACCOUNT_ID, region: "ap-northeast-2" }

const networkStack = new NetworkStack(app, 'NetworkStack', {
  env,
  vpc: {
    cidr: "10.1.0.0/16",
    maxAzs: 2
  },
  publicIngressSubnets : [
    { cidrBlock: "10.1.2.0/24", name: "public-ingress-1", availabilityZone: "ap-northeast-2a" },
    { cidrBlock: "10.1.3.0/24", name: "public-ingress-2", availabilityZone: "ap-northeast-2b" },
  ],
  privateContainerSubnets: [
    { cidrBlock: "10.1.8.0/24", name: "private-container-1", availabilityZone: "ap-northeast-2a" },
    { cidrBlock: "10.1.9.0/24", name: "private-container-2", availabilityZone: "ap-northeast-2b" }
  ],
  privateDbSubnets: [
    { cidrBlock: "10.1.16.0/24", name: "private-db-1", availabilityZone: "ap-northeast-2a" },
    { cidrBlock: "10.1.17.0/24", name: "private-db-2", availabilityZone: "ap-northeast-2b" },
  ],
  privateEgressSubnets: [
    { cidrBlock: "10.1.248.0/24", name: "private-egress-1", availabilityZone: "ap-northeast-2a" },
    { cidrBlock: "10.1.249.0/24", name: "private-egress-2", availabilityZone: "ap-northeast-2b" }
  ],
  publicManageSubnets: [
    { cidrBlock: "10.1.240.0/24", name: "public-management-1", availabilityZone: "ap-northeast-2a" },
  ]
});


new EcrStack(app, 'EcrStack', {
  env
});


new ApplicationStack(app, 'ApplicationStack', {
  env,
  vpc: networkStack.vpc,
  internalSecurityGroup: networkStack.sgInternalLB,
  containerSubnets: networkStack.privateContainerSubnets,
  containerSecurityGroup: networkStack.sgBackendContainer,
});
