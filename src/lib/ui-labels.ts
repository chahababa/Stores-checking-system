export function getRoleLabel(role: "owner" | "manager" | "leader") {
  if (role === "owner") return "系統擁有者";
  if (role === "manager") return "店主管";
  return "店長";
}

export function getShiftRoleLabel(role: "kitchen" | "floor" | "counter") {
  if (role === "kitchen") return "內場";
  if (role === "floor") return "外場";
  return "櫃台";
}

export function getBusynessLabel(level: "low" | "medium" | "high") {
  if (level === "low") return "不忙";
  if (level === "medium") return "普通";
  return "繁忙";
}

export function getImprovementStatusLabel(status: "pending" | "resolved" | "verified" | "superseded") {
  if (status === "pending") return "待處理";
  if (status === "resolved") return "已改善";
  if (status === "verified") return "已確認";
  return "已替代";
}

export function getAuditActionLabel(action: string) {
  const labels: Record<string, string> = {
    create_or_update_authorized_user: "新增或更新授權帳號",
    create_authorized_user: "新增授權帳號",
    update_authorized_user_status: "更新授權帳號狀態",
    create_staff_member: "新增組員",
    archive_staff_member: "封存組員",
    set_focus_items: "更新重點項目",
    update_inspection_item_status: "更新題目啟用狀態",
    set_store_extra_items: "更新店別加題",
    create_inspection: "新增巡店紀錄",
    update_inspection: "更新巡店紀錄",
    lock_inspection: "鎖定巡店紀錄",
    unlock_inspection: "解除鎖定巡店紀錄",
    delete_inspection: "刪除巡店紀錄",
    update_improvement_task_status: "更新改善任務狀態",
    set_inspection_photo_standard: "設定標準照片",
    unset_inspection_photo_standard: "取消標準照片",
    delete_inspection_photo: "刪除巡店照片",
  };

  return labels[action] ?? action;
}

export function getAuditEntityLabel(entityType: string) {
  const labels: Record<string, string> = {
    users: "授權帳號",
    staff_members: "組員",
    focus_items: "重點項目",
    inspection_items: "巡店題目",
    store_extra_items: "店別加題",
    inspections: "巡店紀錄",
    improvement_tasks: "改善任務",
    inspection_photos: "巡店照片",
  };

  return labels[entityType] ?? entityType;
}
