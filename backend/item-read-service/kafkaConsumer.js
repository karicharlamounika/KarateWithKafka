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

  console.log("📝 Read-service Kafka consumer started");

    await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const { itemId, name, quantity } = event.payload;

      switch (event.eventType) {

        case "ITEM_CREATED": {
          try {
            await db.query(
              "INSERT INTO items (itemId, name, quantity) VALUES ($1, $2, $3) ON CONFLICT (itemId) DO NOTHING",
              [itemId, name, quantity]
            );
            console.log(`✅ READ: ITEM_CREATED ${itemId}`);
          } catch (error) {
            console.error(`❌ READ: ITEM_CREATED failed ${itemId}`, error.message);
          }
          break;
        }

        case "ITEM_UPDATED": {
          try {
            await db.query(
              "UPDATE items SET name = $1, quantity = $2 WHERE itemId = $3",
              [name, quantity, itemId]
            );
            console.log(`✅ READ: ITEM_UPDATED ${itemId}`);
          } catch (error) {
            console.error(`❌ READ: ITEM_UPDATED failed ${itemId}`, error.message);
          }
          break;
        }

        case "ITEM_DELETED": {
          try {
            await db.query(
              "DELETE FROM items WHERE itemId = $1",
              [itemId]
            );
            console.log(`✅ READ: ITEM_DELETED ${itemId}`);
          } catch (error) {
            console.error(`❌ READ: ITEM_DELETED failed ${itemId}`, error.message);
          }
          break;
        }

        default:
          console.warn(`⚠️ READ: Unknown event type: ${event.eventType}`);
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
  console.error("Read-service consumer crashed:", error?.message || error);

  if (error?.retriable) {
    console.error("Read-service consumer crash was retriable - restarting");
    await sleep(2000);
    ensureConsumerRunning().catch((restartError) =>
      console.error("Read-service consumer restart failed", restartError)
    );
  }
});

ensureConsumerRunning().catch((error) => {
  console.error("Read-service consumer failed to start", error);
});
