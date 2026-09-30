<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useExtensionsStore, VscodeExtension } from '../../stores/extensions-store';
import { useBrowserStore } from '../../stores/browser-store';
import {
  Search,
  Check,
  Download,
  Star,
  Trash2,
  Power,
  Palette,
  Boxes,
  X,
  RefreshCw,
  HardDrive,
  Globe,
  Sliders,
  Sparkles,
  ExternalLink,
  Code2,
  ShieldCheck
} from 'lucide-vue-next';

const extensionsStore = useExtensionsStore();
const browserStore = useBrowserStore();

const searchInput = ref('');
let searchTimer: any = null;

onMounted(() => {
  extensionsStore.fetchLocalExtensions();
});

const handleSearchInput = (val: string) => {
  searchInput.value = val;
  extensionsStore.searchQuery = val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (val.trim().length > 1) {
      extensionsStore.searchMarketplace(val.trim());
    }
  }, 450);
};

const clearSearch = () => {
  searchInput.value = '';
  extensionsStore.searchQuery = '';
  extensionsStore.marketplaceResults = [];
};

const tabs = [
  { id: 'all',        label: 'All' },
  { id: 'installed',  label: 'Active' },
  { id: 'local',      label: 'Local VS Code' },
  { id: 'themes',     label: 'Themes' },
  { id: 'languages',  label: 'Languages' },
  { id: 'formatters', label: 'Formatters' },
  { id: 'tools',      label: 'Tools' },
] as const;

const selectedModalExt = ref<VscodeExtension | null>(null);

const openDetailModal = (ext: VscodeExtension) => {
  selectedModalExt.value = ext;
};

const closeDetailModal = () => {
  selectedModalExt.value = null;
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
      title="Drag to resize Extensions"
    >
      <div class="absolute inset-y-0 -left-1 -right-1 z-10" />
    </div>

    <!-- Notification Toast Bar -->
    <Transition name="fade">
      <div
        v-if="extensionsStore.appliedMessage"
        class="absolute top-10 inset-x-2 z-50 bg-nvidia text-black font-semibold text-2xs px-3 py-1.5 rounded shadow-xl flex items-center justify-between pointer-events-auto"
      >
        <span class="flex items-center gap-1.5">
          <Check class="w-3.5 h-3.5 stroke-[2.5]" />
          {{ extensionsStore.appliedMessage }}
        </span>
        <button @click="extensionsStore.appliedMessage = ''" class="opacity-70 hover:opacity-100 p-0.5">
          <X class="w-3 h-3" />
        </button>
      </div>
    </Transition>

    <!-- Header -->
    <div class="flex items-center justify-between px-3 h-9 border-b border-border shrink-0 bg-surface/50">
      <div class="flex items-center gap-1.5">
        <Boxes class="w-3.5 h-3.5 text-nvidia" />
        <span class="font-semibold uppercase tracking-widest text-zinc-300 text-2xs">VS Code Extensions</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="extensionsStore.fetchLocalExtensions"
          class="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          :title="`Re-scan local extensions from ~/.vscode/extensions (${extensionsStore.localCount} found)`"
        >
          <RefreshCw class="w-3 h-3" :class="{ 'animate-spin': extensionsStore.isLoadingLocal }" />
        </button>
        <span class="text-2xs font-mono text-nvidia bg-nvidia/10 px-1.5 py-0.5 rounded border border-nvidia/20 font-medium">
          {{ extensionsStore.installedCount }} active
        </span>
      </div>
    </div>

    <!-- Search Input & Tabs -->
    <div class="px-2.5 py-2 border-b border-border shrink-0 bg-[#16161b]">
      <div class="relative flex items-center">
        <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-2 pointer-events-none" />
        <input
          :value="searchInput"
          @input="(e: any) => handleSearchInput(e.target.value)"
          type="text"
          placeholder="Search Extensions in Marketplace..."
          class="w-full bg-elevated border border-border focus:border-nvidia/60 rounded px-7 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
        />
        <div class="absolute right-1.5 flex items-center gap-1">
          <div v-if="extensionsStore.isSearching" class="w-3 h-3 border-2 border-nvidia border-t-transparent rounded-full animate-spin" />
          <button
            v-if="searchInput"
            @click="clearSearch"
            class="text-zinc-500 hover:text-zinc-300 p-0.5"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          v-for="f in tabs"
          :key="f.id"
          @click="extensionsStore.activeFilter = f.id"
          class="px-2 py-0.5 rounded text-2xs font-medium whitespace-nowrap transition-colors flex items-center gap-1"
          :class="extensionsStore.activeFilter === f.id
            ? 'bg-nvidia text-black font-semibold shadow-sm'
            : 'bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10'"
        >
          <span>{{ f.label }}</span>
          <span v-if="f.id === 'installed'" class="opacity-75">({{ extensionsStore.installedCount }})</span>
          <span v-else-if="f.id === 'local'" class="opacity-75 text-[9px] bg-black/20 px-1 rounded">({{ extensionsStore.localCount }})</span>
        </button>
      </div>
    </div>

    <!-- Extensions List -->
    <div class="flex-1 overflow-y-auto divide-y divide-border/30 py-1">
      <!-- Loading indicator -->
      <div v-if="extensionsStore.isSearching && extensionsStore.filteredExtensions.length === 0" class="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <div class="w-6 h-6 border-2 border-nvidia border-t-transparent rounded-full animate-spin mb-2" />
        <p class="text-xs">Searching Open VSX Marketplace...</p>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="extensionsStore.filteredExtensions.length === 0"
        class="flex flex-col items-center justify-center p-6 text-center text-zinc-500"
      >
        <Boxes class="w-8 h-8 text-zinc-700 mb-2" />
        <p class="text-xs font-medium text-zinc-400">No extensions found</p>
        <p class="text-2xs text-zinc-600 mt-1">Try another search keyword or switch filter tab</p>
      </div>

      <!-- Extension Cards -->
      <div
        v-for="ext in extensionsStore.filteredExtensions"
        :key="ext.id"
        class="p-2.5 hover:bg-white/[0.04] transition-colors flex flex-col gap-1.5 cursor-pointer group"
        @click="openDetailModal(ext)"
      >
        <!-- Top: Icon, Title, Publisher, Version, Local Badge -->
        <div class="flex items-start gap-2">
          <!-- Icon: image if url, else emoji -->
          <div
            class="w-8 h-8 rounded-md flex items-center justify-center text-base shrink-0 bg-[#1e1e24] border border-border/80 overflow-hidden"
            :style="{ borderColor: ext.color ? ext.color + '50' : undefined }"
          >
            <img
              v-if="ext.icon && (ext.icon.startsWith('http') || ext.icon.startsWith('data:image'))"
              :src="ext.icon"
              alt=""
              class="w-full h-full object-contain p-1"
            />
            <span v-else>{{ ext.icon || '📦' }}</span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-semibold text-zinc-200 truncate text-xs group-hover:text-nvidia transition-colors">
                {{ ext.displayName }}
              </span>
              <span class="text-2xs font-mono text-zinc-500 shrink-0">v{{ ext.version }}</span>
            </div>

            <!-- Meta: Publisher, verified badge, downloads, rating -->
            <div class="flex items-center gap-1.5 text-2xs text-zinc-400 mt-0.5 flex-wrap">
              <span class="font-medium text-zinc-300 flex items-center gap-0.5">
                {{ ext.publisher }}
                <ShieldCheck v-if="ext.verified" class="w-2.5 h-2.5 text-nvidia" />
              </span>
              <span>·</span>
              <span class="flex items-center gap-0.5 text-zinc-400">
                <Download class="w-2.5 h-2.5 text-zinc-500" />
                {{ ext.downloads }}
              </span>
              <span v-if="ext.rating">·</span>
              <span v-if="ext.rating" class="flex items-center gap-0.5 text-amber-400">
                <Star class="w-2.5 h-2.5 fill-amber-400" />
                {{ ext.rating }}
              </span>
              <!-- Local VS Code badge -->
              <span
                v-if="ext.isLocal"
                class="ml-auto text-[9px] font-mono px-1 py-0.2 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                title="Installed in local system VS Code"
              >
                Local VS Code
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <p class="text-2xs text-zinc-400 line-clamp-2 leading-relaxed">
          {{ ext.description }}
        </p>

        <!-- Actions Row -->
        <div class="flex items-center justify-between pt-1" @click.stop>
          <div class="flex items-center gap-1.5">
            <!-- Theme: Set Color Theme button -->
            <button
              v-if="ext.category === 'themes' || ext.contributes?.themes?.length"
              @click="extensionsStore.setTheme(ext.name)"
              class="flex items-center gap-1 text-2xs px-2 py-0.5 rounded border transition-colors"
              :class="extensionsStore.activeTheme === ext.name
                ? 'bg-nvidia/20 text-nvidia border-nvidia/50 font-semibold'
                : 'bg-white/5 text-zinc-300 border-border hover:bg-white/10 hover:text-white'"
            >
              <Palette class="w-2.5 h-2.5" />
              <span>{{ extensionsStore.activeTheme === ext.name ? 'Active Color Theme' : 'Apply Color Theme' }}</span>
            </button>

            <!-- Active / Enabled Status -->
            <span
              v-else-if="ext.installed && ext.enabled"
              class="inline-flex items-center gap-1 text-2xs text-nvidia font-medium"
            >
              <Check class="w-3 h-3 stroke-[2.5]" />
              Applied to BStudio
            </span>
            <span
              v-else-if="ext.installed && !ext.enabled"
              class="text-2xs text-zinc-500 italic"
            >
              Disabled
            </span>
          </div>

          <div class="flex items-center gap-1">
            <!-- Enable/Disable toggle (if installed) -->
            <button
              v-if="ext.installed"
              @click="extensionsStore.toggleEnable(ext.id)"
              class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
              :title="ext.enabled ? 'Disable extension' : 'Enable extension'"
            >
              <Power class="w-3 h-3" :class="{ 'text-nvidia': ext.enabled }" />
            </button>

            <!-- Uninstall button -->
            <button
              v-if="ext.installed && !ext.isLocal"
              @click="extensionsStore.uninstall(ext.id)"
              class="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
              title="Uninstall extension"
            >
              <Trash2 class="w-3 h-3" />
            </button>

            <!-- Install / Apply Button (if not installed) -->
            <button
              v-if="!ext.installed"
              @click="extensionsStore.install(ext)"
              class="bg-nvidia hover:bg-nvidia-bright text-black font-semibold text-2xs px-2.5 py-0.5 rounded transition-all shadow hover:shadow-glow-green flex items-center gap-1"
            >
              <Download class="w-2.5 h-2.5" />
              Install & Apply
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Extension Detail Modal -->
    <div
      v-if="selectedModalExt"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      @click.self="closeDetailModal"
    >
      <div class="w-full max-w-md bg-[#16161c] border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="flex items-start justify-between p-4 border-b border-border bg-surface/80">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-black/40 border border-border/80 flex items-center justify-center overflow-hidden shrink-0">
              <img
                v-if="selectedModalExt.icon && (selectedModalExt.icon.startsWith('http') || selectedModalExt.icon.startsWith('data:image'))"
                :src="selectedModalExt.icon"
                alt=""
                class="w-full h-full object-contain p-1"
              />
              <span v-else class="text-2xl">{{ selectedModalExt.icon || '📦' }}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-zinc-100">{{ selectedModalExt.displayName }}</h3>
                <span class="text-2xs font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">v{{ selectedModalExt.version }}</span>
              </div>
              <p class="text-2xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span>By <strong class="text-zinc-200">{{ selectedModalExt.publisher }}</strong></span>
                <ShieldCheck v-if="selectedModalExt.verified" class="w-3 h-3 text-nvidia" />
                <span>·</span>
                <span>{{ selectedModalExt.downloads }}</span>
              </p>
            </div>
          </div>
          <button @click="closeDetailModal" class="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/5">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-4 overflow-y-auto space-y-4 text-xs">
          <!-- Description -->
          <div>
            <h4 class="text-2xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Description</h4>
            <p class="text-zinc-300 leading-relaxed">{{ selectedModalExt.description }}</p>
          </div>

          <!-- Contributes / Features -->
          <div v-if="selectedModalExt.contributes">
            <h4 class="text-2xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Capabilities & Contributes</h4>
            <div class="flex flex-wrap gap-1.5">
              <span v-if="selectedModalExt.category === 'themes' || selectedModalExt.contributes?.themes?.length" class="px-2 py-1 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/30 text-2xs flex items-center gap-1 font-medium">
                <Palette class="w-3 h-3" /> Color Theme
              </span>
              <span v-if="selectedModalExt.contributes?.snippets?.length" class="px-2 py-1 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30 text-2xs flex items-center gap-1 font-medium">
                <Code2 class="w-3 h-3" /> Snippets Provider
              </span>
              <span v-if="selectedModalExt.contributes?.languages?.length" class="px-2 py-1 rounded bg-nvidia/15 text-nvidia border border-nvidia/30 text-2xs flex items-center gap-1 font-medium">
                <Check class="w-3 h-3" /> Language Support
              </span>
              <span v-if="selectedModalExt.isLocal" class="px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-2xs flex items-center gap-1 font-medium">
                <HardDrive class="w-3 h-3" /> Local VS Code Extension
              </span>
            </div>
          </div>

          <!-- Local Path (if local) -->
          <div v-if="selectedModalExt.folderPath" class="p-2.5 rounded bg-black/40 border border-border/60">
            <span class="text-[10px] text-zinc-500 font-mono block mb-1">LOCAL DISK LOCATION:</span>
            <code class="text-2xs text-zinc-300 break-all select-all font-mono">{{ selectedModalExt.folderPath }}</code>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-between p-3 border-t border-border bg-surface/50">
          <button @click="closeDetailModal" class="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5">
            Close
          </button>

          <div class="flex items-center gap-2">
            <!-- Apply Theme button -->
            <button
              v-if="selectedModalExt.category === 'themes' || selectedModalExt.contributes?.themes?.length"
              @click="extensionsStore.setTheme(selectedModalExt.name); closeDetailModal()"
              class="px-3 py-1.5 rounded text-xs bg-accent-purple/20 text-accent-purple border border-accent-purple/40 hover:bg-accent-purple/30 font-medium transition-colors flex items-center gap-1.5"
            >
              <Palette class="w-3.5 h-3.5" />
              Apply Color Theme
            </button>

            <!-- Install / Apply to BStudio -->
            <button
              v-if="!selectedModalExt.installed"
              @click="extensionsStore.install(selectedModalExt); closeDetailModal()"
              class="px-3 py-1.5 rounded text-xs bg-nvidia hover:bg-nvidia-bright text-black font-semibold transition-all shadow hover:shadow-glow-green flex items-center gap-1.5"
            >
              <Download class="w-3.5 h-3.5" />
              Apply to BStudio
            </button>
            <button
              v-else
              @click="extensionsStore.applyExtension(selectedModalExt); closeDetailModal()"
              class="px-3 py-1.5 rounded text-xs bg-nvidia/20 text-nvidia border border-nvidia/50 hover:bg-nvidia/30 font-semibold transition-colors flex items-center gap-1.5"
            >
              <Check class="w-3.5 h-3.5" />
              Re-Apply to BStudio
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
