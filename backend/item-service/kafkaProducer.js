const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
const topic = process.env.KAFKA_TOPIC || "items-events";

const kafka = new Kafka({
  clientId: "item-service",
  brokers,
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

  const topic = process.env.KAFKA_TOPIC || "items-events";
  await producer.send({
    topic,
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
