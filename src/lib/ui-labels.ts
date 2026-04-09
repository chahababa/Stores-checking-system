export function getRoleLabel(role: "owner" | "manager" | "leader") {
  if (role === "owner") return "系統擁有者";
  if (role === "manager") return "店主管";
  return "店長";
}

export function getShiftRoleLabel(role: "kitchen" | "floor" | "counter") {
  if (role === "kitchen") return "廚房";
  if (role === "floor") return "外場";
  return "櫃台";
}

export function getBusynessLabel(level: "low" | "medium" | "high") {
  if (level === "low") return "離峰";
  if (level === "medium") return "一般";
  return "尖峰";
}

export function getImprovementStatusLabel(status: "pending" | "resolved" | "verified" | "superseded") {
  if (status === "pending") return "待改善";
  if (status === "resolved") return "已處理";
  if (status === "verified") return "已驗證";
  return "已取代";
}

export function getAuditActionLabel(action: string) {
  const labels: Record<string, string> = {
    create_or_update_authorized_user: "建立或更新授權帳號",
    create_authorized_user: "建立授權帳號",
    update_authorized_user_status: "更新帳號啟用狀態",
    create_store: "新增店別",
    update_store_name: "更新店別名稱",
    create_staff_member: "新增組員",
    archive_staff_member: "封存組員",
    set_focus_items: "更新重點項目",
    update_inspection_item_status: "更新題目啟用狀態",
    set_store_extra_items: "更新店別額外題目",
    create_inspection: "建立巡店紀錄",
    update_inspection: "更新巡店紀錄",
    lock_inspection: "鎖定巡店紀錄",
    unlock_inspection: "解除鎖定巡店紀錄",
    delete_inspection: "刪除巡店紀錄",
    update_improvement_task_status: "更新改善任務狀態",
    set_inspection_photo_standard: "設為標準照片",
    unset_inspection_photo_standard: "取消標準照片",
    delete_inspection_photo: "刪除巡店照片",
  };

  return labels[action] ?? action;
}

export function getAuditEntityLabel(entityType: string) {
  const labels: Record<string, string> = {
    user: "授權帳號",
    users: "授權帳號",
    store: "店別",
    stores: "店別",
    staff_member: "組員",
    staff_members: "組員",
    focus_items: "重點項目",
    inspection_item: "巡店題目",
    inspection_items: "巡店題目",
    store_extra_items: "店別額外題目",
    inspections: "巡店紀錄",
    improvement_tasks: "改善任務",
    inspection_photos: "巡店照片",
  };

  return labels[entityType] ?? entityType;
}
