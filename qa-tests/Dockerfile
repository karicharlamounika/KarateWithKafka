FROM maven:3.9.6-eclipse-temurin-21

WORKDIR /workspace/qa-tests

COPY pom.xml ./
COPY src ./src

RUN mvn -q -DskipTests package

# CRITICAL DEBUG: Show what was actually copied
RUN echo "===========================================" && \
    echo "Files copied to container:" && \
    echo "===========================================" && \
    find src -type f -name "*.feature" && \
    echo "" && \
    echo "karatehelpers directory contents:" && \
    ls -la src/test/java/karatehelpers/ 2>/dev/null || echo "karatehelpers directory NOT FOUND!" && \
    ls -la target/test-classes/karatehelpers/ 2>/dev/null || echo "karatehelpers directory NOT FOUND!" && \
    echo "==========================================="

CMD ["mvn", "test", "-Pdocker"]
