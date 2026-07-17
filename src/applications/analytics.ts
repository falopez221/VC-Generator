export type ApplicationsEvent = "applications_viewed" | "application_search_used" | "application_filter_changed" | "application_opened" | "application_compared" | "application_added_to_mission" | "mission_generated" | "mission_opened_in_lab" | "network_node_selected" | "matrix_cell_selected" | "value_view_selected" | "high_impact_notice_viewed";

export function trackApplicationsEvent(name: ApplicationsEvent, detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("venture-governance:analytics", { detail: { name, ...detail } }));
}
