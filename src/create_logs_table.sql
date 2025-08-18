CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  level ENUM('ERROR', 'WARN', 'INFO', 'DEBUG') NOT NULL,
  message TEXT NOT NULL,
  data JSON,
  stack TEXT,
  request_id VARCHAR(50),
  user_id VARCHAR(50),
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  operation VARCHAR(255),
  duration INT
);