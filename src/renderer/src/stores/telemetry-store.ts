import { defineStore } from 'pinia';
import { DiagnosticTelemetry, DiagnosticDomain } from '../../../shared/telemetry-types';
import { InspectedNodeInfo } from '../../../shared/cdp-types';

export const useTelemetryStore = defineStore('telemetry', {
  state: () => ({
    events: [] as DiagnosticTelemetry[],
    inspectedNode: null as InspectedNodeInfo | null,
    domainFilter: null as DiagnosticDomain | null
  }),
  getters: {
    criticalCount: (state) => state.events.filter((e) => e.severity === 'critical').length,
    warningCount: (state) => state.events.filter((e) => e.severity === 'warning').length,
    infoCount: (state) => state.events.filter((e) => e.severity === 'info').length,
    filteredEvents: (state) => {
      if (!state.domainFilter) return state.events;
      return state.events.filter((e) => e.domain === state.domainFilter);
    }
  },
  actions: {
    addTelemetry(item: DiagnosticTelemetry) {
      this.events.unshift(item);
      if (this.events.length > 100) this.events.pop();
    },
    setInspectedNode(node: InspectedNodeInfo) {
      this.inspectedNode = node;
    },
    clearEvents() {
      this.events = [];
    }
  }
});
