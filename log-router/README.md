# log-router image for the play-ecs-template.


## Create a docker image.

```
$ docker image build -t log-router .
```

## Upload the image to ECR.

```
$ export AWS_ACCOUNT_ID=${YOUR_AWSACCOUNT_ID}
$ docker image tag log-router ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/log-router
$ aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com
$ docker image push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/log-router
```
