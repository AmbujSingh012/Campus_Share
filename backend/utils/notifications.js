const db = require("../db");

async function createPostNotifications({
  actorId,
  collegeId,
  notificationType,
  entityId,
  title,
}) {
  if (!actorId || !collegeId || !entityId) {
    return;
  }

  const message =
    notificationType === "task"
      ? "A new task was posted in your college."
      : "A new resource was shared in your college.";

  await db.execute(
    `
    INSERT IGNORE INTO notifications
    (
      recipient_id,
      actor_id,
      college_id,
      notification_type,
      entity_id,
      title,
      message
    )
    SELECT
      id,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?
    FROM users
    WHERE college_id = ?
      AND id <> ?
    `,
    [
      actorId,
      collegeId,
      notificationType,
      entityId,
      title,
      message,
      collegeId,
      actorId,
    ]
  );
}

module.exports = { createPostNotifications };
