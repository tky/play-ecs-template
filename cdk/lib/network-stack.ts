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
  }
}
