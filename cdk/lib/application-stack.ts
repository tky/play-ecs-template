import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr"
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns"
import * as cdk from "aws-cdk-lib"
import { Construct } from 'constructs';
import { FargatePlatformVersion } from 'aws-cdk-lib/aws-ecs'
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { EnableExecuteCommand } from './command';

interface ApplicationProps extends StackProps {
  vpc: ec2.IVpc
  internalSecurityGroup: ec2.SecurityGroup
  containerSubnets: ec2.ISubnet[]
  containerSecurityGroup: ec2.SecurityGroup
}


export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationProps) {
    super(scope, id, props);

    const vpc = props.vpc;
    const subnets = props.containerSubnets;

    const sg = props.internalSecurityGroup;

    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      loadBalancerName: "application-internal-elb",
      vpc,
      securityGroup: sg,
      internetFacing: false,
      vpcSubnets: {
        subnets
      }
    });

    const cluster = new ecs.Cluster(this, "cluster", {
      vpc,
      clusterName: 'application-internal-container'
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "taskDefinition", {
      family: 'application-internal-task',
      cpu: 512,
      memoryLimitMiB: 1024
    });

    const logGroup = new LogGroup(this, "LogGroupPlayEcsTemplate", {
      logGroupName: "/play-ecs-template",
      removalPolicy: RemovalPolicy.DESTROY
    });

    taskDefinition.addContainer("ApplicationContainer", {
      containerName: "application",
      image: ecs.ContainerImage.fromEcrRepository(
        ecr.Repository.fromRepositoryName(this, "sample", 'sample')),
        portMappings: [
          {
            protocol: ecs.Protocol.TCP,
            containerPort: 80
          }
        ],
        logging: new ecs.AwsLogDriver({ streamPrefix: 'application', logGroup }),
    });

    const containerSg = props.containerSecurityGroup;

    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "service", {
      serviceName: "application-service",
      cluster,
      loadBalancer,
      taskDefinition,
      desiredCount: 1,
      minHealthyPercent:100,
      maxHealthyPercent: 200,
      assignPublicIp: false,
      publicLoadBalancer: false,
      taskSubnets: { subnets },
      securityGroups: [containerSg],
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
