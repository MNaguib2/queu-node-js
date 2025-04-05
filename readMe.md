npm install mysql
npm i express





INSERT INTO completed (task, req_data, created_at)
SELECT task, req_data, created_at FROM queue
WHERE status = 'completed';

DELETE FROM queue
WHERE status = 'completed';
