# Sample application 

## Getting started.

Install node deplendency libraries.

```
$ cd ui
$ npm install
```

Run the application.

```
$ sbt run
```

## Create a dockage image.

```
$ docker image build -f docker/Dockerfile_app_prd -t sample .
```

## Upload the image to ECR.

```
$ export AWS_ACCOUNT_ID=${YOUR_AWSACCOUNT_ID}
$ docker image tag sample ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/sample
$ aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com
$ docker image push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-northeast-2.amazonaws.com/sample
```
