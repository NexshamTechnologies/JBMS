-- =========================================================
-- Jai Shiv Business Management System (JBMS)
-- Database Schema — PostgreSQL
-- Aligned to SRS v4.0 (Corrected & Final), Locked Scope
-- Excludes: Vendor Management, Dispatch, Full Inventory/Stock,
--           Audit Logs, Automated Backup (per client confirmation)
-- =========================================================

-- ---------------------------------------------------------
-- 1. ROLES  (FR-AUTH-004)
-- ---------------------------------------------------------
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    role_name   VARCHAR(30) NOT NULL UNIQUE   -- 'Owner', 'Operations', 'Accountant'
);

INSERT INTO roles (role_name) VALUES ('Owner'), ('Operations'), ('Accountant');
-- 'Operations' = Rahul's role tier (full operational access, no user mgmt / backup)

-- ---------------------------------------------------------
-- 2. USERS  (FR-AUTH-001 to FR-AUTH-007)
-- ---------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. CUSTOMERS  (FR-CUST-001 to FR-CUST-013)
-- ---------------------------------------------------------
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    customer_name   VARCHAR(150) NOT NULL,
    mobile_number   VARCHAR(15),
    address         TEXT,
    gst_number      VARCHAR(20),                 -- optional
    pan             VARCHAR(10),                 -- optional
    email           VARCHAR(150),
    customer_type   VARCHAR(10) NOT NULL
                    CHECK (customer_type IN ('GST', 'Non-GST')),
    is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name    ON customers (customer_name);
CREATE INDEX idx_customers_mobile  ON customers (mobile_number);

-- ---------------------------------------------------------
-- 4. PRODUCTS — Lite Product Catalog  (FR-PROD-001 to FR-PROD-010)
--    Billing-support only. No stock quantity / stock movement fields.
-- ---------------------------------------------------------
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    product_name    VARCHAR(150) NOT NULL,
    category        VARCHAR(80),                 -- optional
    fabric_type     VARCHAR(80),                  -- optional, e.g. Denim / Non-Denim
    unit            VARCHAR(20) NOT NULL,         -- e.g. Meter, Piece
    hsn_code        VARCHAR(15),
    gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,   -- e.g. 5.00, 12.00, 18.00
    selling_price   NUMERIC(12,2) NOT NULL CHECK (selling_price > 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products (product_name);

-- ---------------------------------------------------------
-- 5. INVOICES  (FR-BILL-001 to FR-BILL-017)
--    is_gst = the GST ON/OFF toggle described in the SRS.
-- ---------------------------------------------------------
CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(30) NOT NULL UNIQUE,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    is_gst          BOOLEAN NOT NULL,             -- TRUE = GST Invoice, FALSE = Normal Invoice
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- 0 when is_gst = FALSE
    grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_date     ON invoices (invoice_date);
CREATE INDEX idx_invoices_gst      ON invoices (is_gst);      -- powers GST/Non-GST report split

-- ---------------------------------------------------------
-- 6. INVOICE ITEMS  (FR-BILL-003, FR-BILL-004, FR-BILL-007 to FR-BILL-010)
-- ---------------------------------------------------------
CREATE TABLE invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    quantity        NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL,       -- snapshot of product price at billing time
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,   -- snapshot of product GST rate
    line_total      NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items (product_id);

-- ---------------------------------------------------------
-- 7. PAYMENTS  (FR-PAY-001 to FR-PAY-013)
-- ---------------------------------------------------------
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    invoice_id      INTEGER REFERENCES invoices(id),   -- NULL allowed = advance payment, not yet allocated
    payment_mode    VARCHAR(20) NOT NULL
                    CHECK (payment_mode IN ('Cash','UPI','Bank Transfer','NEFT','RTGS','Cheque')),
    payment_type    VARCHAR(10) NOT NULL DEFAULT 'Full'
                    CHECK (payment_type IN ('Full','Partial','Advance')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks         TEXT,
    recorded_by     INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_customer ON payments (customer_id);
CREATE INDEX idx_payments_date     ON payments (payment_date);

-- ---------------------------------------------------------
-- 8. CUSTOMER LEDGER ENTRIES  (FR-LEDGER-001 to FR-LEDGER-014)
--    Append-only running ledger, one row per invoice or payment event,
--    so ledger statements and running balance don't need to be
--    recomputed from scratch on every view.
-- ---------------------------------------------------------
CREATE TABLE customer_ledger_entries (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type      VARCHAR(10) NOT NULL
                    CHECK (entry_type IN ('Invoice','Payment','Credit','Debit')),
    reference_id    INTEGER,                       -- points to invoices.id or payments.id
    debit_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,   -- invoice raised = debit (customer owes more)
    credit_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,   -- payment received = credit (customer owes less)
    running_balance NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_customer_date ON customer_ledger_entries (customer_id, entry_date);

-- ---------------------------------------------------------
-- 9. COMPANY SETTINGS  (FR-SET-001 to FR-SET-009)
--    Single-row table — company-wide invoice/branding configuration.
-- ---------------------------------------------------------
CREATE TABLE company_settings (
    id              SERIAL PRIMARY KEY,
    company_name    VARCHAR(150) NOT NULL,
    address         TEXT,
    gst_number      VARCHAR(20),
    pan             VARCHAR(10),
    logo_url        VARCHAR(255),
    invoice_prefix  VARCHAR(20) DEFAULT 'INV',
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- TRIGGERS — keep the customer ledger and running balance
-- automatically in sync (FR-BILL-015, FR-PAY-012, FR-LEDGER-007)
-- =========================================================

CREATE OR REPLACE FUNCTION fn_ledger_add_invoice() RETURNS TRIGGER AS $$
DECLARE
    prev_balance NUMERIC(12,2);
BEGIN
    SELECT COALESCE(running_balance, 0) INTO prev_balance
    FROM customer_ledger_entries
    WHERE customer_id = NEW.customer_id
    ORDER BY id DESC LIMIT 1;

    INSERT INTO customer_ledger_entries
        (customer_id, entry_date, entry_type, reference_id, debit_amount, credit_amount, running_balance)
    VALUES
        (NEW.customer_id, NEW.invoice_date, 'Invoice', NEW.id, NEW.grand_total, 0,
         COALESCE(prev_balance, 0) + NEW.grand_total);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_ledger
AFTER INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION fn_ledger_add_invoice();

CREATE OR REPLACE FUNCTION fn_ledger_add_payment() RETURNS TRIGGER AS $$
DECLARE
    prev_balance NUMERIC(12,2);
BEGIN
    SELECT COALESCE(running_balance, 0) INTO prev_balance
    FROM customer_ledger_entries
    WHERE customer_id = NEW.customer_id
    ORDER BY id DESC LIMIT 1;

    INSERT INTO customer_ledger_entries
        (customer_id, entry_date, entry_type, reference_id, debit_amount, credit_amount, running_balance)
    VALUES
        (NEW.customer_id, NEW.payment_date, 'Payment', NEW.id, 0, NEW.amount,
         COALESCE(prev_balance, 0) - NEW.amount);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_ledger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION fn_ledger_add_payment();

-- =========================================================
-- USEFUL REPORTING VIEWS  (Section 8 / 11 of the SRS)
-- =========================================================

-- Customer outstanding balance (FR-LEDGER-004, FR-REP-005)
CREATE VIEW v_customer_outstanding AS
SELECT c.id AS customer_id, c.customer_name,
       COALESCE(SUM(l.debit_amount) - SUM(l.credit_amount), 0) AS outstanding_balance
FROM customers c
LEFT JOIN customer_ledger_entries l ON l.customer_id = c.id
GROUP BY c.id, c.customer_name;

-- GST vs Non-GST sales split (FR-REP-008, FR-REP-009)
CREATE VIEW v_gst_vs_nongst_sales AS
SELECT is_gst, DATE_TRUNC('month', invoice_date) AS month, SUM(grand_total) AS total_sales
FROM invoices
GROUP BY is_gst, DATE_TRUNC('month', invoice_date);

-- Daily / weekly / monthly / yearly sales base view (FR-REP-001 to FR-REP-004)
CREATE VIEW v_sales_by_day AS
SELECT invoice_date, SUM(grand_total) AS total_sales, COUNT(*) AS invoice_count
FROM invoices
GROUP BY invoice_date;