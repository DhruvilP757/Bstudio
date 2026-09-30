export type NetworkProfile = 'online' | 'fast-3g' | 'slow-3g' | 'offline';

export type DevicePreset = 'desktop' | 'tablet' | 'mobile' | 'responsive';

export interface BoxModelMetric {
  content: number[];
  padding: number[];
  border: number[];
  margin: number[];
  width: number;
  height: number;
}

export interface InspectedNodeInfo {
  nodeId: number;
  backendNodeId: number;
  nodeName: string;
  localName: string;
  attributes: Record<string, string>;
  boxModel?: BoxModelMetric | null;
  computedStyles: Record<string, string>;
  outerHtml: string;
}

export interface HeapStatistics {
  totalHeapSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  detachedNodesCount: number;
}
