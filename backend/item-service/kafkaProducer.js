const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "item-service",
  brokers: ["localhost:9092"], // later move to env var
});

const producer = kafka.producer();

let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log("✅ Kafka Producer connected");
  }
}

async function publishEvent(eventType, payload) {
  if (!isConnected) {
    await connectProducer();
  }

  const event = {
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  await producer.send({
    topic: "items-events",
    messages: [
      {
        key: eventType,
        value: JSON.stringify(event),
      },
    ],
  });

  console.log(`📤 Event published: ${eventType}`);
}

module.exports = {
  connectProducer,
  publishEvent,
};
