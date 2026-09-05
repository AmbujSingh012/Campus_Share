const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();

const PORT = 3000;

app.use(express.json());

// MySQL database connection
// Data is stored in MySQL now


// JWT secret
const JWT_SECRET = "campusshare_day2_secret";

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "CampusSHARE backend is running!"
    });
});

// =====================================================
// AUTH - REGISTER
// =====================================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const cleanName = name ? name.trim() : "";
const cleanEmail = email ? email.trim().toLowerCase() : "";
const cleanPassword = password ? password.trim() : "";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({
        message: "Name, email and password are required"
    });
}

if (cleanName.length < 2) {
    return res.status(400).json({
        message: "Name must be at least 2 characters"
    });
}

if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
        message: "Please provide a valid email"
    });
}

if (cleanPassword.length < 8) {
    return res.status(400).json({
        message: "Password must be at least 8 characters"
    });
}

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Check if email already exists
        db.query(
            "SELECT id FROM users WHERE email = ?",
            [cleanEmail],
            async (err, results) => {

                if (err) {
                    console.error("Database error:", err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                // User already exists
                if (results.length > 0) {
                    return res.status(409).json({
                        message: "User already exists"
                    });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(cleanPassword, 10);

                // Insert user into MySQL
                db.query(
                    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
                    [cleanName,cleanEmail, hashedPassword],
                    (err, result) => {

                        if (err) {
                            console.error("Insert error:", err);

                            return res.status(500).json({
                                message: "Database error"
                            });
                        }

                        res.status(201).json({
                            message: "Registration successful",
                            user: {
                                id: result.insertId,
                                name,
                                email
                            }
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// =====================================================
// AUTH - LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Find user in MySQL
        db.query(
            "SELECT id, name, email, password FROM users WHERE email = ?",
            [email],
            async (err, results) => {

                if (err) {
                    console.error("Database error:", err);

                    return res.status(500).json({
                        message: "Database error"
                    });
                }

                // User not found
                if (results.length === 0) {
                    return res.status(401).json({
                        message: "Invalid email or password"
                    });
                }

                const user = results[0];

                // Compare password with bcrypt hash
                const passwordMatch = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!passwordMatch) {
                    return res.status(401).json({
                        message: "Invalid email or password"
                    });
                }

                // Generate JWT
                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "1h"
                    }
                );

                res.json({
                    message: "Login successful",
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }
                });
            }
        );

    } catch (error) {
        console.error("Server error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// =====================================================
// PROFILE
// =====================================================

app.get("/api/profile/:id", (req, res) => {

    const userId = req.params.id;

    db.query(
        "SELECT id, name, email, created_at FROM users WHERE id = ?",
        [userId],
        (err, results) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.json(results[0]);
        }
    );
});

// =====================================================
// RESOURCES - CREATE
// =====================================================

app.post("/api/resources", (req, res) => {

    const { title, description, category, owner_id } = req.body;

    if (!title || !description || !category || !owner_id) {
        return res.status(400).json({
            message: "Title, description, category and owner_id are required"
        });
    }

    const sql = `
        INSERT INTO resources
        (title, description, category, owner_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, description, category, owner_id],
        (err, result) => {
            if (err) {
    console.error("Database error:", err);

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            message: "Owner user does not exist"
        });
    }

    return res.status(500).json({
        message: "Database error"
    });
}
            res.status(201).json({
                message: "Resource created successfully",
                resource: {
                    id: result.insertId,
                    title,
                    description,
                    category,
                    owner_id
                }
            });
        }
    );
});

// =====================================================
// RESOURCES - GET ALL
// =====================================================

app.get("/api/resources", (req, res) => {

    db.query(
        "SELECT * FROM resources ORDER BY id DESC",
        (err, results) => {

            if (err) {
    console.error("Database error:", err);

    return res.status(500).json({
        message: "Database error"
    });
}
            res.json({
                resources: results
            });
        }
    );
});

// =====================================================
// RESOURCES - GET ONE
// =====================================================

app.get("/api/resources/:id", (req, res) => {

    const resourceId = req.params.id;

    db.query(
        "SELECT * FROM resources WHERE id = ?",
        [resourceId],
        (err, results) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Resource not found"
                });
            }

            res.json({
                resource: results[0]
            });
        }
    );
});

// =====================================================
// RESOURCES - UPDATE
// =====================================================

app.put("/api/resources/:id", (req, res) => {

    const resourceId = req.params.id;
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
        return res.status(400).json({
            message: "Title, description and category are required"
        });
    }

    db.query(
        `UPDATE resources
         SET title = ?, description = ?, category = ?
         WHERE id = ?`,
        [title, description, category, resourceId],
        (err, result) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Resource not found"
                });
            }

            res.json({
                message: "Resource updated successfully"
            });
        }
    );
});

// =====================================================
// RESOURCES - DELETE
// =====================================================

app.delete("/api/resources/:id", (req, res) => {

    const resourceId = req.params.id;

    db.query(
        "DELETE FROM resources WHERE id = ?",
        [resourceId],
        (err, result) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Resource not found"
                });
            }

            res.json({
                message: "Resource deleted successfully"
            });
        }
    );
});

// =====================================================
// TASKS - CREATE
// =====================================================

app.post("/api/tasks", (req, res) => {

    const { title, description, reward, created_by } = req.body;

    if (!title || !description || reward === undefined || !created_by) {
        return res.status(400).json({
            message: "Title, description, reward and created_by are required"
        });
    }
    if (Number(reward) < 0) {
    return res.status(400).json({
        message: "Reward cannot be negative"
    });
}
    const sql = `
        INSERT INTO tasks
        (title, description, reward, created_by)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [title, description, reward, created_by],
        (err, result) => {

            if (err) {
    console.error("Database error:", err);

    if (err.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            message: "Creator user does not exist"
        });
    }

    return res.status(500).json({
        message: "Database error"
    });
}

            res.status(201).json({
                message: "Task created successfully",
                task: {
                    id: result.insertId,
                    title,
                    description,
                    reward,
                    created_by,
                    accepted_by: null,
                    status: "open"
                }
            });
        }
    );
});

// =====================================================
// TASKS - GET ALL
// =====================================================

app.get("/api/tasks", (req, res) => {

    db.query(
        "SELECT * FROM tasks ORDER BY id DESC",
        (err, results) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json({
                tasks: results
            });
        }
    );
});

// =====================================================
// TASKS - GET ONE
// =====================================================

app.get("/api/tasks/:id", (req, res) => {

    const taskId = req.params.id;

    db.query(
        "SELECT * FROM tasks WHERE id = ?",
        [taskId],
        (err, results) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.json({
                task: results[0]
            });
        }
    );
});

// =====================================================
// TASKS - ACCEPT
// =====================================================

app.post("/api/tasks/:id/accept", (req, res) => {

    const taskId = req.params.id;
    const { accepted_by } = req.body;

    if (!accepted_by) {
        return res.status(400).json({
            message: "accepted_by is required"
        });
    }

    db.query(
        `UPDATE tasks
         SET accepted_by = ?, status = 'accepted'
         WHERE id = ? AND status = 'open'`,
        [accepted_by, taskId],
        (err, result) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Task not found or task is already accepted"
                });
            }

            res.json({
                message: "Task accepted successfully",
                task: {
                    id: Number(taskId),
                    accepted_by: Number(accepted_by),
                    status: "accepted"
                }
            });
        }
    );
});

// =====================================================
// TASKS - UPDATE
// =====================================================

app.put("/api/tasks/:id", (req, res) => {

    const taskId = req.params.id;
    const { title, description, reward } = req.body;

    if (!title || !description || reward === undefined) {
        return res.status(400).json({
            message: "Title, description and reward are required"
        });
    }

    db.query(
        `UPDATE tasks
         SET title = ?, description = ?, reward = ?
         WHERE id = ?`,
        [title, description, reward, taskId],
        (err, result) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.json({
                message: "Task updated successfully"
            });
        }
    );
});
// =====================================================
// TASKS - DELETE
// =====================================================

app.delete("/api/tasks/:id", (req, res) => {

    const taskId = req.params.id;

    db.query(
        "DELETE FROM tasks WHERE id = ?",
        [taskId],
        (err, result) => {

            if (err) {
                console.error("Database error:", err);

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Task not found"
                });
            }

            res.json({
                message: "Task deleted successfully"
            });
        }
    );
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Server available on network at http://192.168.1.150:${PORT}`);
});