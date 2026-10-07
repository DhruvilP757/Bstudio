<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useFsStore } from '../../stores/fs-store';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  FileCode2,
  FileText,
  FileJson,
  File,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  Hash,
  Atom,
  Zap,
  Info
} from 'lucide-vue-next';
import type { FileNode } from '../../../shared/fs-types';

const props = defineProps<{
  node: FileNode;
  depth?: number;
}>();

const fsStore = useFsStore();
const currentDepth = props.depth || 0;

const isLocallyOpen = ref(currentDepth < 1);

// Controlled open state backed by fsStore for Collapse All / Expand All support
const isOpen = computed({
  get: () => {
    if (fsStore.expandedFolders && fsStore.expandedFolders[props.node.path] !== undefined) {
      return fsStore.expandedFolders[props.node.path];
    }
    return isLocallyOpen.value;
  },
  set: (val: boolean) => {
    isLocallyOpen.value = val;
    fsStore.setFolderOpen(props.node.path, val);
  }
});

const toggleFolder = () => {
  isOpen.value = !isOpen.value;
};

// Inline creation state for adding a child file or folder inside this directory
const isCreatingChild = ref(false);
const isCreatingChildFolder = ref(false);
const newChildName = ref('');
const createInputRef = ref<HTMLInputElement | null>(null);

const startCreateChild = (isFolder: boolean) => {
  isOpen.value = true;
  isCreatingChildFolder.value = isFolder;
  newChildName.value = '';
  isCreatingChild.value = true;
  nextTick(() => {
    createInputRef.value?.focus();
  });
};

const submitCreateChild = async () => {
  const name = newChildName.value.trim();
  if (!name) {
    cancelCreateChild();
    return;
  }
  const targetPath = props.node.path ? `${props.node.path}/${name}` : name;
  await fsStore.createItem(targetPath, isCreatingChildFolder.value);
  isCreatingChild.value = false;
  newChildName.value = '';
};

const cancelCreateChild = () => {
  isCreatingChild.value = false;
  newChildName.value = '';
};

// Inline rename state
const isRenaming = ref(false);
const renameValue = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);

const startRename = () => {
  renameValue.value = props.node.name;
  isRenaming.value = true;
  showContextMenu.value = false;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
};

const submitRename = async () => {
  const newName = renameValue.value.trim();
  if (!newName || newName === props.node.name) {
    cancelRename();
    return;
  }
  const oldPath = props.node.path;
  const parts = oldPath.split('/');
  parts[parts.length - 1] = newName;
  const newPath = parts.join('/');
  await fsStore.renameItem(oldPath, newPath);
  isRenaming.value = false;
};

const cancelRename = () => {
  isRenaming.value = false;
  renameValue.value = '';
};

// Context Menu State
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });

const openContextMenu = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  contextMenuPos.value = {
    x: Math.min(e.clientX, window.innerWidth - 180),
    y: Math.min(e.clientY, window.innerHeight - 220)
  };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
};

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
  window.addEventListener('blur', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
  window.removeEventListener('blur', closeContextMenu);
});

const handleDelete = async () => {
  showContextMenu.value = false;
  const confirmed = window.confirm(`Are you sure you want to delete "${props.node.name}"?`);
  if (confirmed) {
    await fsStore.deleteItem(props.node.path);
  }
};

const handleReveal = async () => {
  showContextMenu.value = false;
  await fsStore.revealInExplorer(props.node.path);
};

const handleCopyPath = () => {
  showContextMenu.value = false;
  navigator.clipboard.writeText(props.node.path);
};

const isDirty = computed(() => {
  if (props.node.isDirectory) return false;
  const file = fsStore.openFiles.find((f) => f.path === props.node.path);
  return file?.isDirty || false;
});

const getFileIcon = (node: FileNode) => {
  const ext = node.extension?.toLowerCase();
  const name = node.name.toLowerCase();
  if (['.tsx', '.jsx'].includes(ext || '')) return Atom;
  if (['.css', '.scss', '.sass', '.less'].includes(ext || '')) return Hash;
  if (name.includes('vite.config')) return Zap;
  if (name === 'readme.md' || name.startsWith('readme')) return Info;
  if (['.vue', '.ts', '.js', '.py', '.go', '.rs', '.cpp', '.c', '.cs', '.java'].includes(ext || '')) return FileCode2;
  if (['.json', '.yaml', '.yml', '.toml', '.lock'].includes(ext || '') || name.includes('config')) return FileJson;
  if (['.md', '.txt', '.csv', '.log'].includes(ext || '')) return FileText;
  return File;
};

const extColor = (ext?: string, name?: string) => {
  const n = (name || '').toLowerCase();
  if (n.startsWith('.git')) return 'text-zinc-500';
  if (n.includes('package.json')) return 'text-[#facc15]';
  if (n.includes('tsconfig')) return 'text-[#38bdf8]';
  if (n.includes('vite.config')) return 'text-[#fbbf24]';
  if (n.startsWith('readme')) return 'text-[#60a5fa]';

  switch (ext?.toLowerCase()) {
    case '.tsx': case '.jsx': return 'text-[#00d8ff]';
    case '.css': case '.scss': return 'text-[#c084fc]';
    case '.vue':  return 'text-[#42b883]';
    case '.ts':   return 'text-[#38bdf8]';
    case '.js':   return 'text-[#facc15]';
    case '.py':   return 'text-[#38bdf8]';
    case '.json': return 'text-[#facc15]';
    case '.html': return 'text-[#fb923c]';
    case '.md':   return 'text-[#60a5fa]';
    case '.rs':   return 'text-[#f97316]';
    case '.go':   return 'text-[#00add8]';
    case '.sh': case '.ps1': return 'text-[#4ade80]';
    default:      return 'text-zinc-400';
  }
};
</script>

<template>
  <div class="select-none text-xs relative group/node">
    <!-- Tree Indentation Vertical Guides -->
    <template v-if="currentDepth > 0">
      <div
        v-for="d in currentDepth"
        :key="d"
        class="absolute top-0 bottom-0 pointer-events-none border-l border-white/[0.07]"
        :style="{ left: `${(d - 1) * 14 + 13}px` }"
      />
    </template>

    <!-- Folder Row -->
    <div
      v-if="node.isDirectory"
      @click="toggleFolder"
      @contextmenu="openContextMenu"
      class="flex items-center py-[3px] pr-2 cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.09] transition-colors group/row text-zinc-300 hover:text-white"
      :style="{ paddingLeft: `${currentDepth * 14 + 6}px` }"
    >
      <!-- Dropdown Chevron Arrow (Smooth 90deg Rotation) -->
      <span class="w-4 h-4 flex items-center justify-center text-zinc-400 group-hover/row:text-zinc-200 shrink-0">
        <ChevronRight
          class="w-3.5 h-3.5 transition-transform duration-150 ease-out"
          :class="{ 'rotate-90': isOpen }"
        />
      </span>

      <!-- Folder Open / Closed Icon -->
      <component
        :is="isOpen ? FolderOpen : Folder"
        class="w-4 h-4 shrink-0 text-[#e5a93c] mr-1.5"
      />

      <!-- Folder Name / Inline Rename Input -->
      <div class="flex-1 min-w-0 flex items-center">
        <input
          v-if="isRenaming"
          ref="renameInputRef"
          v-model="renameValue"
          @click.stop
          @keydown.enter.stop="submitRename"
          @keydown.esc.stop="cancelRename"
          @blur="submitRename"
          class="w-full bg-[#181f23] border border-nvidia/60 rounded px-1 py-0 text-xs text-white outline-none focus:ring-1 focus:ring-nvidia"
        />
        <span v-else class="truncate text-xs font-normal select-none">{{ node.name }}</span>
      </div>

      <!-- Folder Hover Actions (New File, New Folder, Child Count) -->
      <div class="hidden group-hover/row:flex items-center gap-0.5 shrink-0 ml-1 text-zinc-400">
        <button
          @click.stop="startCreateChild(false)"
          class="w-4 h-4 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="New File in folder"
        >
          <FilePlus class="w-3 h-3" />
        </button>
        <button
          @click.stop="startCreateChild(true)"
          class="w-4 h-4 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="New Folder in folder"
        >
          <FolderPlus class="w-3 h-3" />
        </button>
      </div>

      <!-- Child count badge when closed -->
      <span
        v-if="!isOpen && node.children && node.children.length > 0"
        class="group-hover/row:hidden text-[10px] text-zinc-500 font-mono ml-1 px-1 rounded bg-white/[0.04]"
      >
        {{ node.children.length }}
      </span>
    </div>

    <!-- Inline Child Creation Row (Inside this folder) -->
    <div
      v-if="node.isDirectory && isOpen && isCreatingChild"
      class="flex items-center py-[3px] pr-2 bg-white/[0.03]"
      :style="{ paddingLeft: `${(currentDepth + 1) * 14 + 6}px` }"
    >
      <span class="w-4 h-4 shrink-0" />
      <component
        :is="isCreatingChildFolder ? Folder : File"
        class="w-4 h-4 shrink-0 mr-1.5"
        :class="isCreatingChildFolder ? 'text-[#e5a93c]' : 'text-zinc-400'"
      />
      <input
        ref="createInputRef"
        v-model="newChildName"
        :placeholder="isCreatingChildFolder ? 'folder name...' : 'file.ts...'"
        @keydown.enter.stop="submitCreateChild"
        @keydown.esc.stop="cancelCreateChild"
        @blur="submitCreateChild"
        class="flex-1 bg-[#181f23] border border-nvidia rounded px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-nvidia placeholder:text-zinc-600"
      />
    </div>

    <!-- Subfolder Children (Recursive) -->
    <div v-if="node.isDirectory && isOpen && node.children && node.children.length > 0">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="currentDepth + 1"
      />
    </div>

    <!-- Empty Folder Indicator -->
    <div
      v-else-if="node.isDirectory && isOpen && (!node.children || node.children.length === 0) && !isCreatingChild"
      class="text-zinc-600 text-[11px] italic py-0.5 flex items-center"
      :style="{ paddingLeft: `${(currentDepth + 1) * 14 + 26}px` }"
    >
      (empty)
    </div>

    <!-- File Row -->
    <button
      v-else-if="!node.isDirectory"
      @click="fsStore.openFile(node.path)"
      @contextmenu="openContextMenu"
      class="flex items-center py-[3.5px] pr-2 mx-1 w-[calc(100%-8px)] rounded-md transition-colors text-left group/row"
      :class="fsStore.activeFilePath === node.path
        ? 'bg-[#272d32] text-white font-medium shadow-sm'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'"
      :style="{ paddingLeft: `${currentDepth * 14 + 6}px` }"
    >
      <!-- 16px Spacer perfectly matching Folder's Chevron -->
      <span class="w-4 h-4 shrink-0" />

      <!-- Language File Icon -->
      <component
        :is="getFileIcon(node)"
        class="w-4 h-4 shrink-0 mr-1.5"
        :class="extColor(node.extension, node.name)"
      />

      <!-- File Name / Inline Rename Input -->
      <div class="flex-1 min-w-0 flex items-center">
        <input
          v-if="isRenaming"
          ref="renameInputRef"
          v-model="renameValue"
          @click.stop
          @keydown.enter.stop="submitRename"
          @keydown.esc.stop="cancelRename"
          @blur="submitRename"
          class="w-full bg-[#181f23] border border-nvidia/60 rounded px-1 py-0 text-xs text-white outline-none focus:ring-1 focus:ring-nvidia"
        />
        <span v-else class="truncate text-xs font-normal">{{ node.name }}</span>
      </div>

      <!-- Dirty Indicator Dot -->
      <span
        v-if="isDirty"
        class="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-1 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
        title="Unsaved changes"
      />
    </button>

    <!-- Context Menu Modal -->
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed z-50 min-w-[170px] bg-[#1e1e1e] border border-[#3c3c3c] rounded shadow-2xl py-1 text-xs text-zinc-300 font-sans backdrop-blur-md"
        :style="{ left: `${contextMenuPos.x}px`, top: `${contextMenuPos.y}px` }"
        @click.stop
      >
        <template v-if="node.isDirectory">
          <button
            @click="startCreateChild(false); closeContextMenu()"
            class="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2"
          >
            <FilePlus class="w-3.5 h-3.5 text-zinc-400" />
            <span>New File...</span>
          </button>
          <button
            @click="startCreateChild(true); closeContextMenu()"
            class="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2"
          >
            <FolderPlus class="w-3.5 h-3.5 text-zinc-400" />
            <span>New Folder...</span>
          </button>
          <div class="my-1 border-t border-[#333333]" />
        </template>
        <button
          @click="handleReveal"
          class="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2"
        >
          <ExternalLink class="w-3.5 h-3.5 text-zinc-400" />
          <span>Reveal in Explorer</span>
        </button>
        <button
          @click="handleCopyPath"
          class="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2"
        >
          <Copy class="w-3.5 h-3.5 text-zinc-400" />
          <span>Copy Path</span>
        </button>
        <button
          @click="startRename"
          class="w-full text-left px-3 py-1.5 hover:bg-[#04395e] hover:text-white flex items-center gap-2"
        >
          <Pencil class="w-3.5 h-3.5 text-zinc-400" />
          <span>Rename (F2)</span>
        </button>
        <div class="my-1 border-t border-[#333333]" />
        <button
          @click="handleDelete"
          class="w-full text-left px-3 py-1.5 hover:bg-red-900/60 hover:text-red-200 text-red-400 flex items-center gap-2"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
