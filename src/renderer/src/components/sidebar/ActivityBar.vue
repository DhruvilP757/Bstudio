<script setup lang="ts">
import { useBrowserStore } from '../../stores/browser-store';
import { useGitStore } from '../../stores/git-store';
import {
  Folder,
  Search,
  GitBranch,
  Play,
  LayoutGrid,
  User,
  Settings
} from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  activeSidebarTab?: 'explorer' | 'extensions' | 'git';
  isSidebarOpen?: boolean;
}>(), {
  activeSidebarTab: 'explorer',
  isSidebarOpen: true
});

const emit = defineEmits<{
  (e: 'select-tab', tab: 'explorer' | 'extensions' | 'git'): void;
}>();

const browserStore = useBrowserStore();
const gitStore = useGitStore();

const handleSidebarTabClick = (tab: 'explorer' | 'extensions' | 'git') => {
  emit('select-tab', tab);
};

const handleSearchClick = () => {
  if (!props.isSidebarOpen || props.activeSidebarTab !== 'explorer') {
    emit('select-tab', 'explorer');
  }
  window.dispatchEvent(new CustomEvent('bstudio:focus-file-search'));
};

const handleRunClick = () => {
  browserStore.openDrawer('terminal');
};
</script>

<template>
  <div class="w-[62px] h-full bg-[#0e0e11] border-r border-[#222226] flex flex-col items-center py-2 shrink-0 z-20 select-none">
    <!-- Top Rail Navigation Items -->
    <div class="flex flex-col items-center gap-2 w-full px-1.5">
      <!-- 1. Explorer -->
      <button
        @click="handleSidebarTabClick('explorer')"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'explorer'
          ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712]'
          : 'border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
        title="Explorer (Ctrl+B)"
      >
        <Folder class="w-4 h-4" />
        <span class="text-[10px] font-sans tracking-tight">Explorer</span>
      </button>

      <!-- 2. Search -->
      <button
        @click="handleSearchClick"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-100 relative group border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
        title="Search Files"
      >
        <Search class="w-4 h-4" />
        <span class="text-[10px] font-sans tracking-tight">Search</span>
      </button>

      <!-- 3. Source Control -->
      <button
        @click="handleSidebarTabClick('git')"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'git'
          ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712]'
          : 'border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
        title="Source Control (Ctrl+Shift+G)"
      >
        <GitBranch class="w-4 h-4" />
        <span class="text-[9.5px] font-sans tracking-tight text-center leading-none">Source Control</span>
        <span
          v-if="gitStore.totalChangesCount > 0"
          class="absolute top-1.5 right-1.5 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#76b900] text-black text-[9px] font-bold font-mono"
        >
          {{ gitStore.totalChangesCount > 99 ? '99+' : gitStore.totalChangesCount }}
        </span>
      </button>

      <!-- 4. Run & Debug -->
      <button
        @click="handleRunClick"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-100 relative group border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
        title="Run in Terminal / Debug"
      >
        <Play class="w-4 h-4" />
        <span class="text-[9.5px] font-sans tracking-tight text-center leading-none">Run & Debug</span>
      </button>

      <!-- 5. Extensions -->
      <button
        @click="handleSidebarTabClick('extensions')"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all duration-100 relative group"
        :class="props.isSidebarOpen && props.activeSidebarTab === 'extensions'
          ? 'border border-[#76b900] bg-[#76b900]/10 text-[#7ee712]'
          : 'border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5'"
        title="Extensions (Ctrl+Shift+X)"
      >
        <LayoutGrid class="w-4 h-4" />
        <span class="text-[10px] font-sans tracking-tight">Extensions</span>
      </button>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Bottom Rail Items: Account & Settings -->
    <div class="flex flex-col items-center gap-2 w-full px-1.5 pb-1">
      <!-- Account -->
      <button
        @click="browserStore.isApiKeyModalOpen = true"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-100"
        title="Account & Profile"
      >
        <User class="w-4 h-4" />
        <span class="text-[10px] font-sans tracking-tight">Account</span>
      </button>

      <!-- Settings -->
      <button
        @click="browserStore.isApiKeyModalOpen = true"
        class="w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-100"
        title="Settings & Preferences (Ctrl+,)"
      >
        <Settings class="w-4 h-4" />
        <span class="text-[10px] font-sans tracking-tight">Settings</span>
      </button>
    </div>
  </div>
</template>
