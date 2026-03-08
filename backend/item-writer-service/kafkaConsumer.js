const { Kafka } = require("kafkajs");
const itemsDb = require("./db");
const jobStatusDb = require("./jobStatusDb");

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
      const { itemId, correlationId, name, quantity, userId } = event.payload;
      console.log(`📨 Received event: ${event.eventType} correlationId: ${event.payload.correlationId}`);

      switch (event.eventType) {

        case "ITEM_CREATED": {
          try {
            console.log(`📨 Received event: making it as processing correlationId: ${event.payload.correlationId}`);
            // ✅ Mark PROCESSING
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'PROCESSING', updated_at = NOW() WHERE correlation_id = $1",
              [correlationId]
            );
            await itemsDb.query(
              "INSERT INTO items (itemId, name, quantity) VALUES ($1, $2, $3) ON CONFLICT (itemId) DO NOTHING",
              [itemId, name, quantity]
            );

            // ✅ Mark COMPLETED
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'COMPLETED', updated_at = NOW() WHERE correlation_id = $1",
              [correlationId]
            );

            console.log(`✅ ITEM_CREATED: ${itemId}`);
          } catch (error) {
            console.error(`❌ ITEM_CREATED failed: ${itemId}`, error.message);
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE correlation_id = $2",
              [error.message, correlationId]
            );
          }
          break;
        }

        case "ITEM_UPDATED": {
  try {
    // ✅ Mark PROCESSING
    await jobStatusDb.query(
      "UPDATE job_status SET status = 'PROCESSING', updated_at = NOW() WHERE correlation_id = $1",
      [correlationId]
    );

    // ✅ Check rowCount — item might not exist
    const result = await itemsDb.query(
      "UPDATE items SET name = $1, quantity = $2 WHERE item_id = $3",
      [name, quantity, itemId]
    );

    if (result.rowCount === 0) {
      // ❌ Item not found — mark FAILED
      await jobStatusDb.query(
        "UPDATE job_status SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE correlation_id = $2",
        [`Item not found: ${itemId}`, correlationId]
      );
      console.error(`❌ ITEM_UPDATED: item not found ${itemId}`);
      break;
    }

    // ✅ Mark COMPLETED only if item was actually updated
    await jobStatusDb.query(
      "UPDATE job_status SET status = 'COMPLETED', updated_at = NOW() WHERE correlation_id = $1",
      [correlationId]
    );

    console.log(`✅ ITEM_UPDATED: ${itemId}`);
  } catch (error) {
    console.error(`❌ ITEM_UPDATED failed: ${itemId}`, error.message);
    await jobStatusDb.query(
      "UPDATE job_status SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE correlation_id = $2",
      [error.message, correlationId]
    );
  }
          break;
        }

        case "ITEM_DELETED": {
          try {
            // ✅ Mark PROCESSING
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'PROCESSING', updated_at = NOW() WHERE correlation_id = $1",
              [correlationId]
            );
            await itemsDb.query(
              "DELETE FROM items WHERE itemId = $1",
              [itemId]
            );

            // ✅ Mark COMPLETED
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'COMPLETED', updated_at = NOW() WHERE correlation_id = $1",
              [correlationId]
            );

            console.log(`✅ ITEM_DELETED: ${itemId}`);
          } catch (error) {
            console.error(`❌ ITEM_DELETED failed: ${itemId}`, error.message);
            await jobStatusDb.query(
              "UPDATE job_status SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE correlation_id = $2",
              [error.message, correlationId]
            );
          }
          break;
        }

        default:
          console.warn(`⚠️ Unknown event type: ${event.eventType}`);
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
