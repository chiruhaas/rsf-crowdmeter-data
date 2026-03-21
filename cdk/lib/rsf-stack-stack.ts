import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface RsfStackStackProps extends cdk.StackProps {
  /** Name of existing EC2 KeyPair */
  readonly keyName: string;
  /** Density API Token */
  readonly densityToken: string;
  /** @default 'https://github.com/chiruhaas/rsf-crowdmeter-data.git' */
  readonly repoUrl?: string;
}

export class RsfStackStack extends cdk.Stack {
  /** Public IP of EC2 instance */
  public readonly instancePublicIp: string;

  public constructor(scope: cdk.App, id: string, props: RsfStackStackProps) {
    super(scope, id, props);

    const repoUrl = props.repoUrl ?? 'https://github.com/chiruhaas/rsf-crowdmeter-data.git';

    // VPC: EC2 in public subnet, RDS in isolated (no NAT gateway needed)
    const vpc = new ec2.Vpc(this, 'RsfVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public',   subnetType: ec2.SubnetType.PUBLIC           },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    // EC2 security group: inbound SSH only, outbound unrestricted
    const ec2Sg = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: 'EC2 - allow SSH',
      allowAllOutbound: true,
    });
    ec2Sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH');

    // RDS security group: only accepts postgres from EC2
    const rdsSg = new ec2.SecurityGroup(this, 'RdsSg', {
      vpc,
      description: 'RDS - allow postgres from EC2',
      allowAllOutbound: false,
    });
    rdsSg.addIngressRule(ec2Sg, ec2.Port.tcp(5432), 'Postgres from EC2');

    // RDS instance — credentials auto-generated and stored in Secrets Manager
    const db = new rds.DatabaseInstance(this, 'rsfDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [rdsSg],
      databaseName: 'rsf',
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // IAM role so EC2 can read the DB secret from Secrets Manager
    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    db.secret!.grantRead(instanceRole);

    // EC2 instance
    const rsfInstance = new ec2.Instance(this, 'RSFInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.genericLinux({
        'us-east-1': 'ami-0462ececcfe0a450f',
      }),
      securityGroup: ec2Sg,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', props.keyName),
      role: instanceRole,
    });

    rsfInstance.addUserData(
      'set -ex',

      // Dependencies
      'apt update -y',
      'apt install -y curl git cron jq python3-pip build-essential python3 make g++',
      'pip3 install awscli --break-system-packages',
      'export PATH=$PATH:/root/.local/bin',

      // Node.js
      'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
      'apt-get install -y nodejs',

      // postgresql-client for manual db access
      'apt-get install -y postgresql-client',

      // Cron
      'systemctl enable cron',
      'systemctl start cron',

      // Clone and build
      'cd /home/ubuntu',
      `git clone ${repoUrl}`,
      `REPO_NAME=$(basename ${repoUrl} .git)`,
      'chown -R ubuntu:ubuntu $REPO_NAME',
      'cd $REPO_NAME/backend',
      'npm install',
      'npm run build',

      // Write .env — fetch DB password from Secrets Manager at boot time
      `echo "DensityToken=${props.densityToken}" >> .env`,
      `echo "DB_HOST=${db.dbInstanceEndpointAddress}" >> .env`,
      `SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id '${db.secret!.secretArn}' --query SecretString --output text --region ${this.region})`,
      'echo "DB_PASSWORD=$(echo $SECRET_JSON | jq -r .password)" >> .env',

      // Cron job — run every minute, isRSFOpen() handles hours filtering in PST
      'NODE_PATH=$(which node)',
      `printf "* * * * * \$NODE_PATH /home/ubuntu/\$REPO_NAME/backend/dist/main.js >> /home/ubuntu/log.txt 2>&1\\n" | crontab -`,

      'echo "Setup complete" >> /home/ubuntu/setup.log',
    );

    // Outputs
    this.instancePublicIp = rsfInstance.instancePublicIp;
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      description: 'Public IP of EC2 instance',
      value: this.instancePublicIp,
    });
    new cdk.CfnOutput(this, 'DbEndpoint', {
      description: 'RDS endpoint',
      value: db.dbInstanceEndpointAddress,
    });
  }
}
