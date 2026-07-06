export const PROJECT_TRACKER_STAGES = [
  {
    key: "new",
    label: "Request sent",
    shortLabel: "Sent",
    schedule: "Waiting for the company to review your request.",
  },
  {
    key: "pending",
    label: "Site visit",
    shortLabel: "Visit",
    schedule: "The company is confirming scope, access, and timing.",
  },
  {
    key: "source_parts",
    label: "Source parts",
    shortLabel: "Parts",
    schedule: "Materials, equipment, or crew details are being lined up.",
  },
  {
    key: "labor",
    label: "Labor",
    shortLabel: "Work",
    schedule: "Work is underway at the home or job site.",
  },
  {
    key: "final_touches",
    label: "Final touches",
    shortLabel: "Finish",
    schedule: "Cleanup, testing, and final checks are in progress.",
  },
  {
    key: "completed",
    label: "Completed",
    shortLabel: "Done",
    schedule: "The job is complete and ready for review.",
  },
];

const TRACKER_ALIASES = {
  in_progress: "labor",
};

export const COMPANY_TRACKER_OPTIONS = PROJECT_TRACKER_STAGES.filter((stage) => stage.key !== "new");

export function normalizeTrackerStatus(status) {
  return TRACKER_ALIASES[status] || status || "new";
}

export function getTrackerStageIndex(status) {
  const normalized = normalizeTrackerStatus(status);
  const index = PROJECT_TRACKER_STAGES.findIndex((stage) => stage.key === normalized);
  return index >= 0 ? index : 0;
}

export function getTrackerStage(status) {
  return PROJECT_TRACKER_STAGES[getTrackerStageIndex(status)];
}

export function getTrackerProgress(status) {
  const index = getTrackerStageIndex(status);
  return Math.round((index / (PROJECT_TRACKER_STAGES.length - 1)) * 100);
}

export function getTrackerPriority(status) {
  return getTrackerStageIndex(status);
}

export function isNewRequestStatus(status) {
  return normalizeTrackerStatus(status) === "new";
}

export function isCompletedRequestStatus(status) {
  return normalizeTrackerStatus(status) === "completed";
}

export function isActiveRequestStatus(status) {
  const normalized = normalizeTrackerStatus(status);
  return normalized !== "new" && normalized !== "completed";
}
