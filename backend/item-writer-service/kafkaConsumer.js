const { Kafka } = require("kafkajs");
const db = require("./db");

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",")
  : ["localhost:9092"];

const kafka = new Kafka({
  clientId: "item-writer",
  brokers,
});

const groupId = process.env.KAFKA_GROUP_ID || "item-writer-group";
const consumer = kafka.consumer({ groupId });

async function start() {
  await consumer.connect();
  const topic = process.env.KAFKA_TOPIC || "items-events";
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
            [
              event.payload.name,
              event.payload.quantity,
              event.payload.id,
            ]
          );
          break;

        case "ITEM_DELETED":
          db.run("DELETE FROM items WHERE id = ?", [
            event.payload.id,
          ]);
          break;
      }
    },
  });
}

start().catch(console.error);
