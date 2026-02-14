const { Kafka } = require("kafkajs");
const db = require("./db");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
const topic = process.env.KAFKA_TOPIC || "items-events";
const groupId = process.env.KAFKA_GROUP_ID || "read-service-group";

const kafka = new Kafka({
  clientId: "read-service",
  brokers,
});

const consumer = kafka.consumer({ groupId });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log("📝 Read-service Kafka consumer started");

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      switch (event.eventType) {
        case "ITEM_CREATED":
          db.run(
            "INSERT INTO items (name, quantity) VALUES (?, ?)",
            [event.payload.name, event.payload.quantity]
          );
          break;

        case "ITEM_UPDATED":
          db.run(
            "UPDATE items SET name = ?, quantity = ? WHERE id = ?",
            [event.payload.name, event.payload.quantity, event.payload.id]
          );
          break;

        case "ITEM_DELETED":
          db.run("DELETE FROM items WHERE id = ?", [event.payload.id]);
          break;
      }
    },
  });
}

async function startConsumerWithRetry(maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runConsumer();
      return;
    } catch (error) {
      const retriable = error?.retriable ||
        error?.type === "UNKNOWN_TOPIC_OR_PARTITION" ||
        error?.name === "KafkaJSProtocolError";

      console.error(`Kafka consumer start failed (attempt ${attempt}/${maxAttempts})`, error.message || error);

      if (!retriable || attempt === maxAttempts) {
        process.exitCode = 1;
        throw error;
      }

      await sleep(2000);
    }
  }
}

consumer.on(consumer.events.CRASH, async (event) => {
  console.error("Read-service consumer crashed:", event.payload?.error?.message || event.payload?.error);
});

startConsumerWithRetry().catch((error) => {
  console.error("Read-service consumer failed to start", error);
});
