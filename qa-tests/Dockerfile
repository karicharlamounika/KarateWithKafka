FROM maven:3.9.6-eclipse-temurin-21

WORKDIR /workspace/qa-tests

COPY pom.xml ./
COPY src ./src

# Verify files are copied (debug step)
RUN ls -la src/test/java/ && \
    ls -la src/test/java/runners/ && \
    ls -la src/test/resources/features/ || true && \
    ls -la src/test/java/features/

RUN mvn -q -DskipTests package

CMD ["mvn", "test", "-Pdocker"]
