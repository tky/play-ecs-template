import { Stack, StackProps } from 'aws-cdk-lib';
import * as cdk from "aws-cdk-lib"
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import { FirelensLogRouterType } from "aws-cdk-lib/aws-ecs";
import { Construct } from 'constructs';
import { FargatePlatformVersion } from 'aws-cdk-lib/aws-ecs';
import { EnableExecuteCommand } from './command';

interface FrontStackProps extends StackProps {
  vpc: ec2.IVpc;
  ingressSubnets: ec2.ISubnet[];
  ingressSecurityGroup: ec2.SecurityGroup;
  fluentbitConfigFile: string
}

export class FrontStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    const subnets = props.ingressSubnets;
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      loadBalancerName: "front-elb",
      vpc,
      securityGroup: props.ingressSecurityGroup,
      internetFacing: true,
      vpcSubnets: {
        subnets
      }
    });

    const cluster = new ecs.Cluster(this, "cluster", {
      vpc,
      clusterName: 'front-container'
    });


    const ecsTaskExecutionRole = new iam.Role(this, "ecsTaskExecutionRole", {
      roleName: "play-ecs-template-ecs-task-execution-role",
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"),
        // For FireLens
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonKinesisFirehoseFullAccess"),
      ]
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "taskDefinition", {
      family: 'front-task',
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole: ecsTaskExecutionRole,
      taskRole: ecsTaskExecutionRole
    });

    taskDefinition.addContainer("nginxContainer", {
      containerName: "nginx",
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, 'nginx', 'nginx')),
      portMappings: [
        {
          protocol: ecs.Protocol.TCP,
          containerPort: 80
        }
      ],
      essential: true,
      // logging: ecs.LogDrivers.firelens({})
      logging: new ecs.AwsLogDriver({ streamPrefix: 'nginx' })
    });

    /*
    taskDefinition.addFirelensLogRouter('firelensLogRouter', {
      firelensConfig: {
        type: FirelensLogRouterType.FLUENTBIT,
        options: {
          configFileValue: props.fluentbitConfigFile
        }
      },
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, 'log-router', 'log-router')),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'firelens' })
    });
    */

    const albSg = new ec2.SecurityGroup(this, "albSg", {
      vpc,
      allowAllOutbound: true
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "service", {
      serviceName: "front-service",
      cluster,
      loadBalancer,
      taskDefinition,
      taskSubnets: { subnets: subnets },
      desiredCount: 1,
      minHealthyPercent:100,
      maxHealthyPercent: 200,
      assignPublicIp: true,
      publicLoadBalancer: true,
      securityGroups: [albSg],
      platformVersion: FargatePlatformVersion.VERSION1_4
    });

    service.targetGroup.configureHealthCheck({
      path: "/health_check",
      interval: cdk.Duration.seconds(30),
      unhealthyThresholdCount: 2,
      port: "80",
    });

    // for ECS Exec
    service.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'ssmmessages:CreateControlChannel',
          'ssmmessages:CreateDataChannel',
          'ssmmessages:OpenControlChannel',
          'ssmmessages:OpenDataChannel',
        ],
        resources: ['*'],
      }),
    );
    cdk.Aspects.of(service).add(new EnableExecuteCommand());

  }
}
