"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { DayNightCycle, AnimatedNumber } from "@/components/day-night-cycle";
import { AnimatedYear } from "@/components/animated-year";
import { WeeklyCalendar } from "@/components/weekly-calender";
import { TaskList } from "@/components/task-list";
import { Timer, Plus, BarChart3, Settings, CheckCircle, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddTaskModal } from "@/components/add-task-modal";
import { TaskOptionsModal } from "@/components/task-options-modal";
import { AddSubtaskModal } from "@/components/add-subtask-modal";
import { HabitTracker } from "@/components/habit-tracker";
import { TimerModal } from "@/components/timer-modal";
import { SettingsModal } from "@/components/settings-modal";
import { IntroScreen } from "@/components/intro-screen";
import { WebRTCShareModal } from "@/components/webrtc-share-modal";
import {
  createSupabaseClient,
  getSupabaseConfig,
  upsertTask,
  softDeleteTask,
  fetchTasksByDate,
  upsertHabit,
  softDeleteHabit,
  fetchAllHabits,
  upsertTag,
  softDeleteTag,
  fetchAllTags,
} from "@/lib/supabase";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState("default");
  const [dailyTasks, setDailyTasks] = useState({});
  const [customTags, setCustomTags] = useState([]);
  const [habits, setHabits] = useState([]);
  const [showTimer, setShowTimer] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState(null);
  const [showWebRTCShare, setShowWebRTCShare] = useState(false);
  // 记录已从 Supabase 拉取过的日期，避免重复请求
  const pulledDates = useRef(new Set());
  // 标记是否正在从远端拉取，避免 useEffect 回写
  const isSyncingFromRemote = useRef(false);

  // 获取 Supabase 客户端（如果未启用返回 null）
  const getSupabase = useCallback(() => {
    const config = getSupabaseConfig();
    if (!config.enabled || !config.url || !config.key) return null;
    return createSupabaseClient(config.url, config.key);
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Only load business data from localStorage when Supabase is not enabled
    const supabaseConfig = getSupabaseConfig();
    const supabaseEnabled = supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.key;

    if (!supabaseEnabled) {
      const savedDailyTasks = localStorage.getItem("dailyTasks");
      if (savedDailyTasks) {
        const parsed = JSON.parse(savedDailyTasks);
        // Convert date strings back to Date objects and ensure all fields exist
        const converted = {};
        Object.keys(parsed).forEach((dateKey) => {
          converted[dateKey] = parsed[dateKey].map((task) => {
            // Ensure subtasks are properly structured
            const processedSubtasks = (task.subtasks || []).map((subtask) => ({
              ...subtask,
              createdAt: new Date(subtask.createdAt || task.createdAt),
              focusTime: subtask.focusTime || 0,
              timeSpent: subtask.timeSpent || 0,
              completed: !!subtask.completed,
              parentTaskId: task.id,
              subtasks: [], // Subtasks don't have their own subtasks
            }));

            return {
              ...task,
              createdAt: new Date(task.createdAt),
              focusTime: task.focusTime || 0,
              timeSpent: task.timeSpent || 0,
              completed: !!task.completed,
              subtasks: processedSubtasks,
              subtasksExpanded: task.subtasksExpanded || false,
            };
          });
        });
        setDailyTasks(converted);
      }

      const savedCustomTags = localStorage.getItem("customTags");
      if (savedCustomTags) {
        setCustomTags(JSON.parse(savedCustomTags));
      }

      const savedHabits = localStorage.getItem("habits");
      if (savedHabits) {
        setHabits(JSON.parse(savedHabits));
      }
    }
  }, []);

  // Apply theme classes to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove(
      "theme-nature",
      "theme-neo-brutal",
      "theme-modern",
      "theme-pastel-dream",
      "theme-quantum-rose",
      "theme-twitter",
      "theme-amber-minimal"
    );

    // Add current theme class (except for default)
    if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }

    // Handle dark mode
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showIntroScreen) return;

      const isEscapePressed = event.key === "Escape";

      if (isEscapePressed) {
        setShowAddTask(false);
        setShowHabits(false);
        setShowTimer(false);
        setShowSettings(false);
        setShowTaskOptions(false);
        setShowAddSubtask(false);
        return;
      }

      if (
        showAddTask ||
        showHabits ||
        showTimer ||
        showSettings ||
        showTaskOptions ||
        showAddSubtask ||
        showWebRTCShare
      ) {
        return;
      }

      const isModifierPressed = event.ctrlKey || event.metaKey; // Ctrl for Windows/Linux, Cmd for Mac

      if (isModifierPressed) {
        switch (event.key.toLowerCase()) {
          case "a": // Ctrl/Cmd + A for Add Task
            event.preventDefault();
            setShowAddTask(true);
            break;
          case "h": // Ctrl/Cmd + H for Habits
            event.preventDefault();
            setShowHabits(true);
            break;
          case "c": // Ctrl/Cmd + C for Timer
            event.preventDefault();
            setShowTimer(true);
            break;
          case "x": // Ctrl/Cmd + X for Settings
            event.preventDefault();
            setShowSettings(true);
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showAddTask,
    showHabits,
    showTimer,
    showSettings,
    showTaskOptions,
    showAddSubtask,
    showWebRTCShare,
    showIntroScreen,
  ]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!getSupabase()) {
      localStorage.setItem("dailyTasks", JSON.stringify(dailyTasks));
    }
  }, [dailyTasks, getSupabase]);

  useEffect(() => {
    if (!getSupabase()) {
      localStorage.setItem("customTags", JSON.stringify(customTags));
    }
  }, [customTags, getSupabase]);

  useEffect(() => {
    if (!getSupabase()) {
      localStorage.setItem("habits", JSON.stringify(habits));
    }
  }, [habits, getSupabase]);


  const getDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getCurrentDayTasks = () => {
    const dateString = getDateString(selectedDate);
    return dailyTasks[dateString] || [];
  };

  const generateDailyHabitTasks = (habits, selectedDate) => {
    const dateString = getDateString(selectedDate);
    return habits.map((habit) => ({
      id: `habit-${habit.id}-${dateString}`,
      title: habit.name,
      completed: habit.completedDates.includes(dateString),
      timeSpent: 0,
      focusTime: 0,
      createdAt: selectedDate,
      isHabit: true,
      habitId: habit.id,
      tag: habit.tag,
      subtasks: [], // Habits don't have subtasks
    }));
  };

  const importDataFromWebRTC = (data) => {
    try {
      let importStats = {
        newTasks: 0,
        newSubtasks: 0,
        newTags: 0,
        newHabits: 0,
        updatedTasks: 0,
        updatedSettings: [],
      };

      // Create tag mapping for imported data
      const tagMapping = new Map(); // oldTagId -> newTagId

      // 1. Merge Custom Tags FIRST (we need the mapping for tasks)
      if (data.customTags) {
        setCustomTags((prevTags) => {
          const newTags = [];

          data.customTags.forEach((incomingTag) => {
            const existingTag = prevTags.find(
              (existing) =>
                existing.name.toLowerCase() === incomingTag.name.toLowerCase()
            );

            if (existingTag) {
              // Tag exists, map old ID to existing ID
              tagMapping.set(incomingTag.id, existingTag.id);
            } else {
              // New tag - generate new ID to avoid conflicts
              const newTagId = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;
              tagMapping.set(incomingTag.id, newTagId);

              newTags.push({
                ...incomingTag,
                id: newTagId,
              });
              importStats.newTags++;
            }
          });

          return [...prevTags, ...newTags];
        });
      }

      // 2. Merge Daily Tasks (with proper tag mapping and completion sync)
      if (data.dailyTasks) {
        setDailyTasks((prevDailyTasks) => {
          const mergedDailyTasks = { ...prevDailyTasks };

          Object.keys(data.dailyTasks).forEach((dateKey) => {
            const incomingTasks = data.dailyTasks[dateKey];
            const existingTasks = mergedDailyTasks[dateKey] || [];

            // Convert incoming tasks to proper format with mapped tag IDs
            const processedIncomingTasks = incomingTasks.map((task) => {
              // Map the tag ID if it exists in our mapping
              const mappedTagId =
                task.tag && tagMapping.has(task.tag)
                  ? tagMapping.get(task.tag)
                  : task.tag;

              return {
                ...task,
                // We keep original IDs for matching, but will generate new ones for new tasks
                originalId: task.id,
                createdAt: new Date(task.createdAt),
                focusTime: task.focusTime || 0,
                timeSpent: task.timeSpent || 0,
                completed: !!task.completed,
                tag: mappedTagId, // Use mapped tag ID
                subtasks: (task.subtasks || []).map((subtask) => {
                  // Map subtask tag ID as well
                  const mappedSubtaskTagId =
                    subtask.tag && tagMapping.has(subtask.tag)
                      ? tagMapping.get(subtask.tag)
                      : subtask.tag;

                  return {
                    ...subtask,
                    // Keep original IDs for matching
                    originalId: subtask.id,
                    createdAt: new Date(subtask.createdAt || task.createdAt),
                    focusTime: subtask.focusTime || 0,
                    timeSpent: subtask.timeSpent || 0,
                    completed: !!subtask.completed,
                    parentTaskId: task.id,
                    tag: mappedSubtaskTagId, // Use mapped tag ID
                    subtasks: [],
                  };
                }),
                subtasksExpanded: task.subtasksExpanded || false,
              };
            });

            const newOrUpdatedTasksForDate = [...existingTasks];

            processedIncomingTasks.forEach((incomingTask) => {
              // Find existing task by title (more reliable than ID across different clients)
              const existingTaskIndex = newOrUpdatedTasksForDate.findIndex(
                (existing) =>
                  existing.title.toLowerCase().trim() ===
                    incomingTask.title.toLowerCase().trim() && !existing.isHabit
              );

              if (existingTaskIndex === -1) {
                // Completely new task - generate new ID to avoid conflicts
                const newTaskId = `${Date.now()}-${Math.random()
                  .toString(36)
                  .substring(2, 8)}-${Math.random()
                  .toString(36)
                  .substring(2, 4)}`;

                newOrUpdatedTasksForDate.push({
                  ...incomingTask,
                  id: newTaskId,
                  subtasks: (incomingTask.subtasks || []).map((subtask) => ({
                    ...subtask,
                    id: `${newTaskId}-subtask-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 8)}`,
                    parentTaskId: newTaskId,
                  })),
                });

                importStats.newTasks++;
                importStats.newSubtasks += (incomingTask.subtasks || []).length;
              } else {
                // Existing task - sync completion status and subtasks
                const existingTask =
                  newOrUpdatedTasksForDate[existingTaskIndex];
                let taskWasUpdated = false;

                // 1. Sync parent task completion status
                const updatedCompletedStatus = incomingTask.completed;
                if (existingTask.completed !== updatedCompletedStatus) {
                  existingTask.completed = updatedCompletedStatus;
                  taskWasUpdated = true;
                }

                // 2. Sync subtasks
                const mergedSubtasks = [...(existingTask.subtasks || [])];

                (incomingTask.subtasks || []).forEach((incomingSubtask) => {
                  const existingSubtaskIndex = mergedSubtasks.findIndex(
                    (existing) =>
                      existing.title.toLowerCase().trim() ===
                      incomingSubtask.title.toLowerCase().trim()
                  );

                  if (existingSubtaskIndex !== -1) {
                    // Subtask exists: update its completion status
                    const existingSubtask =
                      mergedSubtasks[existingSubtaskIndex];
                    if (
                      existingSubtask.completed !== incomingSubtask.completed
                    ) {
                      existingSubtask.completed = incomingSubtask.completed;
                      taskWasUpdated = true;
                    }
                  } else {
                    // New subtask for an existing task: add it
                    const newSubtaskId = `${
                      existingTask.id
                    }-subtask-${Date.now()}-${Math.random()
                      .toString(36)
                      .substring(2, 8)}`;
                    mergedSubtasks.push({
                      ...incomingSubtask,
                      id: newSubtaskId,
                      parentTaskId: existingTask.id,
                    });
                    importStats.newSubtasks++;
                    taskWasUpdated = true;
                  }
                });

                // 3. Update the task in the array if anything changed
                if (taskWasUpdated) {
                  existingTask.subtasks = mergedSubtasks;
                  newOrUpdatedTasksForDate[existingTaskIndex] = existingTask;
                  importStats.updatedTasks++;
                }
              }
            });

            mergedDailyTasks[dateKey] = newOrUpdatedTasksForDate;
          });

          return mergedDailyTasks;
        });
      }

      // 3. Merge Habits (FIXED: with proper tag mapping for both new and existing habits)
      if (data.habits) {
        setHabits((prevHabits) => {
          const updatedHabits = [...prevHabits];

          data.habits.forEach((incomingHabit) => {
            const existingHabitIndex = updatedHabits.findIndex(
              (existing) =>
                existing.name.toLowerCase().trim() ===
                incomingHabit.name.toLowerCase().trim()
            );

            // Map the tag ID if it exists in our mapping
            const mappedTagId =
              incomingHabit.tag && tagMapping.has(incomingHabit.tag)
                ? tagMapping.get(incomingHabit.tag)
                : incomingHabit.tag;

            if (existingHabitIndex === -1) {
              // New Habit
              const newHabitId = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}`;
              updatedHabits.push({
                ...incomingHabit,
                id: newHabitId,
                tag: mappedTagId, // Use mapped tag ID
                completedDates: incomingHabit.completedDates || [],
              });
              importStats.newHabits++;
            } else {
              // FIXED: Existing Habit - merge completion dates AND update tag
              const existingHabit = updatedHabits[existingHabitIndex];
              const mergedCompletedDates = [
                ...new Set([
                  ...(existingHabit.completedDates || []),
                  ...(incomingHabit.completedDates || []),
                ]),
              ];

              updatedHabits[existingHabitIndex] = {
                ...existingHabit,
                completedDates: mergedCompletedDates,
                tag: mappedTagId, // FIXED: Apply mapped tag ID to existing habits too
              };
            }
          });

          return updatedHabits;
        });
      }

      // 4. Optionally update settings (ask user first)
      const settingsToUpdate = [];
      if (typeof data.darkMode === "boolean" && data.darkMode !== darkMode) {
        settingsToUpdate.push("dark mode");
      }
      if (data.theme && data.theme !== theme) {
        settingsToUpdate.push("theme");
      }

      if (settingsToUpdate.length > 0) {
        const updateSettings = confirm(
          `Do you want to update your ${settingsToUpdate.join(
            " and "
          )} settings to match the imported data?`
        );

        if (updateSettings) {
          if (typeof data.darkMode === "boolean") {
            setDarkMode(data.darkMode);
            importStats.updatedSettings.push("dark mode");
          }
          if (data.theme) {
            setTheme(data.theme);
            importStats.updatedSettings.push("theme");
          }
        }
      }

      // Show detailed import summary
      const summaryParts = [];
      if (importStats.newTasks > 0)
        summaryParts.push(`${importStats.newTasks} new task(s)`);
      if (importStats.updatedTasks > 0)
        summaryParts.push(`${importStats.updatedTasks} updated task(s)`);
      if (importStats.newSubtasks > 0)
        summaryParts.push(`${importStats.newSubtasks} new subtask(s)`);
      if (importStats.newTags > 0)
        summaryParts.push(`${importStats.newTags} new tag(s)`);
      if (importStats.newHabits > 0)
        summaryParts.push(`${importStats.newHabits} new habit(s)`);
      if (importStats.updatedSettings.length > 0)
        summaryParts.push(
          `updated ${importStats.updatedSettings.join(" and ")}`
        );

      const totalChanges =
        importStats.newTasks +
        importStats.updatedTasks +
        importStats.newSubtasks +
        importStats.newTags +
        importStats.newHabits;

      if (totalChanges === 0 && importStats.updatedSettings.length === 0) {
        alert(
          "Sync completed! No new items were found - all data was already in sync."
        );
      } else {
        const summaryMessage =
          summaryParts.length > 0
            ? `Sync successful! Merged/Updated: ${summaryParts.join(", ")}.`
            : "Sync completed!";
        alert(summaryMessage);
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Error processing synced data. Please try again.");
    }
  };

  // Helper function to find a task by ID (including subtasks)
  const findTaskById = (taskId, taskList = null) => {
    const tasksToSearch = taskList || getCurrentDayTasks();

    for (const task of tasksToSearch) {
      if (task.id === taskId) {
        return task;
      }
      // Search in subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
          if (subtask.id === taskId) {
            return subtask;
          }
        }
      }
    }
    return null;
  };

  // Helper function to update a task (including subtasks)
  const updateTaskInList = (taskId, updates, taskList) => {
    return taskList.map((task) => {
      if (task.id === taskId) {
        return { ...task, ...updates };
      }
      // Update subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        const updatedSubtasks = task.subtasks.map((subtask) =>
          subtask.id === taskId ? { ...subtask, ...updates } : subtask
        );
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    });
  };

  // Helper function to remove a task (including subtasks)
  const removeTaskFromList = (taskId, taskList) => {
    return taskList
      .map((task) => {
        // Remove from subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const filteredSubtasks = task.subtasks.filter(
            (subtask) => subtask.id !== taskId
          );
          return { ...task, subtasks: filteredSubtasks };
        }
        return task;
      })
      .filter((task) => task.id !== taskId); // Remove main task
  };

  const toggleTask = (id) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const dailyHabitTasks = generateDailyHabitTasks(habits, selectedDate);
    const allTasks = [...currentTasks, ...dailyHabitTasks];
    const task = findTaskById(id, allTasks);
    const supabase = getSupabase();

    if (task?.isHabit && task.habitId) {
      const updatedHabits = habits.map((habit) => {
        if (habit.id === task.habitId) {
          const completedDates = task.completed
            ? habit.completedDates.filter((d) => d !== dateString)
            : [...habit.completedDates, dateString];
          return { ...habit, completedDates };
        }
        return habit;
      });
      setHabits(updatedHabits);
    } else {
      const newCompleted = !task.completed;
      const updatedTasks = updateTaskInList(id, { completed: newCompleted }, currentTasks);
      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
      if (supabase) {
        upsertTask(supabase, { ...task, completed: newCompleted }, dateString).catch(console.error);
      }
    }
  };

  const addTask = (title, tagId, taskDate = selectedDate) => {
    const dateString = getDateString(taskDate);
    const currentTasks = dailyTasks[dateString] || [];
    const newTask = {
      id: Date.now().toString(),
      title,
      completed: false,
      timeSpent: 0,
      focusTime: 0,
      createdAt: taskDate,
      tag: tagId,
      subtasks: [],
      subtasksExpanded: false,
    };
    setDailyTasks({ ...dailyTasks, [dateString]: [...currentTasks, newTask] });
    const supabase = getSupabase();
    if (supabase) upsertTask(supabase, newTask, dateString).catch(console.error);
  };

  const addSubtask = (parentTaskId, title, tagId) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();

    const newSubtask = {
      id: `${parentTaskId}-subtask-${Date.now()}`,
      title,
      completed: false,
      timeSpent: 0,
      focusTime: 0,
      createdAt: selectedDate,
      tag: tagId,
      parentTaskId,
      subtasks: [],
    };

    const updatedTasks = currentTasks.map((task) => {
      if (task.id === parentTaskId) {
        const currentSubtasks = task.subtasks || [];
        return {
          ...task,
          subtasks: [...currentSubtasks, newSubtask],
          subtasksExpanded: true,
        };
      }
      return task;
    });

    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    const supabase = getSupabase();
    if (supabase) upsertTask(supabase, newSubtask, dateString).catch(console.error);
  };

  const handleAddSubtask = (parentTaskId) => {
    const parentTask = findTaskById(parentTaskId);
    if (parentTask && !parentTask.isHabit) {
      // Ensure the parent task has subtasks array initialized
      const dateString = getDateString(selectedDate);
      const currentTasks = getCurrentDayTasks();

      // Update parent task to ensure subtasks array exists
      const updatedTasks = currentTasks.map((task) => {
        if (task.id === parentTaskId) {
          return {
            ...task,
            subtasks: task.subtasks || [], // Ensure subtasks array exists
            subtasksExpanded: true, // Pre-expand for adding
          };
        }
        return task;
      });

      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
      setParentTaskForSubtask(parentTask);
      setShowAddSubtask(true);
    }
  };

  const updateTask = (taskId, updates) => {
    // 如果是 habit 生成的虚拟 task，更新对应 habit 的字段
    const allTasks = [...getCurrentDayTasks(), ...generateDailyHabitTasks(habits, selectedDate)];
    const targetTask = findTaskById(taskId, allTasks);
    if (targetTask?.isHabit && targetTask.habitId) {
      const habitUpdates = {};
      if (updates.title !== undefined) habitUpdates.name = updates.title;
      if (updates.tag !== undefined) habitUpdates.tag = updates.tag;
      if (Object.keys(habitUpdates).length > 0) {
        setHabits((prev) =>
          prev.map((h) => h.id === targetTask.habitId ? { ...h, ...habitUpdates } : h)
        );
      }
      return;
    }

    // 先从当前 state 找到 task（含 subtask），用于 Supabase 同步
    let foundTask = null;
    let foundDateKey = null;

    Object.keys(dailyTasks).forEach((dateKey) => {
      if (foundTask) return;
      const t = findTaskById(taskId, dailyTasks[dateKey]);
      if (t) {
        foundTask = t;
        foundDateKey = dateKey;
      }
    });

    if (!foundTask) return;

    const updatedTask = { ...foundTask, ...updates };
    const newDateKey = getDateString(new Date(updatedTask.createdAt));
    const isSubtask = !!foundTask.parentTaskId;

    if (isSubtask) {
      // subtask：用 updateTaskInList 更新嵌套结构
      setDailyTasks((prev) => ({
        ...prev,
        [foundDateKey]: updateTaskInList(taskId, updates, prev[foundDateKey] || []),
      }));
    } else {
      // 主任务：可能涉及日期变更
      setDailyTasks((prev) => {
        const newDailyTasks = {};
        Object.keys(prev).forEach((dk) => {
          newDailyTasks[dk] = [...prev[dk]];
        });

        // 从旧日期移除
        if (newDailyTasks[foundDateKey]) {
          newDailyTasks[foundDateKey] = newDailyTasks[foundDateKey].filter(
            (t) => t.id !== taskId
          );
          if (newDailyTasks[foundDateKey].length === 0) {
            delete newDailyTasks[foundDateKey];
          }
        }

        // 插入新日期
        newDailyTasks[newDateKey] = [
          ...(newDailyTasks[newDateKey] || []),
          updatedTask,
        ];

        return newDailyTasks;
      });
    }

    const supabase = getSupabase();
    if (supabase) {
      upsertTask(supabase, updatedTask, isSubtask ? foundDateKey : newDateKey).catch(console.error);
    }
  };

  const deleteTask = (id) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const supabase = getSupabase();

    if (id.startsWith("habit-")) {
      const habitId = id.split("-")[1];
      setHabits(habits.filter((habit) => habit.id !== habitId));
    } else {
      const updatedTasks = removeTaskFromList(id, currentTasks);
      setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
      // softDeleteTask 会同时软删除所有子任务
      if (supabase) softDeleteTask(supabase, id).catch(console.error);
    }
  };

  const updateTaskTime = (id, timeToAdd) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const task = findTaskById(id, currentTasks);
    const newTimeSpent = (task?.timeSpent || 0) + timeToAdd;
    const updatedTasks = updateTaskInList(id, { timeSpent: newTimeSpent }, currentTasks);
    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    const supabase = getSupabase();
    if (supabase && task) {
      upsertTask(supabase, { ...task, timeSpent: newTimeSpent }, dateString).catch(console.error);
    }
  };

  const transferTaskToCurrentDay = (taskId, originalDate, targetDate) => {
    const originalDateString = getDateString(originalDate);
    const targetDateString = getDateString(targetDate);

    if (originalDateString === targetDateString) return;

    let transferredTask = null;

    setDailyTasks((prevDailyTasks) => {
      const newDailyTasks = { ...prevDailyTasks };
      const originalDayTasks = newDailyTasks[originalDateString] || [];
      const taskToTransfer = findTaskById(taskId, originalDayTasks);

      if (!taskToTransfer) {
        console.warn("Task not found for transfer:", taskId, originalDateString);
        return prevDailyTasks;
      }

      const updatedOriginalTasks = removeTaskFromList(taskId, originalDayTasks);
      newDailyTasks[originalDateString] = updatedOriginalTasks;

      transferredTask = {
        ...taskToTransfer,
        createdAt: targetDate,
        subtasks: (taskToTransfer.subtasks || []).map((subtask) => ({
          ...subtask,
          createdAt: targetDate,
        })),
      };

      newDailyTasks[targetDateString] = [
        ...(newDailyTasks[targetDateString] || []),
        transferredTask,
      ];

      if (newDailyTasks[originalDateString]?.length === 0) {
        delete newDailyTasks[originalDateString];
      }

      return newDailyTasks;
    });

    const supabase = getSupabase();
    if (supabase && transferredTask) {
      upsertTask(supabase, transferredTask, targetDateString).catch(console.error);
    }
  };

  const updateTaskFocusTime = (id, focusTimeToAdd) => {
    const dateString = getDateString(selectedDate);
    const currentTasks = getCurrentDayTasks();
    const task = findTaskById(id, currentTasks);
    const newFocusTime = (task?.focusTime || 0) + focusTimeToAdd;
    const updatedTasks = updateTaskInList(id, { focusTime: newFocusTime }, currentTasks);
    setDailyTasks({ ...dailyTasks, [dateString]: updatedTasks });
    const supabase = getSupabase();
    if (supabase && task) {
      upsertTask(supabase, { ...task, focusTime: newFocusTime }, dateString).catch(console.error);
    }
  };

  // 供 HabitTracker 使用：批量更新 habits 并同步到 Supabase
  const updateHabits = useCallback((newHabitsOrUpdater) => {
    setHabits((prev) => {
      const next = typeof newHabitsOrUpdater === "function"
        ? newHabitsOrUpdater(prev)
        : newHabitsOrUpdater;
      return next;
    });
  }, []);

  // 监听 habits 变化，同步到 Supabase
  const prevHabitsRef = useRef(habits);
  useEffect(() => {
    const prev = prevHabitsRef.current;
    prevHabitsRef.current = habits;
    // 如果正在从远端拉取，跳过回写
    if (isSyncingFromRemote.current) return;
    const supabase = getSupabase();
    if (!supabase) return;
    // 跳过初始空数组（mount 时 habits 为 []）
    if (prev.length === 0 && habits.length === 0) return;
    // 找出新增或变更的 habits
    const prevMap = {};
    prev.forEach((h) => { prevMap[h.id] = h; });
    habits.forEach((h) => {
      if (!prevMap[h.id] || JSON.stringify(prevMap[h.id]) !== JSON.stringify(h)) {
        upsertHabit(supabase, h).catch(console.error);
      }
    });
    // 找出被删除的 habits
    const nextIds = new Set(habits.map((h) => h.id));
    prev.forEach((h) => {
      if (!nextIds.has(h.id)) {
        softDeleteHabit(supabase, h.id).catch(console.error);
      }
    });
  }, [habits, getSupabase]);

  const addCustomTag = (name, color) => {
    const newTag = {
      id: Date.now().toString(),
      name,
      color,
    };
    setCustomTags([...customTags, newTag]);
    const supabase = getSupabase();
    if (supabase) upsertTag(supabase, newTag).catch(console.error);
    return newTag.id;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskOptions(true);
  };

  const exportData = () => {
    const data = {
      dailyTasks,
      customTags,
      habits,
      darkMode,
      theme,
      exportDate: new Date().toISOString(),
      version: "3.0", // Update version for subtasks support
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todo-app-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowSettings(false); // Close settings after export
  };

  const importData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result);
            if (data.dailyTasks) {
              // Convert date strings back to Date objects and ensure backward compatibility
              const converted = {};
              Object.keys(data.dailyTasks).forEach((dateKey) => {
                converted[dateKey] = data.dailyTasks[dateKey].map((task) => ({
                  ...task,
                  createdAt: new Date(task.createdAt),
                  focusTime: task.focusTime || 0, // Ensure focusTime exists
                  subtasks: task.subtasks || [], // Ensure subtasks array exists
                  subtasksExpanded: task.subtasksExpanded || false, // Ensure expansion state exists
                  // For subtasks, ensure they have the required fields
                  ...(task.subtasks && {
                    subtasks: task.subtasks.map((subtask) => ({
                      ...subtask,
                      createdAt: new Date(subtask.createdAt || task.createdAt),
                      focusTime: subtask.focusTime || 0,
                      timeSpent: subtask.timeSpent || 0,
                      subtasks: [], // Subtasks don't have their own subtasks
                    })),
                  }),
                }));
              });
              setDailyTasks(converted);
            }
            if (data.customTags) setCustomTags(data.customTags);
            if (data.habits) setHabits(data.habits);
            if (typeof data.darkMode === "boolean") setDarkMode(data.darkMode);
            if (data.theme) setTheme(data.theme);
            alert("Data imported successfully!");
            setShowSettings(false); // Close settings after import
          } catch (error) {
            alert("Error importing data. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const updateCustomTag = (tagId, updates) => {
    const updatedTag = customTags.find((t) => t.id === tagId);
    if (!updatedTag) return;
    const merged = { ...updatedTag, ...updates };
    setCustomTags((prev) =>
      prev.map((tag) => (tag.id === tagId ? { ...tag, ...updates } : tag))
    );
    const supabase = getSupabase();
    if (supabase) upsertTag(supabase, merged).catch(console.error);
  };

  const deleteCustomTag = (tagId) => {
    setCustomTags((prev) => prev.filter((tag) => tag.id !== tagId));
    const supabase = getSupabase();
    if (supabase) softDeleteTag(supabase, tagId).catch(console.error);

    const updatedDailyTasks = { ...dailyTasks };
    Object.keys(updatedDailyTasks).forEach((dateKey) => {
      updatedDailyTasks[dateKey] = updatedDailyTasks[dateKey].map((task) => {
        const updatedTask = { ...task };
        if (updatedTask.tag === tagId) updatedTask.tag = undefined;

        if (updatedTask.subtasks) {
          updatedTask.subtasks = updatedTask.subtasks.map((st) =>
            st.tag === tagId ? { ...st, tag: undefined } : st
          );
        }
        return updatedTask;
      });
    });
    setDailyTasks(updatedDailyTasks);

    setHabits((prev) =>
      prev.map((habit) =>
        habit.tag === tagId ? { ...habit, tag: undefined } : habit
      )
    );
  };

  const resetApp = () => {
    localStorage.clear();
    setDailyTasks({});
    setCustomTags([]);
    setHabits([]);
    setDarkMode(false);
    setTheme("default");
    window.location.reload();
  };

  // ─── 拉取远端任务并合并到本地 state ────────────────────────────────────────
  const pullAndMergeDate = useCallback(async (supabase, dateStr) => {
    const remoteTasks = await fetchTasksByDate(supabase, dateStr);
    setDailyTasks((prev) => {
      const local = prev[dateStr] || [];
      // 以远端数据为准：按 id 覆盖本地，本地独有的保留
      const remoteMap = {};
      remoteTasks.forEach((t) => { remoteMap[t.id] = t; });
      // 保留本地有但远端没有的（可能是刚创建还未同步完成的）
      const localOnly = local.filter((t) => !remoteMap[t.id]);
      return { ...prev, [dateStr]: [...remoteTasks, ...localOnly] };
    });
  }, []);

  // 切换日期时懒加载该日期的任务（已拉取过的跳过）
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const dateStr = getDateString(selectedDate);
    if (pulledDates.current.has(dateStr)) return;
    pullAndMergeDate(supabase, dateStr)
      .then(() => { pulledDates.current.add(dateStr); })
      .catch((err) => console.error("Supabase pull date error:", err));
  }, [selectedDate, getSupabase, pullAndMergeDate]);

  const pullAndMergeMeta = useCallback(async (supabase) => {
    const [remoteHabits, remoteTags] = await Promise.all([
      fetchAllHabits(supabase),
      fetchAllTags(supabase),
    ]);
    // 标记正在从远端同步，避免 useEffect 回写
    isSyncingFromRemote.current = true;
    // 以远端为准，按 id 覆盖
    setHabits((prev) => {
      const remoteMap = {};
      remoteHabits.forEach((h) => { remoteMap[h.id] = h; });
      const localOnly = prev.filter((h) => !remoteMap[h.id]);
      return [...remoteHabits, ...localOnly];
    });
    setCustomTags((prev) => {
      const remoteMap = {};
      remoteTags.forEach((t) => { remoteMap[t.id] = t; });
      const localOnly = prev.filter((t) => !remoteMap[t.id]);
      return [...remoteTags, ...localOnly];
    });
    // 延迟重置标记，确保 useEffect 已跳过本次变更
    requestAnimationFrame(() => { isSyncingFromRemote.current = false; });
  }, []);

  // ─── 页面加载时拉取 meta + 当天任务 ────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();

    Promise.all([
      pullAndMergeMeta(supabase),
      pullAndMergeDate(supabase, todayStr),
    ])
      .then(() => { pulledDates.current.add(todayStr); })
      .catch((err) => { console.error("Supabase pull on mount error:", err); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 定时拉取（每 5 分钟重新拉取当前日期 + meta） ──────────────────────────
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.enabled) return;
    const interval = setInterval(() => {
      const supabase = getSupabase();
      if (!supabase) return;
      const dateStr = getDateString(selectedDate);
      Promise.all([pullAndMergeMeta(supabase), pullAndMergeDate(supabase, dateStr)])
        .catch((err) => { console.error("Supabase periodic pull error:", err); });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate, getSupabase, pullAndMergeMeta, pullAndMergeDate]);

  const createFlatTaskList = (tasks) => {
    const flatList = [];
    tasks.forEach((task) => {
      flatList.push(task);
      if (task.subtasks && task.subtasks.length > 0) {
        flatList.push(...task.subtasks);
      }
    });
    return flatList;
  };

  const dailyHabitTasks = generateDailyHabitTasks(habits, selectedDate);
  const regularTasks = getCurrentDayTasks();
  const allTasks = [...regularTasks, ...dailyHabitTasks];
  const flatTaskList = createFlatTaskList(allTasks); // For timer and other components

  return (
    <>
      <AnimatePresence>
        {showIntroScreen && (
          <IntroScreen onAnimationComplete={() => setShowIntroScreen(false)} />
        )}
      </AnimatePresence>

      {!showIntroScreen && (
        <div className="min-h-screen transition-colors duration-300 bg-background">
          {/* Mobile/Tablet Layout (up to lg) */}
          <div className="lg:hidden max-w-lg mx-auto min-h-screen px-4 relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col h-screen relative"
            >
              <div className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-primary text-background rounded-b-lg py-2 px-2 pt-1 flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  {getSupabaseConfig().enabled && (
                    <Cloud className="h-3 w-3 text-green-300" />
                  )}
                </button>
              </div>

              {/* Header Section */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedDate(new Date())}
                className="p-4 px-0 border-b border-dashed"
              >
                <div className="flex items-center justify-between">
                  <DayNightCycle selectedDate={selectedDate} />
                  <div className="flex items-center gap-2">
                    <div className="text-right flex flex-col">
                      <div className="text-xl font-extrabold flex items-center gap-2">
                        <AnimatedNumber
                          value={selectedDate.getDate()}
                          fontSize={20}
                        />
                        {selectedDate.toLocaleDateString("en-US", {
                          month: "long",
                        })}
                      </div>
                      <div className="text-xl opacity-90 -mt-1 flex justify-end">
                        <AnimatedYear
                          year={selectedDate.getFullYear()}
                          fontSize={30}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="py-3 border-b border-dashed">
                <WeeklyCalendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
              </div>

              <div className="flex-1 overflow-hidden">
                <TaskList
                  tasks={allTasks}
                  customTags={customTags}
                  onToggleTask={toggleTask}
                  onDeleteTask={deleteTask}
                  onTaskClick={handleTaskClick}
                  onAddSubtask={handleAddSubtask}
                />
              </div>

              <div className="p-4 border-t border-dashed absolute bottom-0 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-sm w-full z-50">
                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => setShowTimer(true)}
                    variant="ghost"
                    size="lg"
                    className="flex-1 flex items-center justify-center px-4 sm:px-8 gap-2 font-extrabold hover:bg-accent/50 group dark:text-white"
                  >
                    <div className="group-hover:scale-110 transition-transform  flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      <span>Timer</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setShowAddTask(true)}
                    size="lg"
                    className="mx-4 rounded-full w-12 h-12 px-4 sm:px-8 bg-primary hover:bg-primary/90 group hover:scale-110 transition-transform [&_svg]:size-5"
                  >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </Button>

                  <Button
                    onClick={() => setShowHabits(true)}
                    variant="ghost"
                    size="lg"
                    className="flex-1 flex items-center justify-center px-4 sm:px-8 gap-2 font-extrabold group hover:bg-accent/50 dark:text-white"
                  >
                    <div className="group-hover:scale-110 transition-transform  flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Habits</span>
                    </div>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Desktop Layout (lg and up) */}
          <div className="hidden lg:flex max-h-screen h-screen overflow-hidden">
            {/* Left Sidebar - Calendar & Navigation */}
            <div className="w-lg border-r border-dashed flex flex-col bg-background/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col h-full"
              >
                {/* Settings Button */}
                <div className="p-6 border-b border-dashed flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xl font-extrabold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    Prio Space
                  </div>
                  <div className="flex items-center gap-2">
                    {getSupabaseConfig().enabled && (
                      <div className="flex items-center gap-1 text-[10px] font-extrabold text-green-600 dark:text-green-400">
                        <Cloud className="h-3.5 w-3.5" />
                        <span>云端</span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowSettings(true)}
                      className="bg-primary text-background rounded-lg py-3 px-4 hover:bg-primary/90 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Date Header */}
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDate(new Date())}
                  className="p-4 border-b border-dashed px-6"
                >
                  <div className="flex items-center justify-between">
                    <DayNightCycle selectedDate={selectedDate} />
                    <div className="flex items-center gap-2">
                      <div className="text-right flex flex-col">
                        <div className="text-xl font-extrabold flex items-center gap-2">
                          <AnimatedNumber
                            value={selectedDate.getDate()}
                            fontSize={20}
                          />
                          {selectedDate.toLocaleDateString("en-US", {
                            month: "long",
                          })}
                        </div>
                        <div className="text-xl opacity-90 -mt-1 flex justify-end">
                          <AnimatedYear
                            year={selectedDate.getFullYear()}
                            fontSize={30}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Calendar */}
                <div className="p-6 border-b border-dashed">
                  <WeeklyCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>

                {/* Desktop Action Buttons */}
                <div className="p-6 space-y-4 flex-1">
                  <Button
                    onClick={() => setShowAddTask(true)}
                    size="lg"
                    className="w-full h-12 bg-primary hover:bg-primary/90 group hover:scale-[1.02] transition-all duration-200 [&_svg]:size-5 rounded-2xl"
                  >
                    <Plus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Add Task</span>
                  </Button>

                  <Button
                    onClick={() => setShowTimer(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <Timer className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Timer</span>
                  </Button>

                  <Button
                    onClick={() => setShowHabits(true)}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 font-bold hover:bg-accent/50 group hover:scale-[1.02] transition-all duration-200 rounded-2xl"
                  >
                    <BarChart3 className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-extrabold">Habits</span>
                  </Button>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="p-6 pt-0 text-[10px] text-muted-foreground font-extrabold space-y-1 opacity-70">
                  <div>⌘/Ctrl + A → Add Task</div>
                  <div>⌘/Ctrl + C → Timer</div>
                  <div>⌘/Ctrl + H → Habits</div>
                  <div>⌘/Ctrl + X → Settings</div>
                  <div>Esc → Close Modal</div>
                </div>

              </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex-1 overflow-hidden relative"
              >
                {/* Task List */}
                <div className="absolute top-0 left-0 h-full w-full overflow-auto hide-scroll">
                  <div className="p-6 mt-[4px]">
                    <TaskList
                      tasks={allTasks}
                      customTags={customTags}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                      onTaskClick={handleTaskClick}
                      onAddSubtask={handleAddSubtask}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Modals - Same for both layouts */}
          <AnimatePresence>
            {showSettings && (
              <SettingsModal
                onClose={() => setShowSettings(false)}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                theme={theme}
                onThemeChange={setTheme}
                onExportData={exportData}
                onImportData={importData}
                customTags={customTags}
                onUpdateCustomTag={updateCustomTag}
                onDeleteCustomTag={deleteCustomTag}
                onOpenWebRTCShare={() => setShowWebRTCShare(true)}
                onResetApp={resetApp}
              />
            )}

            {showWebRTCShare && (
              <WebRTCShareModal
                onClose={() => setShowWebRTCShare(false)}
                dailyTasks={dailyTasks}
                customTags={customTags}
                habits={habits}
                darkMode={darkMode}
                theme={theme}
                onImportData={importDataFromWebRTC}
              />
            )}

            {showAddTask && (
              <AddTaskModal
                onClose={() => setShowAddTask(false)}
                onAddTask={addTask}
                customTags={customTags}
                onAddCustomTag={addCustomTag}
                selectedDate={selectedDate}
              />
            )}

            {showAddSubtask && parentTaskForSubtask && (
              <AddSubtaskModal
                onClose={() => {
                  setShowAddSubtask(false);
                  setParentTaskForSubtask(null);
                }}
                onAddSubtask={(title, tagId) => {
                  addSubtask(parentTaskForSubtask.id, title, tagId);
                }}
                customTags={customTags}
                onAddCustomTag={addCustomTag}
                parentTask={parentTaskForSubtask}
              />
            )}

            {showTaskOptions && selectedTask && (
              <TaskOptionsModal
                task={selectedTask}
                customTags={customTags}
                onClose={() => {
                  setShowTaskOptions(false);
                  setSelectedTask(null);
                }}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onAddCustomTag={addCustomTag}
                onToggleTask={toggleTask}
                selectedDate={selectedDate}
                onTransferTask={transferTaskToCurrentDay}
                currentActualDate={new Date()}
                onAddSubtask={handleAddSubtask}
                allTasks={allTasks}
              />
            )}

            {showHabits && (
              <HabitTracker
                habits={habits}
                customTags={customTags}
                onClose={() => setShowHabits(false)}
                onUpdateHabits={updateHabits}
                onAddCustomTag={addCustomTag}
              />
            )}

            {showTimer && (
              <TimerModal
                tasks={flatTaskList} // Use flattened list for timer
                onClose={() => setShowTimer(false)}
                onUpdateTaskTime={updateTaskTime}
                onUpdateTaskFocusTime={updateTaskFocusTime}
                onToggleTask={toggleTask}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
