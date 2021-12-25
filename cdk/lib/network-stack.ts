import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from 'constructs';


interface NetworkProps extends StackProps {
  vpc: { cidr: string, maxAzs: number }
  publicIngressSubnets: { cidrBlock: string, name: string, availabilityZone: string}[]
}

export class NetworkStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly publicIngressSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "vpc", {
      cidr: props.vpc.cidr,
      maxAzs: props.vpc.maxAzs,
      subnetConfiguration: []
    });
    this.vpc = vpc;

    const ingressRouteTable = new ec2.CfnRouteTable(this, 'routeIngress', {
      vpcId: vpc.vpcId,
      tags: [
        {
          "key": "Name",
          "value": "route-ingress"
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
  }
}
