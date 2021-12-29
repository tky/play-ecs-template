lazy val root = (project in file("."))
  .enablePlugins(PlayScala)
  .settings(
    name := """sample""",
    organization := "org.tky",
    version := "1.0-SNAPSHOT",
    scalaVersion := "2.13.6",
    libraryDependencies ++= Seq(
      guice,
      "io.lemonlabs" %% "scala-uri" % "3.5.0",
      "org.scalatestplus.play" %% "scalatestplus-play" % "5.0.0" % Test,
      "org.mockito" % "mockito-core" % "4.0.0" % Test,
      evolutions % Test
    ),
    scalacOptions ++= Seq(
      "-feature",
      "-deprecation",
      "-Xfatal-warnings"
    )
  )

TwirlKeys.templateImports += "presentation.CallOps.CallOps"
TwirlKeys.templateImports += "presentation._"

Test / javaOptions += "-Dconfig.file=conf/test.conf"

Universal / packageName  := "sample"
