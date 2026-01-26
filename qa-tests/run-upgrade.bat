@echo off
cd /d "d:\Karate With Kafka\qa-tests"
"D:\apache-maven-3.9.9\bin\mvn.cmd" org.openrewrite.maven:rewrite-maven-plugin:5.47.3:run -DactiveRecipe=JavaMigrationToJava21 -DrecipeArtifactCoordinates=org.openrewrite.recipe:rewrite-migrate-java:2.31.1 --quiet
