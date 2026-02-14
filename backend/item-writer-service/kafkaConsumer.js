const { Kafka } = require("kafkajs");
const db = require("./db");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);
const topic = process.env.KAFKA_TOPIC || "items-events";
const groupId = process.env.KAFKA_GROUP_ID || "item-writer-group";

const kafka = new Kafka({
  clientId: "item-writer",
  brokers,
  retry: {
    retries: 10,
    initialRetryTime: 300,
    maxRetryTime: 10000,
  },
});

const consumer = kafka.consumer({ groupId });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let isStarting = false;

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log("📝 Item Writer Service started");

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
        error?.type === "GROUP_COORDINATOR_NOT_AVAILABLE" ||
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

async function ensureConsumerRunning() {
  if (isStarting) return;
  isStarting = true;
  try {
    await startConsumerWithRetry();
  } finally {
    isStarting = false;
  }
}

consumer.on(consumer.events.CRASH, async (event) => {
  const error = event.payload?.error;
  console.error("Item-writer consumer crashed:", error?.message || error);

  if (error?.retriable) {
    console.error("Item-writer consumer crash was retriable - restarting");
    await sleep(2000);
    ensureConsumerRunning().catch((restartError) =>
      console.error("Item-writer consumer restart failed", restartError)
    );
  }
});

ensureConsumerRunning().catch((error) => {
  console.error("Item-writer consumer failed to start", error);
});
