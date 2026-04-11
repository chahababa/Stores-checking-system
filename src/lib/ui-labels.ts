export type InspectionTagType = "critical" | "monthly_attention" | "complaint_watch";
export type InspectionTagSource = "manual" | "complaint_sync";

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

export function getWorkstationScopeLabel(scope: "global" | "store") {
  return scope === "global" ? "全部店通用" : "指定店別";
}

export function getBusynessLabel(level: "low" | "medium" | "high") {
  if (level === "low") return "較低";
  if (level === "medium") return "一般";
  return "忙碌";
}

export function getImprovementStatusLabel(
  status: "pending" | "resolved" | "verified" | "superseded",
) {
  if (status === "pending") return "待處理";
  if (status === "resolved") return "已改善";
  if (status === "verified") return "已確認";
  return "已替代";
}

export function getInspectionTagLabel(type: InspectionTagType) {
  if (type === "critical") return "必查項目";
  if (type === "monthly_attention") return "本月加強";
  return "客訴項目";
}

export function getInspectionTagDescription(type: InspectionTagType) {
  if (type === "critical") {
    return "屬於每次巡店都必須人工確認的關鍵項目，不會預設帶入 3 分。";
  }

  if (type === "monthly_attention") {
    return "屬於這個月特別需要加強追蹤的項目，不會預設帶入 3 分。";
  }

  return "屬於近期客訴或風險追蹤項目，不會預設帶入 3 分，可手動設定或由未來客訴同步帶入。";
}

export function getInspectionTagSourceLabel(source: InspectionTagSource) {
  if (source === "complaint_sync") return "客訴同步";
  return "手動設定";
}

export function getAuditActionLabel(action: string) {
  const labels: Record<string, string> = {
    create_or_update_authorized_user: "新增或更新授權帳號",
    create_authorized_user: "新增授權帳號",
    update_authorized_user_status: "更新授權帳號狀態",
    create_store: "新增店別",
    update_store_name: "更新店別名稱",
    create_staff_member: "新增組員",
    archive_staff_member: "封存組員",
    restore_staff_member: "恢復組員",
    create_workstation: "新增工作站",
    update_workstation: "更新工作站",
    create_inspection_item: "新增巡店題目",
    update_inspection_item: "更新巡店題目",
    set_focus_items: "更新標籤設定",
    update_inspection_item_status: "更新題目啟用狀態",
    set_store_extra_items: "更新店別附加題目",
    create_inspection: "新增巡店紀錄",
    update_inspection: "更新巡店紀錄",
    lock_inspection: "鎖定巡店紀錄",
    unlock_inspection: "解除巡店鎖定",
    delete_inspection: "刪除巡店紀錄",
    update_improvement_task_status: "更新改善任務狀態",
    set_inspection_photo_standard: "設為標準照片",
    unset_inspection_photo_standard: "取消標準照片",
    delete_inspection_photo: "刪除巡店照片",
    cleanup_qa_test_data: "清理 QA 測試資料",
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
    workstation: "工作站",
    workstations: "工作站",
    focus_items: "標籤設定",
    inspection: "巡店紀錄",
    inspections: "巡店紀錄",
    inspection_item: "巡店題目",
    inspection_items: "巡店題目",
    store_extra_items: "店別附加題目",
    improvement_tasks: "改善任務",
    inspection_photos: "巡店照片",
    qa_cleanup: "QA 測試資料清理",
  };

  return labels[entityType] ?? entityType;
}

function getBooleanLabel(value: unknown) {
  return value ? "啟用" : "停用";
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
        parts.push(`狀態：${getBooleanLabel(details.is_active)}`);
      }
      break;

    case "update_authorized_user_status":
      if ("is_active" in details) {
        parts.push(`狀態：${getBooleanLabel(details.is_active)}`);
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
      if (typeof details.default_workstation_name === "string") {
        parts.push(`常用工作站：${details.default_workstation_name}`);
      }
      break;

    case "archive_staff_member":
      parts.push("狀態：已封存");
      break;

    case "restore_staff_member":
      parts.push("狀態：恢復在職");
      break;

    case "create_workstation":
    case "update_workstation":
      if (typeof details.name === "string") parts.push(`名稱：${details.name}`);
      if (typeof details.code === "string") parts.push(`代碼：${details.code}`);
      if (typeof details.area === "string") {
        parts.push(`區域：${getShiftRoleLabel(details.area as "kitchen" | "floor" | "counter")}`);
      }
      if ("store_id" in details) {
        parts.push(`適用店別：${getStoreName(details.store_id, storeNamesById) ?? "全部店通用"}`);
      }
      if ("is_active" in details) {
        parts.push(`狀態：${getBooleanLabel(details.is_active)}`);
      }
      break;

    case "set_focus_items":
      if (typeof details.type === "string") {
        parts.push(`標籤：${getInspectionTagLabel(details.type as InspectionTagType)}`);
      }
      if (typeof details.month === "string" && details.month) {
        parts.push(`月份：${details.month}`);
      }
      if ("store_id" in details) {
        parts.push(`店別：${getStoreName(details.store_id, storeNamesById) ?? "全部店通用"}`);
      }
      if (typeof details.source === "string") {
        parts.push(`來源：${getInspectionTagSourceLabel(details.source as InspectionTagSource)}`);
      }
      if (Array.isArray(details.item_ids)) {
        parts.push(`題目數：${details.item_ids.length}`);
      }
      break;

    case "set_store_extra_items":
      if (Array.isArray(details.item_ids)) {
        parts.push(`題目數：${details.item_ids.length}`);
      }
      break;

    case "update_inspection_item_status":
      if ("is_active" in details) {
        parts.push(`狀態：${getBooleanLabel(details.is_active)}`);
      }
      break;

    case "create_inspection_item":
    case "update_inspection_item":
      if (typeof details.name === "string") parts.push(`題目：${details.name}`);
      if ("is_base" in details) {
        parts.push(`類型：${details.is_base ? "基礎題目" : "店別加題"}`);
      }
      if ("is_active" in details) {
        parts.push(`狀態：${getBooleanLabel(details.is_active)}`);
      }
      if (Array.isArray(details.store_ids) && details.store_ids.length > 0) {
        parts.push(`適用店別：${details.store_ids.length} 間`);
      }
      break;

    case "create_inspection":
    case "update_inspection":
      if (details.store_id) {
        parts.push(`店別：${getStoreName(details.store_id, storeNamesById)}`);
      }
      if (typeof details.date === "string") parts.push(`日期：${details.date}`);
      if (typeof details.time_slot === "string") parts.push(`時段：${details.time_slot}`);
      if (typeof details.total_score === "string") parts.push(`平均分數：${details.total_score}`);
      break;

    case "update_improvement_task_status":
      if (typeof details.status === "string") {
        parts.push(
          `狀態：${getImprovementStatusLabel(
            details.status as "pending" | "resolved" | "verified" | "superseded",
          )}`,
        );
      }
      break;

    case "cleanup_qa_test_data":
      if (typeof details.stores === "number") parts.push(`店別：${details.stores}`);
      if (typeof details.users === "number") parts.push(`帳號：${details.users}`);
      if (typeof details.staff_members === "number") parts.push(`組員：${details.staff_members}`);
      if (typeof details.inspections === "number") parts.push(`巡店：${details.inspections}`);
      if (typeof details.scoped_tags === "number") parts.push(`標籤：${details.scoped_tags}`);
      break;

    default:
      for (const [key, value] of Object.entries(details)) {
        if (key.endsWith("_id")) continue;
        if (Array.isArray(value)) {
          parts.push(`${key}：${value.length} 筆`);
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

  return parts.join(" / ") || "沒有額外細節";
}
