CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('pagar', 'receber') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pendente', 'pago', 'vencido') DEFAULT 'pendente',
    payment_date DATE NULL,
    payment_amount DECIMAL(10, 2) NULL,
    category VARCHAR(100),
    supplier_customer VARCHAR(255),
    notes TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);