import { createClient } from "@supabase/supabase-js";

// ─── 单例客户端 ───────────────────────────────────────────────────────────────

let cachedClient = null;
let cachedUrl = null;
let cachedKey = null;

export function createSupabaseClient(url, anonKey) {
  if (!url || !anonKey) return null;
  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(url, anonKey);
    cachedUrl = url;
    cachedKey = anonKey;
    return cachedClient;
  } catch {
    return null;
  }
}

export function clearSupabaseClient() {
  cachedClient = null;
  cachedUrl = null;
  cachedKey = null;
}

// ─── 配置读写 ─────────────────────────────────────────────────────────────────

export function getSupabaseConfig() {
  if (typeof window === "undefined") return { url: "", key: "", enabled: false };
  return {
    url: localStorage.getItem("supabase_url") || "",
    key: localStorage.getItem("supabase_key") || "",
    enabled: localStorage.getItem("supabase_enabled") === "true",
  };
}

export function saveSupabaseConfig(url, key, enabled) {
  localStorage.setItem("supabase_url", url);
  localStorage.setItem("supabase_key", key);
  localStorage.setItem("supabase_enabled", String(enabled));
}

// ─── 任务（ps_tasks） ─────────────────────────────────────────────────────────

/**
 * 将本地 task 对象转换为数据库行格式
 * task 可以是主任务或子任务
 */
function taskToRow(task, dateStr) {
  return {
    id: task.id,
    date: dateStr,
    title: task.title,
    completed: !!task.completed,
    time_spent: task.timeSpent || 0,
    focus_time: task.focusTime || 0,
    created_at: task.createdAt instanceof Date
      ? task.createdAt.toISOString()
      : task.createdAt || new Date().toISOString(),
    tag_id: task.tag || null,
    parent_task_id: task.parentTaskId || null,
    subtasks_expanded: task.subtasksExpanded || false,
    is_deleted: false,
    updated_at: new Date().toISOString(),
  };
}

/** 将数据库行转换为本地 task 对象 */
function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    completed: !!row.completed,
    timeSpent: row.time_spent || 0,
    focusTime: row.focus_time || 0,
    createdAt: new Date(row.created_at),
    tag: row.tag_id || undefined,
    parentTaskId: row.parent_task_id || undefined,
    subtasksExpanded: row.subtasks_expanded || false,
    subtasks: [], // 子任务在 fetchTasksByDate 中组装
  };
}

/**
 * upsert 一条任务（主任务或子任务）
 * @param {object} supabase
 * @param {object} task - 本地 task 对象
 * @param {string} dateStr - "YYYY-MM-DD"
 */
export async function upsertTask(supabase, task, dateStr) {
  const { error } = await supabase
    .from("ps_tasks")
    .upsert(taskToRow(task, dateStr), { onConflict: "id" });
  if (error) throw error;
}

/**
 * 软删除一条任务（主任务删除时同时软删除其所有子任务）
 */
export async function softDeleteTask(supabase, id) {
  const now = new Date().toISOString();
  // 软删除主任务
  const { error: e1 } = await supabase
    .from("ps_tasks")
    .update({ is_deleted: true, updated_at: now })
    .eq("id", id);
  if (e1) throw e1;
  // 软删除所有子任务
  const { error: e2 } = await supabase
    .from("ps_tasks")
    .update({ is_deleted: true, updated_at: now })
    .eq("parent_task_id", id);
  if (e2) throw e2;
}

/**
 * 仅软删除主任务行本身，不触碰子任务
 * 用于 transfer 场景：子任务会通过 upsert 迁移，不需要软删
 */
export async function softDeleteTaskOnly(supabase, id) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ps_tasks")
    .update({ is_deleted: true, updated_at: now })
    .eq("id", id);
  if (error) throw error;
}

/**
 * 按日期拉取所有未删除的任务（含子任务），并组装成主任务列表
 * 主任务按 date 查，子任务按 parent_task_id 查，避免子任务 date 不一致的问题
 */
export async function fetchTasksByDate(supabase, dateStr) {
  // Step 1: 拉主任务（parent_task_id 为空）
  const { data: mainData, error: e1 } = await supabase
    .from("ps_tasks")
    .select("*")
    .eq("date", dateStr)
    .is("parent_task_id", null)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (e1) throw e1;
  if (!mainData || mainData.length === 0) return [];

  // Step 2: 按 parent_task_id 拉所有子任务
  const mainIds = mainData.map((r) => r.id);
  const { data: subData, error: e2 } = await supabase
    .from("ps_tasks")
    .select("*")
    .in("parent_task_id", mainIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (e2) throw e2;

  // 组装
  const taskMap = {};
  mainData.map(rowToTask).forEach((t) => { taskMap[t.id] = t; });
  (subData || []).map(rowToTask).forEach((t) => {
    const parent = taskMap[t.parentTaskId];
    if (parent) parent.subtasks.push(t);
  });

  return mainData.map((r) => taskMap[r.id]);
}

// ─── 习惯（ps_habits） ────────────────────────────────────────────────────────

function habitToRow(habit) {
  return {
    id: habit.id,
    name: habit.name,
    tag_id: habit.tag || null,
    completed_dates: habit.completedDates || [],
    is_deleted: false,
    updated_at: new Date().toISOString(),
  };
}

function rowToHabit(row) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag_id || undefined,
    completedDates: row.completed_dates || [],
  };
}

export async function upsertHabit(supabase, habit) {
  const { error } = await supabase
    .from("ps_habits")
    .upsert(habitToRow(habit), { onConflict: "id" });
  if (error) throw error;
}

export async function softDeleteHabit(supabase, id) {
  const { error } = await supabase
    .from("ps_habits")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchAllHabits(supabase) {
  const { data, error } = await supabase
    .from("ps_habits")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToHabit);
}

// ─── 标签（ps_tags） ──────────────────────────────────────────────────────────

function tagToRow(tag) {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color || null,
    is_deleted: false,
    updated_at: new Date().toISOString(),
  };
}

function rowToTag(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color || "#888888",
  };
}

export async function upsertTag(supabase, tag) {
  const { error } = await supabase
    .from("ps_tags")
    .upsert(tagToRow(tag), { onConflict: "id" });
  if (error) throw error;
}

export async function softDeleteTag(supabase, id) {
  const { error } = await supabase
    .from("ps_tags")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchAllTags(supabase) {
  const { data, error } = await supabase
    .from("ps_tags")
    .select("*")
    .eq("is_deleted", false)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToTag);
}
