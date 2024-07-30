const express = require('express');
const queue = require('./queue');

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

app.post('/api/add-new-user', (req, res) => {
    queue.initializeQueue = {task: queue.task_type.add_new_user,body: JSON.stringify(req.body)};
    res.end();
})

app.listen(3000, () => {
    console.log('listening on port 3000 \nhttp://localhost:3000\n');
})