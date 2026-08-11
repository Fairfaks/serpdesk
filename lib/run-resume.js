'use strict';

function pendingKeywords(db, runId, projectId) {
  return db.all(
    `SELECT k.id, k.phrase, r.id AS result_id, r.error
     FROM keywords k
     LEFT JOIN results r ON r.run_id = ? AND r.keyword_id = k.id
     WHERE k.project_id = ? AND (r.id IS NULL OR r.error IS NOT NULL)
     ORDER BY k.id`,
    [runId, projectId]
  );
}

function summary(db, runId, projectId) {
  const pending = pendingKeywords(db, runId, projectId);
  return {
    pending: pending.length,
    missing: pending.filter((item) => !item.result_id).length,
    errors: pending.filter((item) => Boolean(item.result_id)).length,
  };
}

function recoverInterrupted(db, interruptedAt) {
  const count = db.get("SELECT COUNT(*) AS c FROM runs WHERE status = 'running'")?.c || 0;
  if (!count) return 0;
  db.run("UPDATE runs SET status = 'interrupted', finished_at = ? WHERE status = 'running'", [interruptedAt]);
  db.run("UPDATE request_log SET status = 'interrupted', finished_at = ? WHERE status = 'running'", [interruptedAt]);
  return count;
}

module.exports = { pendingKeywords, summary, recoverInterrupted };
