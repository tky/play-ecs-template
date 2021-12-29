# Nginx image for the play-ecs-template.

## Create a dockage image.

```
$ docker image build -t nginx .
```

## Upload the image to ECR.

```
$ export AWS_ACCOUNT_ID=${YOUR_AWSACCOUNT_ID}
$ docker image tag nginx ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/nginx
$ aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com
$ docker image push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/nginx
```
