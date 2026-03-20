import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface RsfStackStackProps extends cdk.StackProps {
  /**
   * Name of existing EC2 KeyPair
   */
  readonly keyName: string;
  /**
   * Density API Token
   */
  readonly densityToken: string;
  /**
   * @default 'https://github.com/chiruhaas/rsf-crowdmeter-data.git'
   */
  readonly repoUrl?: string;
}

/**
 * RSF Crowd Meter Data Collector
 */
export class RsfStackStack extends cdk.Stack {
  /**
   * Public IP of EC2 instance
   */
  public readonly instancePublicIp;

  public constructor(scope: cdk.App, id: string, props: RsfStackStackProps) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      keyName: new cdk.CfnParameter(this, 'KeyName', {
        type: 'AWS::EC2::KeyPair::KeyName',
        default: props.keyName.toString(),
        description: 'Name of existing EC2 KeyPair',
      }).valueAsString,
      repoUrl: props.repoUrl ?? 'https://github.com/chiruhaas/rsf-crowdmeter-data.git',
    };

    // Resources
    const instanceSecurityGroup = new ec2.CfnSecurityGroup(this, 'InstanceSecurityGroup', {
      groupDescription: 'Allow SSH access',
      securityGroupIngress: [
        {
          ipProtocol: 'tcp',
          fromPort: 22,
          toPort: 22,
          cidrIp: '0.0.0.0/0',
        },
      ],
    });

    const rsfInstance = new ec2.CfnInstance(this, 'RSFInstance', {
      instanceType: 't3.micro',
      keyName: props.keyName!,
      imageId: 'ami-0d76b909de1a0595d',
      securityGroupIds: [
        instanceSecurityGroup.ref,
      ],
      userData: cdk.Fn.base64(`#!/bin/bash
      set -ex

      # install dependencies
      apt update -y
      apt install -y curl git cron

      # install build tools
      apt-get install -y build-essential python3 make g++

      # install Node.js (LTS)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      apt-get install -y nodejs

      # start cron
      systemctl enable cron
      systemctl start cron

      cd /home/ubuntu

      # clone repo
      git clone ${props.repoUrl!}
      REPO_NAME=$(basename ${props.repoUrl!} .git)

      cd $REPO_NAME/backend

      # install + build
      npm install
      npm run build

      # set env variable
      echo "DensityToken=${props.densityToken!}" >> .env

      # find node path (important for cron)
      NODE_PATH=$(which node)

      # create cron jobs
      cat <<EOF > mycron
      "* 7-23 * * 1-5 $NODE_PATH /home/ubuntu/$REPO_NAME/backend/dist/main.js >> /home/ubuntu/log.txt 2>&1"
      "* 8-18 * * 6   $NODE_PATH /home/ubuntu/$REPO_NAME/backend/dist/main.js >> /home/ubuntu/log.txt 2>&1"
      "* 8-23 * * 0   $NODE_PATH /home/ubuntu/$REPO_NAME/backend/dist/main.js >> /home/ubuntu/log.txt 2>&1"
      EOF

      # install cron jobs
      crontab mycron

      # log completion
      echo "Setup complete" >> /home/ubuntu/setup.log
      `),
    });

    // Outputs
    this.instancePublicIp = rsfInstance.attrPublicIp;
    new cdk.CfnOutput(this, 'CfnOutputInstancePublicIP', {
      key: 'InstancePublicIP',
      description: 'Public IP of EC2 instance',
      value: this.instancePublicIp!.toString(),
    });
  }
}
