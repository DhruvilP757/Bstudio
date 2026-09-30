# Dev-Shell UI/UX Design System Specification

> **A Developer-Centric Fusion of Modern IDE Ergonomics and Browser Fluidity**  
> *Inspired by VS Code, JetBrains Fleet & IntelliJ, Apple Safari, and Google Chrome.*

---

## 1. Executive Design Vision & Aesthetic Direction

**Dev-Shell** unifies two traditionally disparate digital environments:
1. **The Code & AI Studio** (inspired by **VS Code**, **Cursor**, and **JetBrains Fleet / IntelliJ**): High-density information architecture, sharp visual hierarchy, collapsible sidebars, status bars, syntax-highlighted code editors, and contextual AI reasoning drawers.
2. **The High-Performance Browser** (inspired by **Apple Safari** and **Google Chrome**): Sleek glassmorphism/acrylic header chrome, centered floating omnibar, responsive viewport frames, and comprehensive Chromium DevTools diagnostics.

```
+-----------------------------------------------------------------------------------------------------------------------------------------+
| [●][●][●]  [←][→][↻]  [ 🔒 https://localhost:3000/dashboard            ⚡ 3G ▼ ]  [ 🎯 Inspect ] [ 🟢 0  🟡 2  🔴 1 ]  [ ⚙️ ] [ ◫ ][ ◨ ] |
+-----------------------------------------------------------------------------------------------------------------------------------------+
| 🗂️ | [NavBar.vue ✕] [api.ts ✕] [Live Preview ⚡]               [ ◫ Split ]  |  🤖 NEMOTRON COPILOT                     [Nano ▼] [ ✕ ] |
| 🔍 | ───────────────────────────────────────────────────────────────────  |  ───────────────────────────────────────────────────────── |
| 🪲 | 1  <template>                                                        |  Attached Context: [ 🔴 SSR Mismatch ] [ NavBar.vue:42 ]   |
| ⚡ | 2    <nav class="flex items-center justify-between">                 |                                                            |
| 🌐 | 3      <div class="logo">DevShell</div>                              |  "I detected an SSR hydration mismatch on the Navbar        |
| ⚙️ | 4-     <span v-if="window.innerWidth > 768">Desktop</span>           |   component. Here is the atomic fix wrapped in onMounted:" |
|    | 5+     <span v-if="isMounted && isDesktop">Desktop</span>            |                                                            |
|    | 6      </nav>                                                        |  +-------------------------------------------------------+ |
|    | 7  </template>                                                       |  | 📄 src/components/NavBar.vue      [⚡ Apply to Codebase] | |
|    |                                                                      |  | - <span v-if="window.innerWidth > 768">               | |
|    |                                                                      |  | + <span v-if="isMounted && isDesktop">                | |
|    |                                                                      |  +-------------------------------------------------------+ |
|    |                                                                      |  [ 💬 Ask Nemotron 3 Ultra...                     [↵] ]   |
+----+----------------------------------------------------------------------+------------------------------------------------------------+
| ⌨️ TERMINAL | ⚡ SMART CURL | 🔥 CONCURRENCY LOAD (50 VUs) | 🧠 HEAP (42MB) | 🛠️ DEVTOOLS                                        [ ⤢ ][ ✕ ] |
| $ npm run dev                                                                                                                          |
| > ready in 320ms | Local: http://localhost:3000/                                                                                       |
+-----------------------------------------------------------------------------------------------------------------------------------------+
|  🌿 main*  |  ⨂ 1 Error  ⚠️ 2 Warnings  |  Vite HMR: Connected  |  Nemotron-3-Ultra: 48ms  |  UTF-8  |  Vue 3.4  |  Port: 5173         |
+-----------------------------------------------------------------------------------------------------------------------------------------+
```

### Guiding Principles
* **Zero Cognitive Friction:** Developers must never wonder where an error lives or which file caused it. Diagnostic telemetry connects runtime events directly to source lines.
* **Keyboard-First Ergonomics:** Every panel, tab, view mode, and patch approval can be triggered with standard IDE/browser keybindings.
* **Contextual Density Hierarchy:** Calm and clean by default (Safari-inspired minimalism); data-dense and precise during active debugging (JetBrains/Chrome-grade diagnostic matrices).
* **Hardware Occlusion Harmony:** Elegant transitions between native Chromium views (`WebContentsView`) and HTML/Vue overlays without layout tearing or visual clipping.

---

## 2. Color Palette & Visual Design Tokens

The theme adopts a **Deep Onyx / Obsidian** baseline with precision neon accents, borrowing the subtle, low-contrast panel separation of **JetBrains Fleet** and the refined dark mode luminescence of **macOS Safari**.

### Core Palette

| Token Name | Hex Code | Purpose & Application |
| :--- | :--- | :--- |
| **`bg-canvas`** | `#09090b` | Root window background, deep neutral border contrast |
| **`bg-surface`** | `#121215` | Editor background, primary panels, active tab backgrounds |
| **`bg-sidebar`** | `#16161a` | Activity bar, file explorer tree, drawer backgrounds |
| **`bg-elevated`** | `#1c1c21` | Modals, omnibar dropdowns, patch preview cards, tooltips |
| **`bg-glass`** | `rgba(22, 22, 26, 0.75)` | Safari-style backdrop frosted blur (`backdrop-blur-xl`) |
| **`border-subtle`** | `#26262b` | Panel dividers, tab separations, status bar line |
| **`border-active`** | `#3f3f46` | Active tab indicator, focused inputs, selection boundaries |

### Functional Semantic Accents

| Accent | Hex Code | Context / Usage |
| :--- | :--- | :--- |
| **NVIDIA Green / Emerald** | `#10b981` / `#76b900` | Primary action buttons, "⚡ Apply to Codebase", positive diff additions (`+`), system health OK |
| **Safari Sapphire** | `#3b82f6` | Browser hyperlinks, SSL padlock, active tab indicator, network requests |
| **Diagnostic Amber** | `#f59e0b` | Warnings, DOM bloat notices, missing SRI alerts, 3G throttling badge |
| **Diagnostic Crimson** | `#f43f5e` | Fatal errors, SSR hydration mismatches, diff deletions (`-`), 4xx/5xx network failures |
| **Nemotron Purple** | `#8b5cf6` | AI Copilot reasoning chips, Nemotron Ultra pill badge, token meters |

---

## 3. Layout Anatomy & Component Specifications

### 3.1. Top Navigation & Browser Chrome (Safari + Chrome Inspired)

* **Integrated Title Bar & Window Controls:**
  * Native-styled traffic lights on macOS (`[●][●][●]`) or sleek Windows controls on the top right.
  * Drag region enabled on unoccupied header space (`-webkit-app-region: drag`).
* **Browser Navigation Controls (Chrome Inspired):**
  * Subtle icon buttons for Back (`Alt+←`), Forward (`Alt+→`), and Reload (`Ctrl+R` / `Cmd+R`) with hover background washes.
* **The Unified Floating Omnibar (Safari Inspired):**
  * **Visual Style:** Pill-shaped (`rounded-full` or `rounded-xl`), centered, dark slate backdrop with a subtle 1px border (`border-subtle`).
  * **Status Elements:**
    * Left: SSL Security Padlock (Emerald if valid HTTPS, Muted gray for local development, Crimson alert if mixed content or invalid certificate).
    * Center: Clean URL typography with host highlighted and path dimmed.
    * Right: Network Throttling Dropdown (`Online`, `Fast 3G`, `Slow 3G`, `Offline`) with live ping/latency indicator.
* **Quick Diagnostics Badges (Chrome DevTools Inspired):**
  * Compact pill counter in the header:
    * `🟢 0` (Clean)
    * `🟡 2` (Warnings: e.g. Missing SRI, Non-standard Z-Index)
    * `🔴 1` (Critical: e.g. Hydration error, Memory leak)
  * Clicking any badge immediately filters the Copilot sidebar or opens the corresponding bottom drawer.
* **Viewport Emulation Matrix:**
  * Segmented control to toggle responsive presets: **Desktop** (100%), **Tablet** (768px), **Mobile** (375px), or **Fluid Responsive**.

---

### 3.2. Left Activity Bar & Project Workspace (VS Code Inspired)

* **Slim Activity Bar (48px Width):**
  * Vertical icon rail pinned to the far left:
    1. 🗂️ **Explorer** (Project file tree)
    2. 🔍 **Search** (Global codebase find & replace)
    3. 🪲 **CDP Diagnostics** (7-Domain real-time incident monitor)
    4. ⚡ **API Tester** (Smart cURL workbench)
    5. 🔥 **Load Engine** (Concurrency performance suite)
    6. ⚙️ **Settings & BYOK** (Nebius Token Factory credentials & preferences)
* **Collapsible File Explorer Panel (JetBrains / VS Code Inspired):**
  * Compact directory tree with arrow toggles, official file type icons (Vue, TypeScript, JSON, CSS, Markdown).
  * Color-coded Git status indicators (`M` modified in amber, `U` untracked in green).
  * Smooth resize handle separating the file tree from the editor/viewport.

---

### 3.3. Center Workspace: Dual-Mode Canvas (Editor & Browser)

Dev-Shell provides three viewing arrangements:
1. **Side-by-Side Split (Default):** Monaco Editor on the left (50%), Live Browser `WebContentsView` on the right (50%).
2. **Editor Focused:** Full-width code editor with floating browser Picture-in-Picture (PiP).
3. **Browser Focused:** Full-width live web testing with instant `F12` / slide-out code drawer.

#### The Monaco Code Editor Canvas (VS Code Inspired)
* **Editor Features:**
  * JetBrains Mono / Fira Code font rendering with ligatures enabled.
  * Minimap on the right gutter with error markers.
  * Inline diagnostic squiggly underlines synced directly with Chromium runtime errors.
  * Tab strip with dirty-state indicator (bullet `•` for unsaved changes) and breadcrumb bar (`src > components > NavBar.vue > <template>`).

#### The Live Browser Viewport (`WebContentsView`)
* Enclosed in an ergonomic device chassis frame when in mobile/tablet mode with subtle drop-shadows.
* Real-time CSS layout grid and box-model overlay when the **🎯 Inspect Element** mode is activated.
* Seamless coordinate synchronization: ResizeObserver adjusts bounds without flicker or visual clipping.

---

### 3.4. Right AI Copilot & Remediation Sidebar (Cursor & JetBrains AI Inspired)

The right sidebar is the autonomous brain of Dev-Shell, powered by **NVIDIA Nemotron 3**:

* **Header Controls:**
  * Model Selector Switch:
    * `Nemotron 3 Nano (30B)` — Sub-50ms instant telemetry triage.
    * `Nemotron 3 Ultra (550B)` — Deep architectural reasoning and multi-file patching.
  * Token Usage Counter: Micro-meter displaying session tokens and latency (e.g., `42ms · 1,240 tokens`).
* **Live Telemetry Context Tray:**
  * Removable chips indicating active context passed to the model:
    `[ 🔴 Hydration Mismatch ]` `[ 📄 NavBar.vue:42 ]` `[ 🌐 3G Throttling ]`
* **Chat Message Bubbles:**
  * Clean markdown typography with syntax highlighting and copy buttons.
  * Streaming token animations with pulsing green indicator.
* **Interactive Patch Cards (`PatchCard.vue`):**
  * When Nemotron proposes a fix, it renders a **JetBrains-style side-by-side unified diff card**:
    * Red deletion lines (`-`) and green insertion lines (`+`).
    * File path badge with change metrics (`+3 -1 lines`).
    * **Action Bar:**
      * Primary Button: `⚡ Apply to Codebase` (Executes atomic write via Main Process).
      * Secondary Button: `Inspect in Diff Viewer` (Opens full-screen Monaco diff).
      * Rollback State: Once applied, converts into an amber `↩ Rollback Patch` button.

---

### 3.5. Bottom Multi-Tool Drawer (VS Code / JetBrains Terminal Inspired)

A collapsible, tabbed drawer positioned at the bottom of the workspace:

* **Tab 1: ⌨️ Integrated Terminal (`node-pty` + `xterm.js`):**
  * Native shell (PowerShell/CMD on Windows, Zsh/Bash on macOS/Linux).
  * JetBrains Darcula color theme with clickable hyperlinks to files and ports.
* **Tab 2: ⚡ Smart cURL / API Testing Studio:**
  * Postman-like visual request builder: Method picker (`GET`, `POST`, `PUT`, `DELETE`), URL input, headers grid, JSON body editor with syntax validation.
  * **Human-in-the-Loop (HITL) Gate:** When the AI agent suggests executing a network probe, it queues the request here for 1-click user authorization.
* **Tab 3: 🔥 Concurrency Load Studio:**
  * Virtual user slider (`1` to `200` VUs) and duration slider (`5s` to `60s`).
  * Real-time Canvas-rendered latency percentile chart (p50, p90, p95, p99) and live Requests-Per-Second (RPS) odometer.
* **Tab 4: 🧠 Memory Profiler:**
  * Real-time JS Heap usage bar (`42 MB / 128 MB`).
  * Detached DOM node counter with 1-click `Trigger V8 Garbage Collection` button.
* **Tab 5: 🛠️ Native Chromium DevTools:**
  * Direct docking of native Chromium DevTools (Elements, Console, Sources, Network, Application) or pop-out to a detached secondary monitor window.

---

### 3.6. Bottom Status Bar (VS Code Inspired)

An 18px high-density footer anchoring the application:
* **Left Section:** Current Git branch (`🌿 main*`), Unsaved files counter, Diagnostics tally (`⨂ 1 Error  ⚠️ 2 Warnings`).
* **Center Section:** Vite HMR connection status (`⚡ HMR Live`), Active local port (`localhost:3000`).
* **Right Section:** Nemotron API status & response latency (`⚡ Ultra: 48ms`), Encoding (`UTF-8`), Language mode (`Vue 3.4`), Indentation (`Spaces: 2`).

---

## 4. Typography & Iconography System

### Typography Hierarchy

| Style Role | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Window & Tab Headers** | Inter / SF Pro Display | 12px | 500 (Medium) | 16px |
| **Omnibar Input** | JetBrains Mono / Inter | 13px | 400 (Regular) | 18px |
| **Panel Titles / Badges** | Inter / SF Pro Text | 11px | 600 (Semibold) | 14px |
| **Code Editor & Diffs** | JetBrains Mono / Fira Code | 13px | 400 (Regular) | 20px |
| **Terminal Output** | JetBrains Mono / Cascadia Code | 12px | 400 (Regular) | 16px |
| **Status Bar Items** | Inter / SF Pro Text | 11px | 400 (Regular) | 14px |

### Iconography
* **Primary Icon Set:** **Lucide Icons** (clean, 1.5px stroke weight, high geometric consistency).
* **Language & File Icons:** **Seti / VS Code Material Icons** for rapid file recognition.
* **Status Badges:** Circular glowing micro-dots (Emerald for active/connected, Amber for warnings, Crimson for errors).

---

## 5. Micro-Interactions, Transitions & Motion Design

1. **Modal & Drawer Physics:**
   * Transitions use a swift cubic-bezier curve (`cubic-bezier(0.16, 1, 0.3, 1)`) with `150ms` duration.
   * Drawers slide smoothly without lagging or causing `WebContentsView` coordinate mismatch.
2. **Interactive Diff Hover:**
   * Hovering over a `PatchCard.vue` in the AI sidebar highlights the corresponding lines in the Monaco editor.
3. **Atomic Patch Application Effect:**
   * Clicking "⚡ Apply to Codebase" flashes the target tab and affected lines with a gentle emerald glow (`#10b98122`) for 600ms, accompanied by a subtle progress checkmark.
4. **Hardware Occlusion Guard:**
   * Opening any full-window modal (e.g., Diff Viewer or API Settings) automatically signals the Main Process to set `webContentsView.setVisible(false)`, preventing native platform surface bleed-through.

---

## 6. Keyboard Shortcuts & Productivity Hotkeys

Dev-Shell implements standard muscle-memory keybindings from VS Code, Chrome, and JetBrains:

| Shortcut (Win / Linux) | Shortcut (macOS) | Action / Command |
| :--- | :--- | :--- |
| `Ctrl + K` / `Ctrl + P` | `Cmd + K` / `Cmd + P` | **Universal Command Palette** (Navigate files, run audits, switch tabs) |
| `Ctrl + L` | `Cmd + L` | **Focus Omnibar / URL Input** |
| `Ctrl + R` | `Cmd + R` | **Reload Active Web Page** |
| `Ctrl + Shift + R` | `Cmd + Shift + R` | **Hard Reload (Bypass Cache)** |
| `Ctrl + \`` | `Cmd + \`` | **Toggle Bottom Terminal / Drawer** |
| `Ctrl + B` | `Cmd + B` | **Toggle Left Activity / File Explorer Sidebar** |
| `Ctrl + I` | `Cmd + I` | **Focus AI Copilot Chat Input** |
| `Ctrl + Shift + C` | `Cmd + Shift + C` | **Toggle Native Element Inspect Mode** |
| `F12` | `F12` | **Toggle Docked Chromium DevTools** |
| `Ctrl + S` | `Cmd + S` | **Save File & Auto-Backup** |
| `Ctrl + Enter` | `Cmd + Enter` | **Apply Focused AI Patch to Codebase** |
| `Ctrl + Z` (in chat) | `Cmd + Z` (in chat) | **Rollback Last Codebase Patch** |

---

## 7. Implementation Checklist for Frontend Engineers

* [ ] Setup **Tailwind CSS** with custom Onyx/Obsidian color tokens and JetBrains Mono typography.
* [ ] Implement **`ViewportAnchor.vue`** with `ResizeObserver` and `devicePixelRatio` scaling.
* [ ] Build **Safari-style Omnibar** component with SSL indicators and responsive device selector.
* [ ] Integrate **Monaco Editor** (`@monaco-editor/vue` or native loader) with side-by-side diff capabilities.
* [ ] Integrate **xterm.js** with `FitAddon` and `WebLinksAddon` inside `TerminalPanel.vue`.
* [ ] Build **`PatchCard.vue`** with unified diff visualization and 1-click IPC trigger (`ai:apply-patch`).
* [ ] Implement **`DiagnosticsBadgeBar.vue`** with live telemetry store reactivity for all 7 CDP domains.
* [ ] Bind global keyboard shortcuts via Mousetrap or standard Vue event listeners.
