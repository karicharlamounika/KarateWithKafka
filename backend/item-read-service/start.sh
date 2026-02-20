#!/bin/sh
node kafkaConsumer.js &   # run consumer in background
sleep 5          # wait for consumer to start
node server.js       # run server in foreground