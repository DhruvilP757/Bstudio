import { CdpCore } from './cdp-core';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { InspectedNodeInfo } from '../../shared/cdp-types';

export class ElementInspector {
  private isInspectModeActive: boolean = false;

  constructor(private cdpCore: CdpCore, private mainWindow: BrowserWindow) {
    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.cdpCore.subscribe('Overlay.inspectNodeRequested', async (params: { backendNodeId: number }) => {
      await this.handleNodeInspected(params.backendNodeId);
    });
  }

  public async setInspectMode(enabled: boolean): Promise<void> {
    this.isInspectModeActive = enabled;
    try {
      if (enabled) {
        await this.cdpCore.sendCommand('Overlay.setInspectMode', {
          mode: 'searchForNode',
          highlightConfig: {
            showInfo: true,
            showRulers: true,
            showExtensionLines: true,
            contentColor: { r: 16, g: 185, b: 129, a: 0.3 }, // emerald-500
            paddingColor: { r: 59, g: 130, b: 246, a: 0.2 }, // blue-500
            borderColor: { r: 16, g: 185, b: 129, a: 1.0 },
            marginColor: { r: 245, g: 158, b: 11, a: 0.2 }   // amber-500
          }
        });
      } else {
        await this.cdpCore.sendCommand('Overlay.setInspectMode', {
          mode: 'none',
          highlightConfig: {}
        });
      }
    } catch (err) {
      console.warn('[ElementInspector] Failed setting inspect mode:', err);
    }
  }

  public async handleNodeInspected(backendNodeId: number): Promise<void> {
    try {
      const nodeDescription = await this.cdpCore.sendCommand('DOM.describeNode', {
        backendNodeId,
        depth: 2,
        pierce: true
      });

      const nodeId = nodeDescription.node.nodeId;
      let boxModel = null;
      try {
        const boxRes = await this.cdpCore.sendCommand('DOM.getBoxModel', { backendNodeId });
        boxModel = boxRes.model;
      } catch (e) {}

      const computedStyle = await this.cdpCore.sendCommand('CSS.getComputedStyleForNode', { nodeId });
      const styleMap: Record<string, string> = {};
      if (computedStyle && computedStyle.computedStyle) {
        for (const item of computedStyle.computedStyle) {
          styleMap[item.name] = item.value;
        }
      }

      const outerHtmlResult = await this.cdpCore.sendCommand('DOM.getOuterHTML', { backendNodeId });
      const outerHtml = outerHtmlResult?.outerHTML || '';

      const attributesMap: Record<string, string> = {};
      const attrs = nodeDescription.node.attributes || [];
      for (let i = 0; i < attrs.length; i += 2) {
        attributesMap[attrs[i]] = attrs[i + 1];
      }

      const nodeInfo: InspectedNodeInfo = {
        nodeId,
        backendNodeId,
        nodeName: nodeDescription.node.nodeName,
        localName: nodeDescription.node.localName || nodeDescription.node.nodeName.toLowerCase(),
        attributes: attributesMap,
        boxModel,
        computedStyles: styleMap,
        outerHtml
      };

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.CDP_NODE_INSPECTED, nodeInfo);
      }

      // Check anomalies
      const zIndex = styleMap['z-index'] || 'auto';
      if (zIndex !== 'auto' && parseInt(zIndex) >= 9999) {
        this.cdpCore.emitTelemetry({
          id: `elem_z_${Date.now()}`,
          domain: 'element',
          severity: 'warning',
          timestamp: Date.now(),
          title: 'Extreme Z-Index Detected',
          summary: `Element <${nodeInfo.localName}> uses extreme z-index: ${zIndex}.`,
          technicalDetails: {
            nodeId,
            selector: nodeInfo.localName,
            outerHtml: outerHtml.substring(0, 300),
            metrics: { zIndex: parseInt(zIndex) }
          },
          suggestedAction: {
            label: 'Refactor Stacking Context',
            description: 'Apply isolation: isolate on parent components instead of extreme z-index values.',
            promptToCopilot: `The element <${nodeInfo.localName}> uses an extreme z-index of ${zIndex}. Suggest a cleaner stacking context.`
          }
        });
      }
    } catch (err) {
      console.error('[ElementInspector] Failed inspecting node:', err);
    }
  }

  public async runFullDomHealthAudit(): Promise<void> {
    try {
      const script = `
        (() => {
          const allNodes = document.querySelectorAll('*');
          const totalCount = allNodes.length;
          let emptyInteractiveCount = 0;
          for (const el of allNodes) {
            if (el.tagName === 'BUTTON' || el.tagName === 'A') {
              const text = el.innerText?.trim();
              const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
              const title = el.getAttribute('title');
              if (!text && !aria && !title) emptyInteractiveCount++;
            }
          }
          return { totalCount, emptyInteractiveCount };
        })()
      `;

      const evalResult: any = await this.cdpCore.sendCommand('Runtime.evaluate', {
        expression: script,
        returnByValue: true
      });

      const { totalCount, emptyInteractiveCount } = evalResult?.result?.value || {};
      if (totalCount > 1200) {
        this.cdpCore.emitTelemetry({
          id: `dom_bloat_${Date.now()}`,
          domain: 'element',
          severity: 'warning',
          timestamp: Date.now(),
          title: 'DOM Bloat: High Node Count',
          summary: `Document contains ${totalCount} DOM nodes (Recommended: < 800). Large trees cause memory overhead and sluggish reflows.`,
          technicalDetails: { metrics: { totalCount } },
          suggestedAction: {
            label: 'Virtualize Lists',
            description: 'Lazy-load below-the-fold components and virtualize large lists.',
            promptToCopilot: `The page renders ${totalCount} DOM elements. Propose architectural changes to virtualize components.`
          }
        });
      }

      if (emptyInteractiveCount > 0) {
        this.cdpCore.emitTelemetry({
          id: `a11y_empty_${Date.now()}`,
          domain: 'element',
          severity: 'critical',
          timestamp: Date.now(),
          title: 'Missing Accessible Names',
          summary: `Found ${emptyInteractiveCount} button(s) or link(s) without accessible text or aria-label.`,
          technicalDetails: { metrics: { emptyInteractiveCount } },
          suggestedAction: {
            label: 'Add ARIA Labels',
            description: 'Inject aria-label or accessible text to improve accessibility.',
            promptToCopilot: `Interactive elements on the page lack accessible names. Generate accessible ARIA labels for buttons and links.`
          }
        });
      }
    } catch (err) {
      console.warn('[ElementInspector] DOM audit failed:', err);
    }
  }
}
