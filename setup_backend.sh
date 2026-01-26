#!/usr/bin/env bash
set -e

echo "Setting up the backend environment..."
cd backend || exit 1
echo "Installing backend dependencies..."
npm install
echo "Starting backend."
nohup npm run start-backend > backend.log 2>&1 &

echo "Waiting for backend to start..."
for i in {1..5}; do
  if curl --fail http://localhost:5000/health; then
    echo "Backend is running!"
    exit 0
  else
    echo "Backend not ready yet. Retrying in 2 seconds..."
    sleep 2
  fi
done
echo "Backend did not start in time."
exit 1