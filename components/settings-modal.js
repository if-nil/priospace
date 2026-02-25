"use client";

import { motion } from "framer-motion";
import {
  X,
  Download,
  Upload,
  Sun,
  Moon,
  Settings,
  Heart,
  ExternalLink,
  Palette,
  Check,
  Share,
  Wifi,
  Trash2,
  Edit2,
  Save,
  Tag,
  AlertTriangle,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { saveSupabaseConfig, getSupabaseConfig, clearSupabaseClient } from "@/lib/supabase";

export function SettingsModal({
  onClose,
  darkMode,
  onToggleDarkMode,
  onExportData,
  onImportData,
  theme,
  onThemeChange,
  onOpenWebRTCShare,
  customTags,
  onUpdateCustomTag,
  onDeleteCustomTag,
  onResetApp,
}) {
  const [editingTagId, setEditingTagId] = useState(null);
  const [editName, setEditName] = useState("");
  const modalRef = useRef(null);

  const initialConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(initialConfig.key);
  const [supabaseEnabled, setSupabaseEnabled] = useState(initialConfig.enabled);
  const [showKey, setShowKey] = useState(false);
  const [supabaseExpanded, setSupabaseExpanded] = useState(initialConfig.enabled);
  const [sqlCopied, setSqlCopied] = useState(false);

  const SQL_CREATE_TABLE = `-- 任务表（含子任务，parent_task_id 非空为子任务）
create table ps_tasks (
  id text primary key,
  date text not null,
  title text not null,
  completed boolean default false,
  time_spent integer default 0,
  focus_time integer default 0,
  created_at timestamptz,
  tag_id text,
  parent_task_id text,
  subtasks_expanded boolean default false,
  is_deleted boolean default false,
  updated_at timestamptz default now()
);

-- 习惯表
create table ps_habits (
  id text primary key,
  name text not null,
  tag_id text,
  completed_dates jsonb default '[]',
  is_deleted boolean default false,
  updated_at timestamptz default now()
);

-- 标签表
create table ps_tags (
  id text primary key,
  name text not null,
  color text,
  is_deleted boolean default false,
  updated_at timestamptz default now()
);

-- RLS
alter table ps_tasks enable row level security;
alter table ps_habits enable row level security;
alter table ps_tags enable row level security;

create policy "allow all" on ps_tasks for all using (true) with check (true);
create policy "allow all" on ps_habits for all using (true) with check (true);
create policy "allow all" on ps_tags for all using (true) with check (true);`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_CREATE_TABLE).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    });
  };

  const handleSupabaseSave = () => {
    clearSupabaseClient();
    saveSupabaseConfig(supabaseUrl, supabaseKey, supabaseEnabled);
  };

  const handleToggleSupabase = (val) => {
    setSupabaseEnabled(val);
    clearSupabaseClient();
    saveSupabaseConfig(supabaseUrl, supabaseKey, val);
  };

  const startEditing = (tag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
  };

  const saveTag = (id) => {
    onUpdateCustomTag(id, { name: editName });
    setEditingTagId(null);
  };

  const themes = [
    {
      id: "default",
      name: "Default",
      description: "Classic warm tones",
      preview: {
        primary: "#8B4B3C",
        secondary: "#B8906B",
        background: "#F5F1EB",
      },
    },
    {
      id: "nature",
      name: "Nature",
      description: "Fresh green vibes",
      preview: {
        primary: "#2D5A1B",
        secondary: "#6BA341",
        background: "#F7FAF5",
      },
    },
    {
      id: "neo-brutal",
      name: "Neo Brutal",
      description: "Bold and striking",
      preview: {
        primary: "#FF0000",
        secondary: "#FFFF00",
        background: "#FFFFFF",
      },
    },
    {
      id: "modern",
      name: "Modern",
      description: "Clean and minimal",
      preview: {
        primary: "#171717",
        secondary: "#F5F5F5",
        background: "#FFFFFF",
      },
    },
    {
      id: "pastel-dream",
      name: "Pastel Dream",
      description: "Soft lavender & pink tones",
      preview: {
        primary: "#D67AD2",
        secondary: "#A2DCEF",
        background: "#F8F4FF",
      },
    },
    {
      id: "quantum-rose",
      name: "Quantum Rose",
      description: "Vibrant pink & teal fusion",
      preview: {
        primary: "#D93A7D",
        secondary: "#2DD8C6",
        background: "#FFF5FA",
      },
    },
    {
      id: "twitter",
      name: "Twitter",
      description: "Blues & clean contrast",
      preview: {
        primary: "#1DA1F2",
        secondary: "#F7F9F9",
        background: "#F5F8FA",
      },
    },
    {
      id: "amber-minimal",
      name: "Amber Minimal",
      description: "Clean amber & white minimalism",
      preview: {
        primary: "#F59E0B",
        secondary: "#E0E7FF",
        background: "#FFFFFF",
      },
    },
  ];

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  };

  const modalVariants = {
    hidden: {
      y: "100%",
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.4,
      },
    },
    exit: {
      y: "100%",
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const handleBuyMeCoffee = () => {
    window.open("https://coff.ee/anoy", "_blank");
  };

  const handleTwitterClick = () => {
    window.open("https://x.com/Anoyroyc", "_blank");
  };

  const handleWebRTCShare = () => {
    onClose(); // Close settings first
    onOpenWebRTCShare(); // Open WebRTC share modal
  };

  const ThemePreview = ({ themeData, isSelected, onClick }) => (
    <motion.button
      onClick={onClick}
      className={`relative w-full p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Theme Preview */}
        <div className="flex gap-1">
          <div
            className="w-4 h-8 rounded-sm"
            style={{ backgroundColor: themeData.preview.primary }}
          />
          <div
            className="w-4 h-8 rounded-sm"
            style={{ backgroundColor: themeData.preview.secondary }}
          />
          <div
            className="w-4 h-8 rounded-sm border border-gray-300"
            style={{ backgroundColor: themeData.preview.background }}
          />
        </div>

        {/* Theme Info */}
        <div className="flex-1 text-left">
          <div className="font-extrabold text-gray-900 dark:text-gray-100">
            {themeData.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {themeData.description}
          </div>
        </div>

        {/* Selected Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 bg-primary rounded-full flex items-center justify-center"
          >
            <Check className="h-4 w-4 text-primary-foreground" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={modalRef}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          const modalHeight = modalRef.current?.offsetHeight || 0;
          if (info.offset.y > modalHeight / 2.5) {
            onClose();
          }
        }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border-t border-gray-200 dark:border-gray-700 relative touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing">
          <div
            className="w-12 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full cursor-pointer"
            onClick={onClose}
          />
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(90vh-70px)]">
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{
                  delay: 0.25,
                  type: "spring",
                  stiffness: 300,
                }}
                className="p-2.5 bg-primary/10 rounded-xl"
              >
                <Settings className="h-5 w-5 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 tracking-wide">
                Settings
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl p-2 dark:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>

          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {/* Theme Selection */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-extrabold text-gray-900 dark:text-gray-100">
                      Theme
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Choose your style
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {themes.map((themeData) => (
                    <motion.button
                      key={themeData.id}
                      onClick={() => onThemeChange(themeData.id)}
                      className={`relative rounded-lg border-2 p-1 transition-all duration-200 ${
                        theme === themeData.id
                          ? "border-primary scale-110"
                          : "border-gray-300 dark:border-gray-600 hover:border-primary/50"
                      }`}
                      whileHover={{
                        scale: theme === themeData.id ? 1.1 : 1.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="flex gap-0.5">
                        <div
                          className="w-2 h-6 rounded-sm"
                          style={{ backgroundColor: themeData.preview.primary }}
                        />
                        <div
                          className="w-2 h-6 rounded-sm"
                          style={{
                            backgroundColor: themeData.preview.secondary,
                          }}
                        />
                        <div
                          className="w-2 h-6 rounded-sm border border-gray-300"
                          style={{
                            backgroundColor: themeData.preview.background,
                          }}
                        />
                      </div>
                      {theme === themeData.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                        >
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Dark Mode Toggle */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: darkMode ? 0 : 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {darkMode ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-primary" />
                    )}
                  </motion.div>
                  <div>
                    <div className="font-extrabold text-gray-900 dark:text-gray-100">
                      {darkMode ? "Dark Mode" : "Light Mode"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {darkMode
                        ? "Switch to light theme"
                        : "Switch to dark theme"}
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onToggleDarkMode}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/80 rounded-xl font-extrabold w-12 h-12 p-0"
                  >
                    {darkMode ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80"
            >
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-extrabold text-gray-900 dark:text-gray-100">
                    Manage Categories
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Edit or delete your categories
                  </div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto hide-scroll flex flex-col gap-1">
                {customTags.length === 0 ? (
                  <p className="text-sm text-gray-500 italic p-4 text-center">
                    No categories created yet.
                  </p>
                ) : (
                  customTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="color"
                          value={tag.color}
                          onChange={(e) =>
                            onUpdateCustomTag(tag.id, { color: e.target.value })
                          }
                          className="w-6 h-6 min-w-6 min-h-6 rounded-md cursor-pointer bg-transparent border-0"
                        />
                        {editingTagId === tag.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 py-0 mr-3 font-bold"
                            autoFocus
                          />
                        ) : (
                          <span className="font-bold text-gray-700 dark:text-gray-200">
                            {tag.name.length > 10
                              ? tag.name.slice(0, 10) + "..."
                              : tag.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {editingTagId === tag.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveTag(tag.id)}
                            className="text-green-500 h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(tag)}
                            className="text-gray-400 h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onDeleteCustomTag(tag.id);
                          }}
                          className="text-red-400 hover:text-red-500 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Supabase Sync */}
            <motion.div variants={itemVariants}>
              <div className={`rounded-xl border-2 overflow-hidden ${supabaseEnabled ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80"}`}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {supabaseEnabled ? (
                      <Cloud className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <CloudOff className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <div className={`font-extrabold ${supabaseEnabled ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-gray-100"}`}>
                        Supabase 云同步
                      </div>
                      <div className={`text-sm font-medium ${supabaseEnabled ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                        {supabaseEnabled ? "已启用，数据将同步到云端" : "配置后可跨设备同步数据"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setSupabaseExpanded(!supabaseExpanded)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-extrabold w-10 h-10 p-0 border-2"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {supabaseExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300">启用 Supabase 同步</span>
                      <button
                        onClick={() => handleToggleSupabase(!supabaseEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${supabaseEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${supabaseEnabled ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Project URL
                      </label>
                      <Input
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xxxx.supabase.co"
                        className="h-9 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Anon Key
                      </label>
                      <div className="relative">
                        <Input
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          type={showKey ? "text" : "password"}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="h-9 text-sm font-medium pr-10"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold">需要在 Supabase 中创建以下三张表：</span>
                        <button
                          onClick={handleCopySQL}
                          className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md transition-colors ${sqlCopied ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                        >
                          {sqlCopied ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                          {sqlCopied ? "已复制" : "复制"}
                        </button>
                      </div>
                      <code className="block text-[10px] leading-relaxed whitespace-pre-wrap break-all select-all cursor-text">
{SQL_CREATE_TABLE}
                      </code>
                    </div>

                    <Button
                      onClick={handleSupabaseSave}
                      size="sm"
                      className="w-full rounded-xl font-extrabold"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      保存配置
                    </Button>

                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* WebRTC Share */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-800/20">
                <div className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-extrabold text-blue-700 dark:text-blue-300">
                      Sync Tasks (P2P)
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Sync your tasks from/with another device
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleWebRTCShare}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl font-extrabold w-12 h-12 p-0"
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Export Data */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-extrabold text-gray-900 dark:text-gray-100">
                      Export Data
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Backup your tasks and habits
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onExportData}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/80 rounded-xl font-extrabold w-12 h-12 p-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Import Data */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-extrabold text-gray-900 dark:text-gray-100">
                      Import Data
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Restore from backup file
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={onImportData}
                    variant="outline"
                    size="sm"
                    className="border-2 border-gray-300 dark:border-gray-600 hover:border-primary/70 dark:hover:border-primary/80 rounded-xl font-extrabold w-12 h-12 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Buy Me a Coffee */}
            <motion.div variants={itemVariants}>
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Button
                  onClick={handleBuyMeCoffee}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-extrabold py-4 rounded-xl shadow-lg border-0"
                >
                  <Heart className="h-5 w-5 mr-2 fill-current" />
                  Buy Me a Coffee
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            </motion.div>

            {/* App Info */}
            <motion.div
              variants={itemVariants}
              className="pt-4 border-t-2 border-gray-200 dark:border-gray-700"
            >
              <div className="text-center space-y-3">
                <div className="text-lg font-extrabold text-primary">
                  Prio Space V1.3.0
                </div>
                <div className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Focus • Track • Achieve
                </div>

                {/* vibecoded section */}
                <div className="pt-3">
                  <div className="text-sm text-gray-600 dark:text-gray-300 font-medium -mt-1">
                    <span className="text-lg font-extrabold text-primary">
                      Coded
                    </span>{" "}
                    with{" "}
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                      className="text-red-500 inline-block"
                    >
                      ❤️
                    </motion.span>{" "}
                    <br />
                    by{" "}
                    <motion.button
                      onClick={handleTwitterClick}
                      className="text-primary hover:text-primary/80 font-extrabold underline underline-offset-2 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Anoy Roy Chowdhury
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between p-4 mt-7 rounded-xl border-2 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="font-extrabold text-red-600 dark:text-red-400">
                    Reset Prio Space
                  </div>
                  <div className="text-sm text-red-500/70 dark:text-red-400/60 font-medium">
                    Permanently delete all data
                  </div>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={onResetApp}
                  variant="destructive"
                  size="sm"
                  className="rounded-xl font-extrabold px-4"
                >
                  Reset
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
