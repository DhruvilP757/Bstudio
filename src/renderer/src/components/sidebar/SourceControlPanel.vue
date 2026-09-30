<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useGitStore } from '../../stores/git-store';
import { useBrowserStore } from '../../stores/browser-store';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Upload,
  Download,
  AlertCircle,
  FileCode,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  X,
  History,
  ExternalLink
} from 'lucide-vue-next';

const gitStore = useGitStore();
const browserStore = useBrowserStore();

const isHistoryOpen = ref(false);
const isStagedOpen = ref(true);
const isChangesOpen = ref(true);

onMounted(() => {
  gitStore.fetchStatus();
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    gitStore.commitCurrent();
  }
};

const selectFileDiff = async (filePath: string) => {
  if (gitStore.selectedDiffFile === filePath) {
    gitStore.selectedDiffFile = '';
  } else {
    await gitStore.loadDiff(filePath);
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'modified':
      return { text: 'M', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' };
    case 'added':
      return { text: 'A', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
    case 'deleted':
      return { text: 'D', color: 'text-rose-400 bg-rose-400/10 border-rose-400/30' };
    case 'untracked':
      return { text: 'U', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
    default:
      return { text: 'M', color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' };
  }
};

const diffLines = computed(() => {
  const content = gitStore.diffContent.unstaged || gitStore.diffContent.staged || '';
  if (!content) return [];
  return content.split('\n');
});
</script>

<template>
  <div
    class="h-full bg-sidebar border-r border-border flex flex-col shrink-0 select-none overflow-hidden relative"
    :style="{ width: browserStore.sidebarWidth + 'px' }"
  >
    <!-- Header -->
    <div class="h-9 px-3 border-b border-border flex items-center justify-between shrink-0 bg-canvas/30">
      <div class="flex items-center gap-1.5 overflow-hidden">
        <FolderGit2 class="w-3.5 h-3.5 text-nvidia shrink-0" />
        <span class="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">Source Control</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="gitStore.pullRemote"
          :disabled="gitStore.isOperating || !gitStore.isRepo"
          class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 disabled:opacity-30 transition-colors"
          title="Pull from remote"
        >
          <Download class="w-3.5 h-3.5" />
        </button>
        <button
          @click="gitStore.pushRemote"
          :disabled="gitStore.isOperating || !gitStore.isRepo"
          class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 disabled:opacity-30 transition-colors"
          title="Push to remote"
        >
          <Upload class="w-3.5 h-3.5" />
        </button>
        <button
          @click="gitStore.fetchStatus"
          :disabled="gitStore.isLoading"
          class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 disabled:opacity-30 transition-colors"
          title="Refresh Git status"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': gitStore.isLoading }" />
        </button>
      </div>
    </div>

    <!-- Non-repo State -->
    <div v-if="!gitStore.isRepo && !gitStore.isLoading" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-12 h-12 rounded-full bg-nvidia/10 border border-nvidia/30 flex items-center justify-center mb-3 text-nvidia">
        <GitBranch class="w-6 h-6" />
      </div>
      <h3 class="text-xs font-semibold text-zinc-200 mb-1">No Git Repository Found</h3>
      <p class="text-[11px] text-zinc-500 mb-4 max-w-[200px]">
        This folder is not currently tracked by Git. Initialize a repository to track changes and commit code.
      </p>
      <button
        @click="gitStore.initRepo"
        :disabled="gitStore.isOperating"
        class="flex items-center gap-2 px-3 py-1.5 rounded bg-nvidia text-black text-xs font-medium hover:bg-nvidia/90 disabled:opacity-50 transition-all shadow-sm shadow-nvidia/20"
      >
        <FolderGit2 class="w-3.5 h-3.5" />
        Initialize Repository
      </button>
    </div>

    <!-- Active Repo Content -->
    <div v-else class="flex-1 flex flex-col overflow-y-auto min-h-0 text-xs">
      <!-- Branch / Remote Bar -->
      <div class="px-3 py-2 border-b border-border/40 flex items-center justify-between bg-white/[0.02]">
        <div class="flex items-center gap-1.5 min-w-0">
          <GitBranch class="w-3.5 h-3.5 text-nvidia shrink-0" />
          <span class="font-mono text-[11px] text-zinc-200 font-medium truncate">{{ gitStore.branch || 'detached' }}</span>
        </div>
        <div v-if="gitStore.remoteUrl" class="text-[10px] text-zinc-500 truncate max-w-[120px]" :title="gitStore.remoteUrl">
          {{ gitStore.remoteUrl.split('/').pop()?.replace('.git', '') }}
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="gitStore.lastError" class="mx-3 mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start justify-between gap-1">
        <div class="flex items-start gap-1.5 overflow-hidden">
          <AlertCircle class="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span class="break-all">{{ gitStore.lastError }}</span>
        </div>
        <button @click="gitStore.clearAlerts" class="text-rose-400 hover:text-white shrink-0">
          <X class="w-3 h-3" />
        </button>
      </div>

      <div v-if="gitStore.lastSuccess" class="mx-3 mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between gap-1">
        <div class="flex items-center gap-1.5 overflow-hidden">
          <Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{{ gitStore.lastSuccess }}</span>
        </div>
        <button @click="gitStore.clearAlerts" class="text-emerald-400 hover:text-white shrink-0">
          <X class="w-3 h-3" />
        </button>
      </div>

      <!-- Commit Box -->
      <div class="p-3 border-b border-border/40 flex flex-col gap-2">
        <textarea
          v-model="gitStore.commitMessage"
          @keydown="handleKeydown"
          placeholder="Message (Ctrl+Enter to commit)"
          rows="2"
          class="w-full px-2.5 py-1.5 bg-black/40 border border-border/80 focus:border-nvidia/70 rounded text-xs text-zinc-200 placeholder-zinc-600 outline-none resize-none font-sans"
        />

        <div class="flex items-center gap-1.5">
          <button
            @click="gitStore.commitCurrent"
            :disabled="gitStore.isOperating || !gitStore.commitMessage.trim()"
            class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded bg-nvidia text-black font-semibold text-[11px] hover:bg-nvidia/90 disabled:opacity-40 disabled:hover:bg-nvidia transition-all shadow-sm shadow-nvidia/20"
          >
            <Check class="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Commit</span>
          </button>
        </div>
      </div>

      <!-- Staged Changes Section -->
      <div class="border-b border-border/40">
        <div
          @click="isStagedOpen = !isStagedOpen"
          class="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-zinc-400 font-medium text-[11px]"
        >
          <div class="flex items-center gap-1">
            <component :is="isStagedOpen ? ChevronDown : ChevronRight" class="w-3 h-3" />
            <span class="uppercase tracking-wider">Staged Changes</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-zinc-300 font-mono">
              {{ gitStore.staged.length }}
            </span>
          </div>
          <button
            v-if="gitStore.staged.length > 0"
            @click.stop="gitStore.unstageFile()"
            title="Unstage all changes"
            class="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
          >
            <Minus class="w-3 h-3" />
          </button>
        </div>

        <div v-show="isStagedOpen">
          <div
            v-for="file in gitStore.staged"
            :key="file.path"
            @click="selectFileDiff(file.path)"
            class="flex items-center justify-between px-3 py-1 hover:bg-white/5 cursor-pointer group text-[11px]"
            :class="{ 'bg-nvidia/10 text-nvidia': gitStore.selectedDiffFile === file.path }"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <FileCode class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span class="text-zinc-200 truncate font-mono">{{ file.name }}</span>
              <span class="text-[10px] text-zinc-500 truncate">{{ file.path }}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click.stop="gitStore.unstageFile(file.path)"
                title="Unstage file"
                class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-opacity"
              >
                <Minus class="w-3 h-3" />
              </button>
              <span
                class="px-1 py-0.2 text-[9px] font-mono font-bold rounded border"
                :class="getStatusBadge(file.status).color"
              >
                {{ getStatusBadge(file.status).text }}
              </span>
            </div>
          </div>
          <div v-if="gitStore.staged.length === 0" class="px-6 py-1.5 text-[10px] text-zinc-600 italic">
            No staged changes
          </div>
        </div>
      </div>

      <!-- Working Tree Changes Section -->
      <div class="border-b border-border/40">
        <div
          @click="isChangesOpen = !isChangesOpen"
          class="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-zinc-400 font-medium text-[11px]"
        >
          <div class="flex items-center gap-1">
            <component :is="isChangesOpen ? ChevronDown : ChevronRight" class="w-3 h-3" />
            <span class="uppercase tracking-wider">Changes</span>
            <span class="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] text-zinc-300 font-mono">
              {{ gitStore.unstaged.length + gitStore.untracked.length }}
            </span>
          </div>
          <button
            v-if="gitStore.unstaged.length > 0 || gitStore.untracked.length > 0"
            @click.stop="gitStore.stageFile()"
            title="Stage all changes"
            class="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10"
          >
            <Plus class="w-3 h-3" />
          </button>
        </div>

        <div v-show="isChangesOpen">
          <!-- Unstaged -->
          <div
            v-for="file in gitStore.unstaged"
            :key="file.path"
            @click="selectFileDiff(file.path)"
            class="flex items-center justify-between px-3 py-1 hover:bg-white/5 cursor-pointer group text-[11px]"
            :class="{ 'bg-nvidia/10 text-nvidia': gitStore.selectedDiffFile === file.path }"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <FileCode class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span class="text-zinc-200 truncate font-mono">{{ file.name }}</span>
              <span class="text-[10px] text-zinc-500 truncate">{{ file.path }}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click.stop="gitStore.stageFile(file.path)"
                title="Stage file"
                class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-opacity"
              >
                <Plus class="w-3 h-3" />
              </button>
              <span
                class="px-1 py-0.2 text-[9px] font-mono font-bold rounded border"
                :class="getStatusBadge(file.status).color"
              >
                {{ getStatusBadge(file.status).text }}
              </span>
            </div>
          </div>

          <!-- Untracked -->
          <div
            v-for="file in gitStore.untracked"
            :key="file.path"
            @click="selectFileDiff(file.path)"
            class="flex items-center justify-between px-3 py-1 hover:bg-white/5 cursor-pointer group text-[11px]"
            :class="{ 'bg-nvidia/10 text-nvidia': gitStore.selectedDiffFile === file.path }"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <FileCode class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span class="text-zinc-200 truncate font-mono">{{ file.name }}</span>
              <span class="text-[10px] text-zinc-500 truncate">{{ file.path }}</span>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click.stop="gitStore.stageFile(file.path)"
                title="Stage file"
                class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-opacity"
              >
                <Plus class="w-3 h-3" />
              </button>
              <span
                class="px-1 py-0.2 text-[9px] font-mono font-bold rounded border"
                :class="getStatusBadge('untracked').color"
              >
                U
              </span>
            </div>
          </div>

          <div
            v-if="gitStore.unstaged.length === 0 && gitStore.untracked.length === 0"
            class="px-6 py-1.5 text-[10px] text-zinc-600 italic"
          >
            Working tree clean
          </div>
        </div>
      </div>

      <!-- Diff Preview Panel -->
      <div v-if="gitStore.selectedDiffFile" class="border-b border-border/40 flex flex-col bg-black/60">
        <div class="flex items-center justify-between px-3 py-1 bg-white/5 border-b border-border/30">
          <span class="text-[10px] font-mono text-nvidia truncate">
            Diff: {{ gitStore.selectedDiffFile }}
          </span>
          <button @click="gitStore.selectedDiffFile = ''" class="text-zinc-500 hover:text-zinc-200">
            <X class="w-3 h-3" />
          </button>
        </div>
        <div class="p-2 max-h-48 overflow-y-auto font-mono text-[10px] leading-tight select-text">
          <div v-if="diffLines.length === 0" class="text-zinc-500 italic">
            No text diff available (binary or empty)
          </div>
          <div
            v-for="(line, idx) in diffLines"
            :key="idx"
            :class="{
              'text-emerald-400 bg-emerald-500/10': line.startsWith('+') && !line.startsWith('+++'),
              'text-rose-400 bg-rose-500/10': line.startsWith('-') && !line.startsWith('---'),
              'text-cyan-400 font-bold': line.startsWith('@@'),
              'text-zinc-500': line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++'),
              'text-zinc-300': !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@')
            }"
          >
            {{ line }}
          </div>
        </div>
      </div>

      <!-- Recent Commit History -->
      <div>
        <div
          @click="isHistoryOpen = !isHistoryOpen"
          class="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-zinc-400 font-medium text-[11px]"
        >
          <div class="flex items-center gap-1">
            <component :is="isHistoryOpen ? ChevronDown : ChevronRight" class="w-3 h-3" />
            <History class="w-3 h-3 text-zinc-500" />
            <span class="uppercase tracking-wider">Recent Commits</span>
          </div>
          <span class="text-[10px] text-zinc-500 font-mono">{{ gitStore.recentCommits.length }}</span>
        </div>

        <div v-show="isHistoryOpen" class="px-2 py-1 flex flex-col gap-1">
          <div
            v-for="commit in gitStore.recentCommits"
            :key="commit.hash"
            class="p-1.5 rounded bg-white/[0.02] border border-border/30 hover:border-zinc-700 flex flex-col gap-0.5"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-nvidia text-[10px] font-semibold">{{ commit.hash }}</span>
              <span class="text-[9px] text-zinc-500">{{ commit.time }}</span>
            </div>
            <div class="text-[11px] text-zinc-300 truncate" :title="commit.message">{{ commit.message }}</div>
            <div class="text-[9px] text-zinc-500 font-mono truncate">{{ commit.author }}</div>
          </div>
          <div v-if="gitStore.recentCommits.length === 0" class="px-4 py-2 text-[10px] text-zinc-600 italic">
            No commit history
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
