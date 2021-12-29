import { Stack, StackProps } from 'aws-cdk-lib';
import * as ecr from "aws-cdk-lib/aws-ecr";
import { Construct } from 'constructs';

interface EcrProps extends StackProps {
}

export class EcrStack extends Stack {

  constructor(scope: Construct, id: string, props: EcrProps) {
    super(scope, id, props);

    new ecr.Repository(this, 'RepositorySample', {
      repositoryName: 'sample',
      lifecycleRules: [
        {
          rulePriority: 1,
          description: 'remove old images',
          maxImageCount: 5
        }
      ]
    });

    new ecr.Repository(this, 'RepositoryNginx', {
      repositoryName: 'nginx',
      lifecycleRules: [
        {
          rulePriority: 1,
          description: 'remove old images',
          maxImageCount: 5
        }
      ]
    });
  }
}
