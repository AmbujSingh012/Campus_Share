const express = require("express");

const db = require("../db");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const OLLAMA_MODEL = "gemma3:4b";

function safeJsonParse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_) {
    const cleaned = String(text)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          return JSON.parse(
            cleaned.slice(firstBrace, lastBrace + 1)
          );
        } catch (_) {
          return null;
        }
      }

      return null;
    }
  }
}

async function askLocalAI(request, resources, tasks) {
  const resourceData = resources.map((resource) => ({
    id: resource.id,
    title: resource.title,
    description: resource.description || "",
    category: resource.category || "",
    location: resource.location || "",
    availability: resource.availability || "",
    postedBy: resource.postedBy || "",
  }));

  const taskData = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    category: task.category || "",
    location: task.location || "",
    reward: Number(task.reward || 0),
    status: task.status || "",
    deadline: task.deadline || null,
    postedBy: task.postedBy || "",
  }));

  const prompt = `
You are Campus Helper for a college resource-sharing and micro-task platform.

The user is searching CampusShare.

USER REQUEST:
${request}

AVAILABLE RESOURCES FROM THE USER'S COLLEGE:
${JSON.stringify(resourceData)}

AVAILABLE OPEN TASKS FROM THE USER'S COLLEGE:
${JSON.stringify(taskData)}

Your job:
1. Understand the user's request semantically.
2. Select only resources and tasks that are genuinely relevant.
3. Do not invent any resource or task.
4. Use the exact IDs provided in the data.
5. If something is only loosely related, do not select it.
6. A request can match both resources and tasks.
7. Understand natural language, synonyms, spelling mistakes, and phrases.
8. Consider title, description, category, location, and other provided information.
9. If the user asks for something that does not exist in the provided data, return empty IDs.
10. Keep the answer short, useful, and conversational.
11. Never claim that you found something unless its ID exists in the provided data.

Return ONLY valid JSON in exactly this structure:

{
  "answer": "short helpful answer",
  "resource_ids": [1, 2],
  "task_ids": [3, 4]
}

resource_ids and task_ids must contain ONLY IDs from the supplied data.
`;

  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are a precise campus search assistant. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Ollama request failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  const content =
    data?.message?.content ||
    data?.response ||
    "";

  const parsed = safeJsonParse(content);

  if (!parsed) {
    throw new Error("Ollama returned invalid JSON");
  }

  const resourceIdSet = new Set(
    resources.map((resource) => Number(resource.id))
  );

  const taskIdSet = new Set(
    tasks.map((task) => Number(task.id))
  );

  const selectedResourceIds = Array.isArray(
    parsed.resource_ids
  )
    ? parsed.resource_ids
        .map(Number)
        .filter((id) => resourceIdSet.has(id))
    : [];

  const selectedTaskIds = Array.isArray(parsed.task_ids)
    ? parsed.task_ids
        .map(Number)
        .filter((id) => taskIdSet.has(id))
    : [];

  return {
    answer:
      typeof parsed.answer === "string" &&
      parsed.answer.trim()
        ? parsed.answer.trim()
        : "I found some relevant CampusShare results for you.",
    resourceIds: [...new Set(selectedResourceIds)],
    taskIds: [...new Set(selectedTaskIds)],
  };
};

// POST /api/helper
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { request } = req.body;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        message: "Request is required",
      });
    }

    const searchText = request.trim();

    const collegeId = req.user?.collegeId;

    if (!collegeId) {
      return res.status(400).json({
        success: false,
        message: "Active college is required",
      });
    }

    // Get live resources from the user's active college.
    // Keep both available and borrowed resources because
    // CampusShare currently exposes both states in Resources.
    const [resources] = await db.execute(
      `
      SELECT
        r.id,
        r.title,
        r.description,
        r.category,
        r.location,
        r.availability,
        r.borrowing_fee,
        u.name AS postedBy
      FROM resources r
      JOIN users u ON r.user_id = u.id
      WHERE r.college_id = ?
        AND LOWER(
          COALESCE(r.availability, '')
        ) IN ('available', 'borrowed')
      ORDER BY r.created_at DESC
      LIMIT 100
      `,
      [collegeId]
    );

    // Get live OPEN tasks from the user's active college.
    // Completed tasks are deliberately excluded.
    const [tasks] = await db.execute(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.category,
        t.location,
        t.reward,
        t.status,
        t.deadline,
        t.meeting_time,
        u.name AS postedBy
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.college_id = ?
        AND LOWER(COALESCE(t.status, '')) = 'open'
      ORDER BY t.created_at DESC
      LIMIT 100
      `,
      [collegeId]
    );

    if (resources.length === 0 && tasks.length === 0) {
      return res.json({
        success: true,
        request: searchText,
        keywords: [],
        message:
          "There are currently no available resources or open tasks in your college.",
        results: {
          resources: [],
          tasks: [],
        },
      });
    }

    const aiResult = await askLocalAI(
      searchText,
      resources,
      tasks
    );

    const selectedResourceIds = new Set(
      aiResult.resourceIds.map(Number)
    );

    const selectedTaskIds = new Set(
      aiResult.taskIds.map(Number)
    );

    const matchedResources = resources.filter((resource) =>
      selectedResourceIds.has(Number(resource.id))
    );

    const matchedTasks = tasks.filter((task) =>
      selectedTaskIds.has(Number(task.id))
    );

    const hasMatches =
      matchedResources.length > 0 ||
      matchedTasks.length > 0;

    const finalMessage = hasMatches
      ? aiResult.answer
      : `I couldn't find a close match for "${searchText}" in the currently available CampusShare resources and open tasks.`;

    res.json({
      success: true,
      request: searchText,
      keywords: [],
      message: finalMessage,
      results: {
        resources: matchedResources,
        tasks: matchedTasks,
      },
    });
  } catch (error) {
    console.error("Campus Helper error:", error);

    res.status(500).json({
      success: false,
      message:
        "Campus Helper is temporarily unavailable. Please try again.",
    });
  }
});

// GET AVAILABLE HELPERS
router.get(
  "/available",
  authenticateToken,
  async (req, res) => {
    try {
      const collegeId = req.user?.collegeId;

      if (!collegeId) {
        return res.status(400).json({
          success: false,
          message: "Active college is required",
        });
      }

      const [helpers] = await db.execute(
        `
        SELECT
          u.id,
          u.name,
          u.location,
          u.availability,
          u.college_id
        FROM users u
        WHERE u.availability = 'available'
          AND u.college_id = ?
        ORDER BY u.created_at DESC
        `,
        [collegeId]
      );

      res.json({
        success: true,
        count: helpers.length,
        helpers,
      });
    } catch (error) {
      console.error(
        "Available helpers error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching available helpers",
      });
    }
  }
);

module.exports = router;
