const mysql = require("mysql2/promise");

// Create a connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "test",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Function to add a task to the queue
async function addTask(task) {
  const connection = await pool.getConnection();
  try {
    await connection.query("INSERT INTO queue (task) VALUES (?)", [task]);
    console.log("Task added:", task);
  } finally {
    connection.release();
  }
}

// Function to process the queue
async function processQueue() {
  const connection = await pool.getConnection();
  let status = false;
  let task;
  try {
    // Start a transaction
    await connection.beginTransaction();

    // Lock the first pending task
    const [rows] = await connection.query(
      "SELECT * FROM queue WHERE status = ? ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
      ["pending"]
    );
    if (rows.length === 0) {
      console.log("No pending tasks");
      await connection.commit();
      return;
    }

    task = rows[0];
    console.log("Processing task:", task.task);

    // Mark the task as processing
    await connection.query("UPDATE queue SET status = ? WHERE id = ?", [
      "processing",
      task.id,
    ]);

    // Simulate task processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (task.task === "Task 2") {
      throw new Error("Task 2 failed");
    }

    // Mark the task as completed
    await connection.query("UPDATE queue SET status = ? WHERE id = ?", [
      "completed",
      task.id,
    ]);

    // Commit the transaction
    await connection.commit();
    console.log("Task completed:", task.task);
    status = true;
    return;
  } catch (error) {
    await connection.rollback();
    updateError(error, task, connection);
    console.error("Error processing task:", error);
    status = true;
    return;
  } finally {
    connection.release();
    return status;
  }
}

function updateError(error, task, connection) {
  return new Promise(async (res, rej) => {
    try {
      await connection.query(
        "UPDATE queue SET status = ?, reason_error = ?  WHERE id = ?",
        ["error", error.message, task.id]
      );
      return res();
    } catch (err) {
      console.error("Error updating error status:", err);
      return res();
    }
  });
}

// Function to continuously process the queue
async function startQueueProcessing() {
  let list_queue = true;
  while (list_queue) {
    list_queue = await processQueue();
    // Wait for a short time before checking the queue again
    // await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Add a few tasks to the queue for testing
async function initializeQueue() {
  await addTask("Task 1");
  await addTask("Task 2");
  await addTask("Task 3");
}

initializeQueue()
  .then(() => {
    startQueueProcessing();
  })
  .catch((error) => {
    console.error("Error initializing queue:", error);
  });

