#!/usr/bin/env bash
set -e

echo "Setting up the backend environment micro services..."
cd backend || exit 1
echo "Setting up auth-service micro services..."
cd auth-service || exit 1
echo "Installing auth-service dependencies..."
npm install
echo "Starting auth-service."
nohup npm run start-auth-service > backend.log 2>&1 &

echo "Waiting for auth-service to start..."
for i in {1..10}; do
  if curl -fsS http://localhost:4000/health > /dev/null; then
    echo "✅ Auth service is running!"
    break
  else
    echo "⏳ Auth service not ready yet ($i/10). Retrying in 2s..."
    sleep 2
  fi
done

# If loop ended without success, fail
if ! curl -fsS http://localhost:4000/health > /dev/null; then
  echo "❌ Auth service did not start in time."
  exit 1
fi


echo "Setting up item-read-service micro services..."
cd ../item-read-service || exit 1
echo "Installing item-read-service dependencies..."
npm install
echo "Starting item-read-service."
nohup npm run start-item-read-service > backend.log 2>&1 &
sleep 5

echo "Waiting for item-read-service to start..."
for i in {1..10}; do
  if curl -fsS http://localhost:6000/health > /dev/null; then
    echo "✅ Item read service is running!"
    break
  else
    echo "⏳ Item read service not ready yet ($i/10). Retrying in 2s..."
    sleep 2
  fi
done

# If loop ended without success, fail
if ! curl -fsS http://localhost:6000/health > /dev/null; then
  echo "❌ Item read service did not start in time."
  exit 1
fi

KAFKA_BROKERS=localhost:9092 nohup npm run consumer-item-read-service > consumer.log 2>&1 &
CONSUMER_PID=$!

echo "Waiting for Consumer for item-read-service to start..."
readkafkastarted=false

for i in {1..20}; do
  # Check if process crashed
  if ! ps -p $CONSUMER_PID > /dev/null; then
    echo "❌ Consumer for item-read-service process crashed!"
    echo "---- Logs ----"
    cat consumer.log
    exit 1
  fi

  # Check for success log message
  if grep -q "Kafka consumer started" consumer.log; then
    echo "✅ Consumer for item-read-service started successfully (PID: $CONSUMER_PID)"
    readkafkastarted=true
    break
  fi
  sleep 1
done

if [ "$readkafkastarted" = false ]; then
   echo "❌ Consumer for item-read-service did not start within expected time."
   echo "---- Logs ----"
   cat consumer.log
   exit 1
fi



echo "Setting up item-writer-service micro services..."
cd ../item-writer-service || exit 1
echo "Installing item-writer-service dependencies..."
npm install
echo "Starting item-writer-service."
export KAFKA_BROKERS=localhost:9092
nohup npm run start-item-writer-service-consumer > consumer.log 2>&1 &
CONSUMER_PID=$!

echo "Waiting for Consumer for item-writer-service to start..."
writekafkastarted=false

for i in {1..20}; do
  # Check if process crashed
  if ! ps -p $CONSUMER_PID > /dev/null; then
    echo "❌ Consumer for item-writer-service process crashed!"
    echo "---- Logs ----"
    cat consumer.log
    exit 1
  fi

  # Check for success log message
  if grep -q "Kafka consumer started" consumer.log; then
    echo "✅ Consumer for item-writer-service started successfully (PID: $CONSUMER_PID)"
    writekafkastarted=true
    break
  fi

  sleep 1
done

if [ "$writekafkastarted" = false ]; then
   echo "❌ Consumer for item-writer-service did not start within expected time."
   echo "---- Logs ----"
   cat consumer.log
   exit 1
fi

echo "Setting up Item-service micro services..."
cd ../item-service || exit 1
echo "Installing item-service dependencies..."
npm install
echo "Starting item-service."
nohup npm run start-item-service > backend.log 2>&1 &

echo "Waiting for item-service to start..."
for i in {1..10}; do
  if curl -fsS http://localhost:5000/health > /dev/null; then
    echo "✅ Item service is running!"
    break
  else
    echo "⏳ Item service not ready yet ($i/10). Retrying in 2s..."
    sleep 2
  fi
done

# If loop ended without success, fail
if ! curl -fsS http://localhost:5000/health > /dev/null; then
  echo "❌ Item service did not start in time."
  exit 1
fi


echo "Setting up gateway-service micro services..."
cd ../gateway-service || exit 1
echo "Installing gateway-service dependencies..."
npm install
echo "Starting gateway-service."
nohup npm run start-gateway-service > backend.log 2>&1 &

echo "Waiting for gateway-service to start..."
for i in {1..10}; do
  if curl -fsS http://localhost:8080/health > /dev/null; then
    echo "✅ Gateway service is running!"
    break
  else
    echo "⏳ Gateway service not ready yet ($i/10). Retrying in 2s..."
    sleep 2
  fi
done

# If loop ended without success, fail
if ! curl -fsS http://localhost:8080/health > /dev/null; then
  echo "❌ Gateway service did not start in time."
  exit 1
fi

