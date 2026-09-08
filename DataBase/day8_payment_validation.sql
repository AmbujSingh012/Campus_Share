USE campusshare;

-- 1. Check all payment records
SELECT
    id,
    task_id,
    payer_id,
    receiver_id,
    amount,
    status,
    transaction_id,
    created_at
FROM payments
ORDER BY id DESC;


-- 2. Check for invalid payer, receiver or task references
SELECT
    p.id,
    p.task_id,
    p.payer_id,
    p.receiver_id
FROM payments p
LEFT JOIN tasks t ON p.task_id = t.id
LEFT JOIN users payer ON p.payer_id = payer.id
LEFT JOIN users receiver ON p.receiver_id = receiver.id
WHERE t.id IS NULL
   OR payer.id IS NULL
   OR receiver.id IS NULL;


-- 3. Check for invalid payment amounts
SELECT
    id,
    amount,
    status
FROM payments
WHERE amount <= 0;


-- 4. Detect duplicate transactions
SELECT
    transaction_id,
    COUNT(*) AS payment_count
FROM payments
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;


-- 5. Check payment status summary
SELECT
    status,
    COUNT(*) AS payment_count
FROM payments
GROUP BY status;
