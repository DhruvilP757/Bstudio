<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useFsStore } from '../../stores/fs-store';
import { useBrowserStore } from '../../stores/browser-store';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  ChevronsDownUp,
  File,
  FileCode
} from 'lucide-vue-next';
import FileTreeNode from './FileTreeNode.vue';

const fsStore = useFsStore();
const browserStore = useBrowserStore();

const isProjectExpanded = ref(true);
const isFilterOpen = ref(false);
const filterInputRef = ref<HTMLInputElement | null>(null);

// Root inline item creation
const isCreatingRoot = ref(false);
const isCreatingRootFolder = ref(false);
const rootItemName = ref('');
const rootInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => fsStore.fetchTree());

const toggleFilter = () => {
  isFilterOpen.value = !isFilterOpen.value;
  if (isFilterOpen.value) {
    nextTick(() => filterInputRef.value?.focus());
  } else {
    fsStore.searchQuery = '';
  }
};

const clearFilter = () => {
  fsStore.searchQuery = '';
  isFilterOpen.value = false;
};

const startCreateRootItem = (isFolder: boolean) => {
  isProjectExpanded.value = true;
  isCreatingRootFolder.value = isFolder;
  rootItemName.value = '';
  isCreatingRoot.value = true;
  nextTick(() => {
    rootInputRef.value?.focus();
  });
};

const submitCreateRootItem = async () => {
  const name = rootItemName.value.trim();
  if (!name) {
    cancelCreateRootItem();
    return;
  }
  await fsStore.createItem(name, isCreatingRootFolder.value);
  isCreatingRoot.value = false;
  rootItemName.value = '';
};

const cancelCreateRootItem = () => {
  isCreatingRoot.value = false;
  rootItemName.value = '';
};

const startSidebarResize = (e: PointerEvent) => {
  e.preventDefault();
  const target = e.currentTarget as HTMLElement;
  try {
    target.setPointerCapture(e.pointerId);
  } catch {}
  browserStore.setDraggingResizer(true, 'col-resize');

  const startX = e.clientX;
  const startWidth = browserStore.sidebarWidth;

  const onPointerMove = (ev: PointerEvent) => {
    const delta = ev.clientX - startX;
    browserStore.setSidebarWidth(startWidth + delta);
    window.dispatchEvent(new Event('resize'));
  };

  const onPointerUp = (ev: PointerEvent) => {
    try {
      target.releasePointerCapture(ev.pointerId);
    } catch {}
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    browserStore.setDraggingResizer(false);
    window.dispatchEvent(new Event('resize'));
  };

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};
</script>

<template>
  <div
    class="relative h-full bg-sidebar border-r border-border flex flex-col select-none text-xs shrink-0 overflow-hidden"
    :style="{
      width: browserStore.sidebarWidth + 'px',
      transition: browserStore.isDraggingResizer ? 'none' : 'width 150ms ease'
    }"
  >
    <!-- Resize border handle -->
    <div
      @pointerdown="startSidebarResize"
      class="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-30 group hover:bg-nvidia/60 active:bg-nvidia transition-colors select-none"
      title="Drag to resize Explorer"
    >
      <div class="absolute inset-y-0 -left-1 -right-1 z-10" />
    </div>

    <!-- Explorer Header & Action Toolbar -->
    <div class="flex items-center justify-between px-3 h-9 border-b border-border shrink-0 bg-sidebar/95">
      <span class="font-semibold uppercase tracking-wider text-zinc-400 text-[11px]">Explorer</span>

      <!-- VS Code Toolbar Action Buttons -->
      <div class="flex items-center gap-0.5 text-zinc-400">
        <!-- New File -->
        <button
          @click="startCreateRootItem(false)"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="New File..."
        >
          <FilePlus class="w-3.5 h-3.5" />
        </button>

        <!-- New Folder -->
        <button
          @click="startCreateRootItem(true)"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="New Folder..."
        >
          <FolderPlus class="w-3.5 h-3.5" />
        </button>

        <!-- Refresh Tree -->
        <button
          @click="fsStore.fetchTree()"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="Refresh Explorer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': fsStore.isLoading }" />
        </button>

        <!-- Collapse All Folders -->
        <button
          @click="fsStore.collapseAll()"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="Collapse Folders in Explorer"
        >
          <ChevronsDownUp class="w-3.5 h-3.5" />
        </button>

        <!-- Quick Filter / Search Files -->
        <button
          @click="toggleFilter"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          :class="{ 'text-nvidia bg-white/5': isFilterOpen || fsStore.searchQuery }"
          title="Filter by Name"
        >
          <Search class="w-3.5 h-3.5" />
        </button>

        <!-- Open File Dialog -->
        <button
          @click="fsStore.openFileDialog()"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="Open File..."
        >
          <FileCode class="w-3.5 h-3.5" />
        </button>

        <!-- Open Folder Dialog -->
        <button
          @click="fsStore.openFolderDialog()"
          class="w-6 h-6 flex items-center justify-center rounded hover:text-white hover:bg-white/10 transition-colors"
          title="Open Folder..."
        >
          <FolderOpen class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Quick Filter Input (Search by file name) -->
    <div
      v-if="isFilterOpen || fsStore.searchQuery"
      class="px-2.5 py-1.5 border-b border-border/80 bg-black/20 flex items-center gap-1.5 shrink-0"
    >
      <Search class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      <input
        ref="filterInputRef"
        v-model="fsStore.searchQuery"
        placeholder="Filter files (e.g. .vue, app)..."
        class="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 outline-none"
        @keydown.esc="clearFilter"
      />
      <button
        v-if="fsStore.searchQuery"
        @click="clearFilter"
        class="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded"
        title="Clear Filter"
      >
        <X class="w-3 h-3" />
      </button>
    </div>

    <!-- Collapsible Root Project Section Header -->
    <div
      @click="isProjectExpanded = !isProjectExpanded"
      class="px-2 py-1.5 border-b border-border shrink-0 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors group"
    >
      <div class="flex items-center gap-1 min-w-0 text-zinc-300 group-hover:text-white">
        <!-- Rotating Chevron -->
        <ChevronRight
          class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-150 shrink-0"
          :class="{ 'rotate-90': isProjectExpanded }"
        />
        <span class="font-bold text-[11px] uppercase tracking-wider truncate" :title="fsStore.currentFolderPath || fsStore.currentFolderName">
          {{ fsStore.currentFolderName || 'Project' }}
        </span>
      </div>

      <button
        @click.stop="fsStore.openFolderDialog()"
        class="text-[10px] text-zinc-500 hover:text-nvidia transition-colors shrink-0 px-1 py-0.5 rounded hover:bg-white/5"
        title="Open another folder..."
      >
        Change
      </button>
    </div>

    <!-- Tree Body -->
    <div v-show="isProjectExpanded" class="flex-1 overflow-y-auto py-1 relative">
      <!-- Empty workspace state -->
      <div v-if="!fsStore.isLoading && fsStore.fileTree.length === 0" class="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <FolderOpen class="w-8 h-8 text-zinc-700" />
        <p class="text-zinc-500 text-xs leading-relaxed">No files in workspace.<br/>Open a folder or project to begin.</p>
        <div class="flex items-center gap-2">
          <button
            @click="fsStore.openFolderDialog()"
            class="bg-nvidia hover:bg-nvidia-bright text-black font-semibold text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
          >
            <FolderOpen class="w-3.5 h-3.5" />
            Open Folder
          </button>
          <button
            @click="fsStore.openFileDialog()"
            class="bg-white/10 hover:bg-white/15 text-white font-semibold text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
          >
            <FileCode class="w-3.5 h-3.5" />
            Open File
          </button>
        </div>
      </div>

      <!-- Loading shimmer -->
      <div v-else-if="fsStore.isLoading" class="px-2 space-y-1">
        <div v-for="i in 8" :key="i" class="h-6 rounded shimmer" :style="`width: ${60 + (i % 4) * 10}%`" />
      </div>

      <!-- File Tree Items -->
      <template v-else>
        <!-- Inline Root Item Creation Row -->
        <div
          v-if="isCreatingRoot"
          class="flex items-center py-[3px] pr-2 pl-[6px] bg-white/[0.04]"
        >
          <span class="w-4 h-4 shrink-0" />
          <component
            :is="isCreatingRootFolder ? Folder : File"
            class="w-4 h-4 shrink-0 mr-1.5"
            :class="isCreatingRootFolder ? 'text-[#e5a93c]' : 'text-zinc-400'"
          />
          <input
            ref="rootInputRef"
            v-model="rootItemName"
            :placeholder="isCreatingRootFolder ? 'folder name...' : 'file.ts...'"
            @keydown.enter.stop="submitCreateRootItem"
            @keydown.esc.stop="cancelCreateRootItem"
            @blur="submitCreateRootItem"
            class="flex-1 bg-[#18181b] border border-nvidia rounded px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-nvidia placeholder:text-zinc-600"
          />
        </div>

        <!-- No search results -->
        <div
          v-if="fsStore.searchQuery && fsStore.filteredTree.length === 0"
          class="px-4 py-6 text-center text-zinc-500 text-xs italic"
        >
          No matching files found for "{{ fsStore.searchQuery }}"
        </div>

        <!-- Recursive File Tree Nodes with Dropdown Arrows, Indent Guides, and Icons -->
        <FileTreeNode
          v-for="node in fsStore.filteredTree"
          :key="node.path"
          :node="node"
          :depth="0"
        />
      </template>
    </div>
  </div>
</template>
