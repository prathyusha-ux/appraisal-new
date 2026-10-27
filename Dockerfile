# Multi-stage build: compile with Maven, then run on a slim JRE.
# Render has no native Java buildpack — this is why "Docker" must be
# selected as the Language/Environment when creating the Web Service.

# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Downloads dependencies separately so they're cached across builds
# unless pom.xml itself changes — speeds up repeat deploys noticeably.
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Render sets $PORT at runtime (application.properties already reads
# ${PORT:9090}) — no hardcoded EXPOSE needed for Render specifically,
# but included for local `docker run` clarity.
EXPOSE 9090

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
