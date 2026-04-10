export function getRoleLabel(role: "owner" | "manager" | "leader") {
  if (role === "owner") return "系統擁有者";
  if (role === "manager") return "主管";
  return "店長";
}

export function getShiftRoleLabel(role: "kitchen" | "floor" | "counter") {
  if (role === "kitchen") return "內場";
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
    update_authorized_user_status: "更新帳號狀態",
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
    unlock_inspection: "解除巡店鎖定",
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

function getBooleanLabel(value: unknown) {
  return value ? "是" : "否";
}

function getStoreName(storeId: unknown, storeNamesById: Record<string, string>) {
  if (typeof storeId !== "string") {
    return null;
  }

  return storeNamesById[storeId] ?? storeId;
}

export function formatAuditDetails(
  action: string,
  details: Record<string, unknown>,
  options?: { storeNamesById?: Record<string, string> },
) {
  const storeNamesById = options?.storeNamesById ?? {};
  const parts: string[] = [];

  switch (action) {
    case "create_or_update_authorized_user":
    case "create_authorized_user":
      if (typeof details.role === "string") {
        parts.push(`角色：${getRoleLabel(details.role as "owner" | "manager" | "leader")}`);
      }
      if (details.store_id) {
        parts.push(`店別：${getStoreName(details.store_id, storeNamesById)}`);
      }
      if ("is_active" in details) {
        parts.push(`啟用：${getBooleanLabel(details.is_active)}`);
      }
      break;
    case "update_authorized_user_status":
      if ("is_active" in details) {
        parts.push(`啟用：${getBooleanLabel(details.is_active)}`);
      }
      break;
    case "create_store":
      if (typeof details.code === "string") parts.push(`代碼：${details.code}`);
      if (typeof details.name === "string") parts.push(`名稱：${details.name}`);
      break;
    case "update_store_name":
      if (typeof details.name === "string") parts.push(`名稱：${details.name}`);
      break;
    case "create_staff_member":
      if (typeof details.name === "string") parts.push(`姓名：${details.name}`);
      if (details.store_id) {
        parts.push(`店別：${getStoreName(details.store_id, storeNamesById)}`);
      }
      if (typeof details.position === "string") {
        parts.push(`職位：${getShiftRoleLabel(details.position as "kitchen" | "floor" | "counter")}`);
      }
      break;
    case "archive_staff_member":
      parts.push("狀態：已封存");
      break;
    case "set_focus_items":
      if (typeof details.type === "string") {
        parts.push(`類型：${details.type === "permanent" ? "永久重點" : "月份重點"}`);
      }
      if (typeof details.month === "string" && details.month) {
        parts.push(`月份：${details.month}`);
      }
      if (Array.isArray(details.item_ids)) {
        parts.push(`項目數：${details.item_ids.length}`);
      }
      break;
    case "set_store_extra_items":
      if (Array.isArray(details.item_ids)) {
        parts.push(`額外題目數：${details.item_ids.length}`);
      }
      break;
    case "update_inspection_item_status":
      if ("is_active" in details) {
        parts.push(`啟用：${getBooleanLabel(details.is_active)}`);
      }
      break;
    case "create_inspection":
    case "update_inspection":
      if (details.store_id) {
        parts.push(`店別：${getStoreName(details.store_id, storeNamesById)}`);
      }
      if (typeof details.date === "string") parts.push(`日期：${details.date}`);
      if (typeof details.time_slot === "string") parts.push(`時段：${details.time_slot}`);
      if (typeof details.total_score === "string") parts.push(`總分：${details.total_score}`);
      break;
    case "update_improvement_task_status":
      if (typeof details.status === "string") {
        parts.push(`狀態：${getImprovementStatusLabel(details.status as "pending" | "resolved" | "verified" | "superseded")}`);
      }
      break;
    default:
      for (const [key, value] of Object.entries(details)) {
        if (key.endsWith("_id")) {
          continue;
        }

        if (Array.isArray(value)) {
          parts.push(`${key}：${value.length} 項`);
          continue;
        }

        if (typeof value === "boolean") {
          parts.push(`${key}：${getBooleanLabel(value)}`);
          continue;
        }

        if (typeof value === "string" || typeof value === "number") {
          parts.push(`${key}：${String(value)}`);
        }
      }
      break;
  }

  return parts.join(" / ") || "無補充內容";
}
