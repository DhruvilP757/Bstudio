<script setup lang="ts">
import { useApiTesterStore } from '../../stores/api-tester-store';
import { Play, Check, X, Clock, HardDrive } from 'lucide-vue-next';

const apiStore = useApiTesterStore();
</script>

<template>
  <div class="w-full h-full flex flex-col bg-surface p-3 select-none text-xs overflow-y-auto">
    <!-- HITL Notice Banner -->
    <div v-if="apiStore.hitlQueue.length > 0" class="mb-3 p-2 bg-nvidia/10 border border-nvidia/30 rounded flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-nvidia animate-ping"></span>
        <span class="text-nvidia font-medium">Nemotron proposed an API probe (Human-in-the-Loop):</span>
        <span class="font-mono text-gray-200">{{ apiStore.hitlQueue[0].method }} {{ apiStore.hitlQueue[0].url }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="apiStore.acceptAgentRequest(0)"
          class="flex items-center gap-1 bg-nvidia hover:bg-nvidia-dark text-black px-2 py-0.5 rounded font-medium transition-colors"
        >
          <Check class="w-3.5 h-3.5" />
          <span>Approve & Execute</span>
        </button>
        <button 
          @click="apiStore.dismissAgentRequest(0)"
          class="text-gray-400 hover:text-white p-1"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Request Builder Header -->
    <div class="flex items-center gap-2 mb-3">
      <select 
        v-model="apiStore.currentRequest.method"
        class="bg-elevated border border-subtle text-nvidia font-semibold px-2 py-1.5 rounded focus:outline-none"
      >
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="PATCH">PATCH</option>
        <option value="DELETE">DELETE</option>
      </select>

      <input 
        type="text" 
        v-model="apiStore.currentRequest.url"
        class="flex-1 bg-elevated border border-subtle px-3 py-1.5 rounded font-mono text-gray-200 focus:outline-none focus:border-safari-blue"
        placeholder="https://api.example.com/endpoint"
      />

      <button 
        @click="apiStore.execute"
        :disabled="apiStore.isLoading"
        class="flex items-center gap-1.5 bg-safari-blue hover:bg-safari-active text-white px-4 py-1.5 rounded font-medium transition-colors disabled:opacity-50"
      >
        <Play class="w-3.5 h-3.5 fill-current" />
        <span>{{ apiStore.isLoading ? 'Sending...' : 'Send' }}</span>
      </button>
    </div>

    <!-- Request Body & Response Split -->
    <div class="flex-1 grid grid-cols-2 gap-3 min-h-[160px]">
      <!-- Request Body / Headers -->
      <div class="flex flex-col bg-canvas border border-subtle rounded p-2">
        <span class="text-gray-400 font-semibold mb-1 text-[11px]">Request Body (JSON)</span>
        <textarea 
          v-model="apiStore.currentRequest.body"
          class="flex-1 w-full bg-transparent font-mono text-xs text-gray-200 focus:outline-none resize-none"
          placeholder="{}"
          spellcheck="false"
        ></textarea>
      </div>

      <!-- Response Viewer -->
      <div class="flex flex-col bg-canvas border border-subtle rounded p-2 overflow-hidden">
        <div class="flex items-center justify-between mb-1 pb-1 border-b border-subtle text-[11px]">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-400">Response</span>
            <span 
              v-if="apiStore.lastResponse" 
              class="px-1.5 py-0.5 rounded font-mono text-[10px]"
              :class="apiStore.lastResponse.status < 400 ? 'bg-nvidia/20 text-nvidia' : 'bg-diagnostic-crimson/20 text-diagnostic-crimson'"
            >
              {{ apiStore.lastResponse.status }} {{ apiStore.lastResponse.statusText }}
            </span>
          </div>

          <div v-if="apiStore.lastResponse" class="flex items-center gap-3 text-gray-400 font-mono text-[10px]">
            <span class="flex items-center gap-1">
              <Clock class="w-3 h-3" />
              {{ apiStore.lastResponse.timeMs }}ms
            </span>
            <span class="flex items-center gap-1">
              <HardDrive class="w-3 h-3" />
              {{ apiStore.lastResponse.sizeBytes }} B
            </span>
          </div>
        </div>

        <pre class="flex-1 overflow-auto font-mono text-xs text-gray-300 select-text">{{ apiStore.lastResponse ? apiStore.lastResponse.data : '// Execute a request to see output' }}</pre>
      </div>
    </div>
  </div>
</template>
