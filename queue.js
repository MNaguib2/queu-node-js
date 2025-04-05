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
    await this.addTask(this.task.shift());
    return this.startQueueAddDBProcessing();
  }
  async addTask(task) {
    const connection = await pool.getConnection();
    try {
      await connection.query("INSERT INTO queue (task, req_data) VALUES (?, ?)", [task.task, task.body]);
      console.log("Task added:", task.task);
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
    let task;
    this.processDbQueue = true;
  
    try {
      // const [rows] = await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT * FROM queue WHERE status IN (?, ?) ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
        ["pending", "processing"]
      );
  
      if (rows.length === 0) {
        console.log("📭 No pending tasks");
        this.processDbQueue = false;
        console.log("🚀 ~ TaskQueue ~ processQueue ~ task:", task)
        return false; // 🟡 Nothing to process
      }
  
      task = rows[0];
  
      await connection.query("UPDATE queue SET status = ? WHERE id = ?", [
        "processing",
        task.id,
      ]);
  
      await new Promise((resolve) => setTimeout(resolve, 6000));
  
      if (task.task === "Task 2") {
        throw new Error("Task 2 failed");
      }
  
      await connection.query("UPDATE queue SET status = ? WHERE id = ?", [
        "completed",
        task.id,
      ]);
  
      console.log("✅ Task completed:", task.task);
      return true;
  
    } catch (error) {
      await this.updateError(error, task, connection);
      console.error("❌ Error processing task:", error);
      return true; // Still return true so processing continues
    } finally {
      connection.release(); // ✅ just cleanup, no return here
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
  task_type = {
    add_new_user: "add_new_user",
  }
}

const taskQueue = new TaskQueue();
module.exports = taskQueue;
// Add more tasks as needed
