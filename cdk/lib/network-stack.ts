import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';


interface NetworkProps extends StackProps {
  vpc: { cidr: string, maxAzs: number }
  publicIngressSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
  privateContainerSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
  privateDbSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
  privateEgressSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
  publicManageSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
}

export class NetworkStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly publicIngressSubnets: ec2.ISubnet[];
  public readonly privateContainerSubnets: ec2.ISubnet[];
  public readonly privateDbSubnets: ec2.ISubnet[];
  public readonly privateEgressSubnets: ec2.ISubnet[];
  public readonly publicManageSubnets: ec2.ISubnet[];

  public readonly sgPublicIngress: ec2.SecurityGroup;
  public readonly sgManagement: ec2.SecurityGroup;
  public readonly sgBackendContainer: ec2.SecurityGroup;
  public readonly sgFrontContainer: ec2.SecurityGroup;
  public readonly sgInternalLB: ec2.SecurityGroup;
  public readonly sgDb: ec2.SecurityGroup;
  public readonly sgEgress: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      cidr: props.vpc.cidr,
      maxAzs: props.vpc.maxAzs,
      subnetConfiguration: []
    });
    this.vpc = vpc;

    const ingressRouteTable = new ec2.CfnRouteTable(this, 'RouteTablePublicIngress', {
      vpcId: vpc.vpcId,
      tags: [
        {
          "key": "Name",
          "value": "route-public-ingress"
        }
      ],
    });

    const igw = new ec2.CfnInternetGateway(this, 'IntenetGateway', {
    });

    new ec2.CfnVPCGatewayAttachment(this, 'VpcGatewayAttachment', {
      vpcId: vpc.vpcId,
      internetGatewayId: igw.ref
    });

    new ec2.CfnRoute(this, 'RouteIngressDefault', {
      routeTableId: ingressRouteTable.ref,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igw.ref
    });

    this.publicIngressSubnets = props.publicIngressSubnets.map(p => {
      const sub = new ec2.CfnSubnet(this, `${p.name}-cfnsubnet`, {
        cidrBlock: p.cidrBlock,
        vpcId: vpc.vpcId,
        availabilityZone: p.availabilityZone,
        mapPublicIpOnLaunch: true,
        tags: [
          {
            "key": "Name",
            "value": p.name
          },
          {
            "key": "Type",
            "value": "Public"
          }
        ],
      });
      new ec2.CfnSubnetRouteTableAssociation(this, `${p.name}Association`, {
        routeTableId: ingressRouteTable.ref,
        subnetId: sub.ref
      });
      return ec2.Subnet.fromSubnetId(this, p.name, sub.ref);
    });

    const appRouteTable = new ec2.CfnRouteTable(this, 'RouteTablePrivateContainer', {
      vpcId: vpc.vpcId,
      tags: [
        {
          "key": "Name",
          "value": "route-private-container"
        }
      ],
    });

    this.privateContainerSubnets = props.privateContainerSubnets.map(subnet => {
      const sb = new ec2.CfnSubnet(this, `${subnet.name}-cfnsubnet`, {
        cidrBlock: subnet.cidrBlock,
        vpcId: vpc.vpcId,
        availabilityZone: subnet.availabilityZone,
        mapPublicIpOnLaunch: false,
        tags: [
          {
            "key": "Name",
            "value": subnet.name
          },
          {
            "key": "Type",
            "value": "Isolated"
          }
        ],
      });
      new ec2.CfnSubnetRouteTableAssociation(this, `${subnet.name}Association`, {
        routeTableId: appRouteTable.ref,
        subnetId: sb.ref
      });
      return ec2.Subnet.fromSubnetId(this, subnet.name, sb.ref);
    });

    const dbRouteTable = new ec2.CfnRouteTable(this, 'RouteTableDatabase', {
      vpcId: vpc.vpcId,
      tags: [
        {
          "key": "Name",
          "value": "route-private-db"
        }
      ],
    });

    this.privateDbSubnets = props.privateDbSubnets.map(subnet => {
      const sub = new ec2.CfnSubnet(this, `${subnet.name}-cfnsubnet`, {
        cidrBlock: subnet.cidrBlock,
        vpcId: vpc.vpcId,
        availabilityZone: subnet.availabilityZone,
        mapPublicIpOnLaunch: false,
        tags: [
          {
            "key": "Name",
            "value": subnet.name
          },
          {
            "key": "Type",
            "value": "Isolated"
          }
        ],
      });

      new ec2.CfnSubnetRouteTableAssociation(this, `${subnet.name}Association`, {
        routeTableId: dbRouteTable.ref,
        subnetId: sub.ref
      });
      return ec2.Subnet.fromSubnetId(this, subnet.name, sub.ref);
    });

    const egressRouteTable = new ec2.CfnRouteTable(this, 'RouteTablePrivateEgress', {
      vpcId: vpc.vpcId,
      tags: [
        {
          "key": "Name",
          "value": "route-private-egress"
        }
      ],
    });

    this.privateEgressSubnets = props.privateEgressSubnets.map(subnet => {
      const sub =  new ec2.CfnSubnet(this, `${subnet.name}-cfnsubnet`, {
        cidrBlock: subnet.cidrBlock,
        vpcId: vpc.vpcId,
        availabilityZone: subnet.availabilityZone,
        mapPublicIpOnLaunch: false,
        tags: [
          {
            "key": "Name",
            "value": subnet.name
          },
          {
            "key": "Type",
            "value": "Isolated"
          }
        ],
      });
      new ec2.CfnSubnetRouteTableAssociation(this, `${subnet.name}Association`, {
        routeTableId: egressRouteTable.ref,
        subnetId: sub.ref
      });
      return ec2.Subnet.fromSubnetId(this, subnet.name, sub.ref);
    });

    this.publicManageSubnets = props.publicManageSubnets.map(subnet => {
      const sub = new ec2.CfnSubnet(this, `${subnet.name}-cfnsubnet`, {
        cidrBlock: subnet.cidrBlock,
        vpcId: vpc.vpcId,
        availabilityZone: subnet.availabilityZone,
        mapPublicIpOnLaunch: true,
        tags: [
          {
            "key": "Name",
            "value": subnet.name
          },
          {
            "key": "Type",
            "value": "Public"
          }
        ],
      });
      new ec2.CfnSubnetRouteTableAssociation(this, `${subnet.name}Association`, {
        routeTableId: ingressRouteTable.ref,
        subnetId: sub.ref
      });
      return ec2.Subnet.fromSubnetId(this, subnet.name, sub.ref);
    });

    this.sgPublicIngress = new ec2.SecurityGroup(this, 'sgPublicIngress', {
      vpc,
      securityGroupName: "public-ingress",
      description: "Security group of ingress",
      allowAllOutbound: true
    });

    this.sgManagement = new ec2.SecurityGroup(this, 'management', {
      vpc,
      securityGroupName: 'public-management',
      description: "Security Group of public-management",
      allowAllOutbound: true
    });

    this.sgBackendContainer = new ec2.SecurityGroup(this, 'container', {
      vpc,
      securityGroupName: 'private-container',
      description: "Security Group of bakend applications running on containers",
      allowAllOutbound: true
    });

    this.sgFrontContainer = new ec2.SecurityGroup(this, 'front-container', {
      vpc,
      securityGroupName: 'private-front-container',
      description: "Security Group of front container app",
      allowAllOutbound: true
    });

    this.sgInternalLB = new ec2.SecurityGroup(this, 'internal', {
      vpc,
      securityGroupName: 'private-internal',
      description: "Security group for internal load balancer",
      allowAllOutbound: true
    });

    this.sgDb = new ec2.SecurityGroup(this, 'sgDb', {
      vpc,
      description: "Security Group of database",
      securityGroupName: "private-database",
      allowAllOutbound: true
    });

    this.sgEgress = new ec2.SecurityGroup(this, 'sgEgress', {
      vpc,
      description: "Security Group of VPC Endpoint",
      securityGroupName: "private-egress",
      allowAllOutbound: true
    });

    this.sgPublicIngress.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    this.sgPublicIngress.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    this.sgFrontContainer.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgPublicIngress],
    }), ec2.Port.tcp(80), "public load balancer to front containers(nginx)");

    this.sgInternalLB.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgFrontContainer],
    }), ec2.Port.tcp(80), "front containers(nginx) to internal load balancer");

    this.sgBackendContainer.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgInternalLB],
    }), ec2.Port.tcp(80), "internal load balancer to backend containers(app)");

    this.sgDb.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgBackendContainer],
    }), ec2.Port.tcp(5432), "backdnd containers(app) to database(postgres)");

    this.sgDb.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgManagement],
    }), ec2.Port.tcp(5432), "management to database(postgres)");

    this.sgEgress.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgBackendContainer, this.sgFrontContainer],
    }), ec2.Port.tcp(443), "backend containers(app) to egress(vpc endpoint)");

    this.sgEgress.connections.allowFrom(new ec2.Connections({
      securityGroups: [this.sgBackendContainer],
    }), ec2.Port.tcp(587), "backend containers(app) to egress(vpc endpoint, sending email via SES)");

    vpc.addInterfaceEndpoint("ecr-endpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [this.sgEgress],
      subnets: {
        subnets: this.privateEgressSubnets
      }
    });

    vpc.addInterfaceEndpoint("ecr-dkr-endpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [this.sgEgress],
      subnets: {
        subnets: this.privateEgressSubnets
      }
    });

    vpc.addInterfaceEndpoint("secret-manager-endpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [this.sgEgress],
      subnets: {
        subnets: this.privateEgressSubnets
      }
    });

    vpc.addInterfaceEndpoint("logs-endpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [this.sgEgress],
      subnets: {
        subnets: this.privateEgressSubnets
      }
    });

    new ec2.CfnVPCEndpoint(this, 'application-s3-endpoint', {
      serviceName: 'com.amazonaws.'.concat(props.env!.region || "ap-northeast-1").concat('.s3'),
      vpcId: this.vpc.vpcId,
      routeTableIds: [egressRouteTable.ref],
      vpcEndpointType: 'Gateway',
    });
  }
}
