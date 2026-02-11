FROM maven:3.9.6-eclipse-temurin-21

WORKDIR /workspace/qa-tests

COPY pom.xml ./
COPY src ./src

RUN mvn -q -DskipTests package

CMD ["mvn", "test", "-Pdocker"]
