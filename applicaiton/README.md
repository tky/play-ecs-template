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

$ docker image build -f docker/Dockerfile_app_prd -t sample .
