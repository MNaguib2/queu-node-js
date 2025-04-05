const pool = require("./connection-db");

class TaskQueue {
  task = [];
  processAddDbQueue = false;
  processDbQueue = false;
  constructor() {}
  set initializeQueue(task) {
    this.task.push(task);
    if (!this.processAddDbQueue) {
      this.processAddDbQueue = true;
      this.startQueueAddDBProcessing();
    }
  }
  async startQueueAddDBProcessing() {
    if (this.task.length === 0) {
      this.processAddDbQueue = false;
      if(!this.processDbQueue) this.startQueueProcessing();
      return;
    }
    console.log(this.task);
    await this.addTask(this.task.shift());
    return this.startQueueAddDBProcessing();
  }
  async addTask(task) {
    const connection = await pool.getConnection();
    try {
      await connection.query("INSERT INTO queue (task) VALUES (?)", [task]);
      console.log("Task added:", task);
    } finally {
      connection.release();
    }
  }

  async startQueueProcessing() {
    let list_queue = true;
    while (list_queue) {
      list_queue = await this.processQueue();
      // Wait for a short time before checking the queue again
      // await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  async processQueue() {
    const connection = await pool.getConnection();
    let status = false;
    let task;
    this.processDbQueue = true;
    try {
      // Start a transaction
    //   await connection.beginTransaction();

      // Lock the first pending task
      const [rows] = await connection.query(
        "SELECT * FROM queue WHERE status = ? ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
        ["pending"]
      );
      if (rows.length === 0) {
        console.log("No pending tasks");
        // await connection.commit();
        this.processDbQueue = false;
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
      await new Promise((resolve) => setTimeout(resolve, 6000));

      if (task.task === "Task 2") {
        throw new Error("Task 2 failed");
      }

      // Mark the task as completed
      await connection.query("UPDATE queue SET status = ? WHERE id = ?", [
        "completed",
        task.id,
      ]);

      // Commit the transaction
    //   await connection.commit();
      console.log("Task completed:", task.task);
      status = true;
      return;
    } catch (error) {
      await connection.rollback();
      this.updateError(error, task, connection);
      console.error("Error processing task:", error);
      status = true;
      return;
    } finally {
      connection.release();
      return status;
    }
  }
  updateError(error, task, connection) {
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
}

const taskQueue = new TaskQueue();

taskQueue.initializeQueue = "Task 1";
taskQueue.initializeQueue = "Task 2";
taskQueue.initializeQueue = "Task 3";
i = 4;

setTimeout(() => {
    setInterval(() => {
        console.log(i);
        taskQueue.initializeQueue = "Task " + i;
        i++;
    }, 5000);
       
}, 18000);
// Add more tasks as needed
