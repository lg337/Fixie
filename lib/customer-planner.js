import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_PLAN = {
  title: "",
  overview: "",
  materials: "",
  budget: "",
  timeline: "",
};

const PLAN_SECTIONS = [
  ["Project details", "overview"],
  ["Materials needed", "materials"],
  ["Budget", "budget"],
  ["Timeline", "timeline"],
];

export const loadCustomerPlannerItems = async (customerID) => {
  if (!customerID) return [];

  const [savedPlan, savedTemplates] = await Promise.all([
    AsyncStorage.getItem(`fixie-project-plan:${customerID}`),
    AsyncStorage.getItem(`fixie-project-templates:${customerID}`),
  ]);

  const items = [];

  if (savedPlan) {
    try {
      const parsedPlan = JSON.parse(savedPlan);
      const plan = { ...DEFAULT_PLAN, ...parsedPlan.plan };
      const hasContent = Object.values(plan).some((value) => String(value || "").trim().length > 0);

      if (hasContent) {
        items.push({
          key: "current-plan",
          label: plan.title || "Current Planner",
          type: "Current plan",
          plan,
        });
      }
    } catch (error) {
      console.log("Planner item load error:", error);
    }
  }

  if (savedTemplates) {
    try {
      const templates = JSON.parse(savedTemplates);
      templates.forEach((template) => {
        items.push({
          key: template.key,
          label: template.label,
          type: template.workType || "Saved template",
          plan: {
            title: template.title || "",
            overview: template.overview || "",
            materials: template.materials || "",
            budget: template.budget || "",
            timeline: template.timeline || "",
          },
        });
      });
    } catch (error) {
      console.log("Planner templates load error:", error);
    }
  }

  return items;
};

export const formatPlannerItemForRequest = (item) => {
  const plan = { ...DEFAULT_PLAN, ...item.plan };
  const lines = [
    `Included planner template: ${item.label}`,
    item.type ? `Work type: ${item.type}` : "",
    plan.title ? `Project name: ${plan.title}` : "",
  ].filter(Boolean);

  PLAN_SECTIONS.forEach(([label, key]) => {
    const value = String(plan[key] || "").trim();
    if (value) {
      lines.push("", `${label}:`, value);
    }
  });

  return lines.join("\n");
};
