# Lab Results Realtime Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the consultation page react to live `clinops_lab_results` WebSocket events from the Node bridge: refresh the Orders/Results lists in place, and let the clinician open a released result in a modal from the Orders tab via a global realtime provider + central lab-result bus.

**Architecture:** A module-level singleton WebSocket client (`lib/realtime.ts`) is exposed through a React context (`RealtimeProvider`). A `LabResultBusProvider` (mounted once in `app/(app)/layout.tsx`) listens to `clinops_lab_results`, fetches full result detail from REST, keeps a de-duped inbox, fires an arrival toast, and renders a central `LabResultModal`. The consultation page subscribes to the same socket to refetch its orders/results lists when a result arrives for the active encounter, and its Orders rows get a "View Result" button.

**Tech Stack:** Next.js 16 (app router), React 19, TypeScript 5, Tailwind v4, base-ui/shadcn components (Button, Badge, Card, Skeleton, EmptyState, Modal), date-fns, Vitest 4 + Testing Library, ESLint 9.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code (the installed Next version has breaking changes vs. public docs). Heed deprecation notices.
- Use existing components: `Modal` from `@/components/ui/Modal` (props `{ open, onClose, title, subtitle, children, size, footer }`), `Button` from `@/components/ui/button`, `Badge` from `@/components/ui/badge`. `Badge` variants are only `default | secondary | destructive | outline | ghost | link` — no `warning`.
- API responses use the Laravel envelope `{ status, message, data }`. Normalize with `res?.data?.data ?? res?.data` (paginated/unwrapped fallback).
- Tests must mock `@/lib/api` (and `@/store/RoleContext` when a component uses `useAuth`) with `vi.hoisted` + `vi.mock`, matching the existing style in `__tests__/lab-results-panel.test.tsx`. `@testing-library/jest-dom` is auto-registered via `vitest.setup.ts`.
- The WS bridge broadcasts to all clients with no auth; the client filters by `data.encounter_id`/`data.patient_id`.
- Verify before each commit: `npm test`, `npx eslint <changed paths>` (quoted), `npm run build`. On Windows/PowerShell; the working branch is `billing`.
- `git add` ONLY the files listed in each task — never `git add -A`. `next-env.d.ts` is already modified (pre-existing, unrelated) — leave it alone.
- Do not add code comments.

---

### Task 1: `getWsUrl()` config helper

**Files:**
- Modify: `lib/config.ts`
- Test: `__tests__/config.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export function getWsUrl(): string
  // NEXT_PUBLIC_WS_URL override, else "ws://localhost:6001"
  ```

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/config.test.ts` (inside the existing `describe("environment config")` block):

```ts
  it("uses the explicit WS URL from the environment", async () => {
    process.env.NEXT_PUBLIC_WS_URL = "ws://bridge.example.test:6001";

    const { getWsUrl } = await import("../lib/config");

    expect(getWsUrl()).toBe("ws://bridge.example.test:6001");
  });

  it("falls back to the default local bridge when no WS URL is set", async () => {
    delete process.env.NEXT_PUBLIC_WS_URL;

    const { getWsUrl } = await import("../lib/config");

    expect(getWsUrl()).toBe("ws://localhost:6001");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/config.test.ts`
Expected: FAIL — `getWsUrl` is not exported from `../lib/config`.

- [ ] **Step 3: Implement**

In `lib/config.ts`, add above the `getAppEnv` function:

```ts
export function getWsUrl() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  return "ws://localhost:6001";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/config.test.ts`
Expected: 5 tests PASS (3 existing + 2 new).

- [ ] **Step 5: Lint**

Run: `npx eslint "lib/config.ts" "__tests__/config.test.ts"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "lib/config.ts" "__tests__/config.test.ts"
git commit -m "feat(config): add getWsUrl for the realtime bridge"
```

---

### Task 2: Singleton realtime WebSocket client

**Files:**
- Create: `lib/realtime.ts`
- Modify: `types/lab.ts`
- Test: `__tests__/realtime.test.ts`

**Interfaces:**
- Consumes: `getWsUrl()` from `@/lib/config` (Task 1).
- Produces:
  ```ts
  export type RealtimeStatus = "connecting" | "connected" | "offline";
  export function subscribe(channel: string, handler: (data: unknown) => void): () => void;
  export function getStatus(): RealtimeStatus;
  export function onStatusChange(cb: (s: RealtimeStatus) => void): () => void;
  export function routeMessage(raw: string): void;        // exported for tests
  export function closeRealtime(): void;                   // close socket + reset state
  ```
  Also appends to `types/lab.ts`:
  ```ts
  export interface LabResultEvent {
    event: string;
    lab_result_id: number;
    lab_request_id: number;
    encounter_id: number;
    patient_id: number | null;
    result_value: string | null;
    unit: string | null;
    is_critical: boolean;
    is_abnormal: boolean;
    status: string;
    color: string | null;
    priority: string | null;
    occurred_at: string;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/realtime.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  close() {}
}

describe("realtime client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadRealtime() {
    return await import("../lib/realtime");
  }

  it("routes incoming messages to the handlers of the matching channel only", async () => {
    const rt = await loadRealtime();
    const a = vi.fn();
    const b = vi.fn();
    rt.subscribe("clinops_lab_results", a);
    rt.subscribe("clinops_vital_signs", b);

    rt.routeMessage(JSON.stringify({ channel: "clinops_lab_results", data: { lab_result_id: 7 } }));

    expect(a).toHaveBeenCalledWith({ lab_result_id: 7 });
    expect(b).not.toHaveBeenCalled();
  });

  it("unsubscribes a handler", async () => {
    const rt = await loadRealtime();
    const a = vi.fn();
    const off = rt.subscribe("clinops_lab_results", a);
    off();
    rt.routeMessage(JSON.stringify({ channel: "clinops_lab_results", data: { x: 1 } }));
    expect(a).not.toHaveBeenCalled();
  });

  it("connects to the configured bridge URL and reports status", async () => {
    const rt = await loadRealtime();
    const statuses: string[] = [];
    rt.onStatusChange((s) => statuses.push(s));

    rt.subscribe("clinops_lab_results", vi.fn());
    expect(FakeWebSocket.instances.length).toBe(1);
    expect(FakeWebSocket.instances[0].url).toBe("ws://localhost:6001");

    FakeWebSocket.instances[0].onopen?.();
    expect(rt.getStatus()).toBe("connected");
  });

  it("reconnects after the socket closes", async () => {
    const rt = await loadRealtime();
    rt.subscribe("clinops_lab_results", vi.fn());

    FakeWebSocket.instances[0].onclose?.();
    await vi.advanceTimersByTimeAsync(1100);

    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it("closeRealtime resets handlers", async () => {
    const rt = await loadRealtime();
    const a = vi.fn();
    rt.subscribe("clinops_lab_results", a);
    rt.closeRealtime();
    rt.routeMessage(JSON.stringify({ channel: "clinops_lab_results", data: { x: 1 } }));
    expect(a).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/realtime.test.ts`
Expected: FAIL — cannot find module `../lib/realtime`.

- [ ] **Step 3: Implement**

Create `lib/realtime.ts`:

```ts
"use client";

import { getWsUrl } from "./config";

export type RealtimeStatus = "connecting" | "connected" | "offline";

const handlers = new Map<string, Set<(data: unknown) => void>>();
const statusListeners = new Set<(s: RealtimeStatus) => void>();

let socket: WebSocket | null = null;
let status: RealtimeStatus = "offline";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((cb) => cb(status));
}

export function getStatus() {
  return status;
}

export function onStatusChange(cb: (s: RealtimeStatus) => void) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

export function routeMessage(raw: string) {
  let msg: { channel?: string; data?: unknown };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  const channel = msg?.channel;
  if (!channel) return;
  const set = handlers.get(channel);
  if (!set) return;
  set.forEach((handler) => handler(msg.data));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 5000);
}

function connect() {
  if (typeof window === "undefined" || socket) return;
  setStatus("connecting");
  const ws = new WebSocket(getWsUrl());
  socket = ws;

  ws.onopen = () => {
    reconnectDelay = 1000;
    setStatus("connected");
  };

  ws.onmessage = (event: MessageEvent) => routeMessage(String(event.data));

  ws.onclose = () => {
    if (socket === ws) socket = null;
    setStatus("offline");
    scheduleReconnect();
  };

  ws.onerror = () => {};
}

export function subscribe(channel: string, handler: (data: unknown) => void) {
  if (!handlers.has(channel)) handlers.set(channel, new Set());
  handlers.get(channel)!.add(handler);
  connect();
  return () => {
    handlers.get(channel)?.delete(handler);
  };
}

export function closeRealtime() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  handlers.clear();
  statusListeners.clear();
  reconnectDelay = 1000;
  setStatus("offline");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/realtime.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "lib/realtime.ts" "types/lab.ts" "__tests__/realtime.test.ts"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "lib/realtime.ts" "types/lab.ts" "__tests__/realtime.test.ts"
git commit -m "feat(realtime): add singleton WebSocket client for the bridge"
```

---

### Task 3: `RealtimeProvider` context

**Files:**
- Create: `store/RealtimeContext.tsx`
- Test: `__tests__/realtime-context.test.tsx`

**Interfaces:**
- Consumes: `subscribe`, `getStatus`, `onStatusChange`, `closeRealtime` from `@/lib/realtime` (Task 2).
- Produces:
  ```ts
  interface RealtimeContextValue {
    subscribe: typeof subscribe;
    status: RealtimeStatus;
  }
  export function RealtimeProvider({ children }: { children: React.ReactNode }): JSX.Element;
  export function useRealtime(): RealtimeContextValue; // throws outside provider
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/realtime-context.test.tsx`:

```tsx
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RealtimeProvider, useRealtime } from "../store/RealtimeContext";

const realtimeMocks = vi.hoisted(() => ({
  subscribe: vi.fn(() => vi.fn()),
  getStatus: vi.fn(() => "connecting"),
  onStatusChange: vi.fn(() => vi.fn()),
  closeRealtime: vi.fn(),
}));

vi.mock("@/lib/realtime", () => realtimeMocks);

function Probe() {
  const rt = useRealtime();
  return (
    <button onClick={() => rt.subscribe("clinops_lab_results", () => {})}>
      {rt.status}
    </button>
  );
}

describe("RealtimeProvider", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("provides subscribe and status through useRealtime", () => {
    render(
      <RealtimeProvider>
        <Probe />
      </RealtimeProvider>
    );
    expect(screen.getByRole("button", { name: "connecting" })).toBeInTheDocument();
    act(() => screen.getByRole("button").click());
    expect(realtimeMocks.subscribe).toHaveBeenCalledWith("clinops_lab_results", expect.any(Function));
  });

  it("throws when useRealtime is used outside the provider", () => {
    expect(() => render(<Probe />)).toThrow("useRealtime must be used within a RealtimeProvider");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/realtime-context.test.tsx`
Expected: FAIL — cannot find module `../store/RealtimeContext`.

- [ ] **Step 3: Implement**

Create `store/RealtimeContext.tsx`:

```tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  subscribe,
  getStatus,
  onStatusChange,
  closeRealtime,
  type RealtimeStatus,
} from "@/lib/realtime";

interface RealtimeContextValue {
  subscribe: typeof subscribe;
  status: RealtimeStatus;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>(getStatus);

  useEffect(() => {
    const off = onStatusChange(setStatus);
    return off;
  }, []);

  useEffect(() => {
    return () => closeRealtime();
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe, status }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider");
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/realtime-context.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "store/RealtimeContext.tsx" "__tests__/realtime-context.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "store/RealtimeContext.tsx" "__tests__/realtime-context.test.tsx"
git commit -m "feat(realtime): add RealtimeProvider context"
```

---

### Task 4: `LabResultModal` presentational component

**Files:**
- Create: `components/consultation/LabResultModal.tsx`
- Test: `__tests__/lab-result-modal.test.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/Modal`, `Badge` from `@/components/ui/badge`, `LabResult` from `@/types/lab`.
- Produces:
  ```ts
  export default function LabResultModal({ result, onClose }: {
    result: LabResult;
    onClose: () => void;
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/lab-result-modal.test.tsx`:

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LabResultModal from "../components/consultation/LabResultModal";
import type { LabResult } from "../types/lab";

const base: LabResult = {
  id: 10,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: false,
  status: "released",
  released_at: "2026-08-06T08:38:21.000000Z",
  released_by: { id: 3, name: "Dr. Owen Banda" },
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", status: "Completed" },
};

describe("LabResultModal", () => {
  it("renders test name, value, unit, and reference range", () => {
    render(<LabResultModal result={base} onClose={vi.fn()} />);
    expect(screen.getByText("CBC")).toBeInTheDocument();
    expect(screen.getByText("13.5 g/dL")).toBeInTheDocument();
    expect(screen.getByText("(12-16)")).toBeInTheDocument();
  });

  it("renders Critical and Abnormal badges when flagged", () => {
    render(
      <LabResultModal
        result={{
          ...base,
          result_value_numeric: 18.2,
          is_abnormal: true,
          is_critical: true,
        }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Abnormal")).toBeInTheDocument();
  });

  it("renders released meta when released_by is present", () => {
    render(<LabResultModal result={base} onClose={vi.fn()} />);
    expect(screen.getByText(/Dr\. Owen Banda/)).toBeInTheDocument();
  });

  it("renders the value without reference range meta when absent", () => {
    render(
      <LabResultModal
        result={{ ...base, reference_range: null, released_by: null }}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("13.5 g/dL")).toBeInTheDocument();
    expect(screen.queryByText("(12-16)")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lab-result-modal.test.tsx`
Expected: FAIL — cannot find module `../components/consultation/LabResultModal`.

- [ ] **Step 3: Implement**

Create `components/consultation/LabResultModal.tsx`:

```tsx
"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { LabResult } from "@/types/lab";

function valueOf(result: LabResult) {
  if (result.result_value_numeric != null) return String(result.result_value_numeric);
  return result.result_value_text ?? "-";
}

export default function LabResultModal({ result, onClose }: { result: LabResult; onClose: () => void }) {
  const testName = result.lab_request?.test_name ?? "Lab result";
  const value = valueOf(result);

  return (
    <Modal
      open
      onClose={onClose}
      title={testName}
      subtitle="Laboratory Result"
      size="md"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-2xl font-bold", result.is_critical && "text-red-600", result.is_abnormal && !result.is_critical && "text-amber-600")}>
            {value}{result.unit ? ` ${result.unit}` : ""}
          </span>
          {result.is_critical && <Badge variant="destructive">Critical</Badge>}
          {result.is_abnormal && !result.is_critical && <Badge variant="secondary" className="text-amber-700">Abnormal</Badge>}
        </div>

        {result.reference_range && (
          <div className="text-sm">
            <span className="text-muted-foreground">Reference range: </span>
            <span className="font-mono font-semibold">{result.reference_range}</span>
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold capitalize">{result.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Released</span>
            <span className="font-mono text-xs">{result.released_at ? format(new Date(result.released_at), "dd MMM yyyy HH:mm") : "—"}</span>
          </div>
          {result.released_by?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released by</span>
              <span className="font-semibold">{result.released_by.name}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lab-result-modal.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "components/consultation/LabResultModal.tsx" "__tests__/lab-result-modal.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "components/consultation/LabResultModal.tsx" "__tests__/lab-result-modal.test.tsx"
git commit -m "feat(consultation): add lab result modal"
```

---

### Task 5: `LabResultBusProvider` + `useLabResultBus`

**Files:**
- Create: `store/LabResultBus.tsx`
- Test: `__tests__/lab-result-bus.test.tsx`

**Interfaces:**
- Consumes:
  - `useRealtime()` from `@/store/RealtimeContext` (Task 3) — `{ subscribe }`.
  - `useAuth()` from `@/store/RoleContext` — `{ token: string | null }`.
  - `useToast()` from `@/components/ui/Toast` — `{ info: (msg: string) => void }`.
  - `api.get(endpoint, token)` from `@/lib/api`.
  - `LabResultEvent` (Task 2), `LabResult` from `@/types/lab`, `LabResultModal` (Task 4).
- Produces:
  ```ts
  export function LabResultBusProvider({ children }: { children: React.ReactNode }): JSX.Element;
  export function useLabResultBus(): {
    inbox: LabResult[];
    dismiss: (id: number) => void;
    openResult: (id: number) => void;
    activeResult: LabResult | null;
    clearActive: () => void;
  };
  ```
  Behavior: subscribes to `clinops_lab_results`; on event, if `lab_result_id` not
  already in the inbox, fetches `GET /lab-results/{id}`, maps WS payload into a
  fallback `LabResult` if the fetch fails, prepends to a cap-20 inbox, and fires
  `toast.info("Lab result received: {test_name}")`. `openResult(id)` sets the
  matching inbox item as `activeResult`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lab-result-bus.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RealtimeProvider } from "../store/RealtimeContext";
import { ToastProvider } from "../components/ui/Toast";
import { LabResultBusProvider, useLabResultBus } from "../store/LabResultBus";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { get: apiMock.get } }));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

import { routeMessage, closeRealtime } from "../lib/realtime";

function Harness() {
  const bus = useLabResultBus();
  return (
    <div>
      <span data-testid="inbox-count">{bus.inbox.length}</span>
      {bus.inbox.map((r) => (
        <button key={r.id} onClick={() => bus.openResult(r.id)}>
          open-{r.lab_request?.test_name ?? r.id}
        </button>
      ))}
      {bus.activeResult && <span data-testid="active">{bus.activeResult.lab_request?.test_name}</span>}
    </div>
  );
}

const fullResult = {
  id: 10,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: true,
  status: "released",
  released_at: "2026-08-06T08:38:21.000000Z",
  released_by: { id: 3, name: "Dr. Owen Banda" },
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", status: "Completed" },
};

function event(labResultId: number) {
  return JSON.stringify({
    channel: "clinops_lab_results",
    data: {
      event: "lab_result_ready",
      lab_result_id: labResultId,
      lab_request_id: 5,
      encounter_id: 2,
      patient_id: 9,
      result_value: "13.5",
      unit: "g/dL",
      is_critical: true,
      is_abnormal: false,
      status: "released",
      color: "red",
      priority: "critical",
      occurred_at: "2026-08-07T08:00:00.000000Z",
    },
  });
}

function setup() {
  return render(
    <ToastProvider>
      <RealtimeProvider>
        <LabResultBusProvider>
          <Harness />
        </LabResultBusProvider>
      </RealtimeProvider>
    </ToastProvider>
  );
}

describe("LabResultBusProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeRealtime();
    apiMock.get.mockResolvedValue({ data: fullResult });
  });

  it("adds an event to the inbox and fetches full detail", async () => {
    setup();
    await act(async () => {
      routeMessage(event(10));
    });
    expect(apiMock.get).toHaveBeenCalledWith("/lab-results/10", "test-token");
    expect(screen.getByTestId("inbox-count").textContent).toBe("1");
  });

  it("de-duplicates events with the same lab_result_id", async () => {
    setup();
    await act(async () => {
      routeMessage(event(10));
    });
    await act(async () => {
      routeMessage(event(10));
    });
    expect(screen.getByTestId("inbox-count").textContent).toBe("1");
  });

  it("openResult sets the active result for the modal", async () => {
    setup();
    await act(async () => {
      routeMessage(event(10));
    });
    fireEvent.click(screen.getByRole("button", { name: /open-CBC/ }));
    expect(screen.getByTestId("active").textContent).toBe("CBC");
  });

  it("falls back to the WS payload when the detail fetch fails", async () => {
    apiMock.get.mockRejectedValue(new Error("nope"));
    setup();
    await act(async () => {
      routeMessage(event(10));
    });
    expect(screen.getByTestId("inbox-count").textContent).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: /open-10/ }));
    expect(screen.getByTestId("active").textContent).toBe("10");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lab-result-bus.test.tsx`
Expected: FAIL — cannot find module `../store/LabResultBus`.

- [ ] **Step 3: Implement**

Create `store/LabResultBus.tsx`:

```tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { useRealtime } from "@/store/RealtimeContext";
import { useToast } from "@/components/ui/Toast";
import LabResultModal from "@/components/consultation/LabResultModal";
import { api } from "@/lib/api";
import type { LabResult, LabResultEvent } from "@/types/lab";

const MAX_INBOX = 20;

interface LabResultBusValue {
  inbox: LabResult[];
  dismiss: (id: number) => void;
  openResult: (id: number) => void;
  activeResult: LabResult | null;
  clearActive: () => void;
}

const LabResultBusContext = createContext<LabResultBusValue | undefined>(undefined);

function fallbackResult(ev: LabResultEvent): LabResult {
  return {
    id: ev.lab_result_id,
    lab_request_id: ev.lab_request_id,
    result_value_numeric: null,
    result_value_text: ev.result_value,
    unit: ev.unit,
    reference_range: null,
    is_abnormal: ev.is_abnormal,
    is_critical: ev.is_critical,
    status: ev.status,
    released_at: ev.occurred_at,
    released_by: null,
  };
}

export function LabResultBusProvider({ children }: { children: React.ReactNode }) {
  const { subscribe } = useRealtime();
  const { token } = useAuth();
  const toast = useToast();
  const [inbox, setInbox] = useState<LabResult[]>([]);
  const [activeResult, setActiveResult] = useState<LabResult | null>(null);

  useEffect(() => {
    const off = subscribe("clinops_lab_results", async (raw: unknown) => {
      const ev = raw as LabResultEvent;
      if (!ev || typeof ev.lab_result_id !== "number") return;
      if (inboxRef.current.some((r) => r.id === ev.lab_result_id)) return;

      let result: LabResult;
      try {
        const res = await api.get(`/lab-results/${ev.lab_result_id}`, token);
        result = res?.data ?? fallbackResult(ev);
      } catch {
        result = fallbackResult(ev);
      }

      setInbox((prev) => [result, ...prev].slice(0, MAX_INBOX));
      toast.info(`Lab result received: ${result.lab_request?.test_name ?? `#${result.id}`}`);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token]);

  const inboxRef = React.useRef(inbox);
  inboxRef.current = inbox;

  const value = useMemo<LabResultBusValue>(
    () => ({
      inbox,
      dismiss: (id) => setInbox((prev) => prev.filter((r) => r.id !== id)),
      openResult: (id) => {
        const found = inboxRef.current.find((r) => r.id === id);
        if (found) setActiveResult(found);
      },
      activeResult,
      clearActive: () => setActiveResult(null),
    }),
    [inbox, activeResult]
  );

  return (
    <LabResultBusContext.Provider value={value}>
      {children}
      {activeResult && <LabResultModal result={activeResult} onClose={() => setActiveResult(null)} />}
    </LabResultBusContext.Provider>
  );
}

export function useLabResultBus() {
  const context = useContext(LabResultBusContext);
  if (!context) throw new Error("useLabResultBus must be used within a LabResultBusProvider");
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lab-result-bus.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "store/LabResultBus.tsx" "__tests__/lab-result-bus.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "store/LabResultBus.tsx" "__tests__/lab-result-bus.test.tsx"
git commit -m "feat(realtime): add global lab result bus with inbox, toast, and modal"
```

---

### Task 6: Mount providers in the app layout

**Files:**
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `RealtimeProvider` (Task 3), `LabResultBusProvider` (Task 5).
- Produces: providers available to every authenticated page.

- [ ] **Step 1: Update imports**

In `app/(app)/layout.tsx`, add after the existing `useAuth` import:

```tsx
import { RealtimeProvider } from "../../store/RealtimeContext";
import { LabResultBusProvider } from "../../store/LabResultBus";
```

- [ ] **Step 2: Wrap the layout content**

In the `return (...)` of `AppLayout`, inside `<ToastProvider>`, wrap the existing
`<SidebarProvider>` … block so it reads:

```tsx
    <ToastProvider>
      <RealtimeProvider>
        <LabResultBusProvider>
          <SidebarProvider>
            <AppSidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <Topbar />
              <main
                id="main-content"
                tabIndex={-1}
                className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-white text-clinical-text focus:outline-none"
              >
                {children}
              </main>
            </div>
          </SidebarProvider>
        </LabResultBusProvider>
      </RealtimeProvider>
    </ToastProvider>
```

(Keep the `isLoading`/`!isAuthenticated` early returns unchanged.)

- [ ] **Step 3: Typecheck + build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Lint**

Run: `npx eslint "app/(app)/layout.tsx"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/layout.tsx"
git commit -m "feat(realtime): mount realtime and lab result bus providers"
```

---

### Task 7: `LabResultsPanel` refresh-on-signal prop

**Files:**
- Modify: `components/consultation/LabResultsPanel.tsx`
- Test: `__tests__/lab-results-panel.test.tsx`

**Interfaces:**
- Consumes: existing `useLabResults` (returns `{ results, loading, error, refetch }`).
- Produces:
  ```ts
  export default function LabResultsPanel(props: {
    encounterId: number | null;
    token: string | null;
    pendingCount: number;
    refreshSignal?: number; // new: triggers a refetch when it changes
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

Append to `__tests__/lab-results-panel.test.tsx` inside the existing `describe("LabResultsPanel")`:

```tsx
  it("refetches when refreshSignal changes", () => {
    const { rerender } = render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} refreshSignal={1} />);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    rerender(<LabResultsPanel encounterId={2} token="t" pendingCount={0} refreshSignal={2} />);
    expect(mocks.refetch).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lab-results-panel.test.tsx`
Expected: the new test FAILS (refetch called 0 times after mount).

- [ ] **Step 3: Implement**

In `components/consultation/LabResultsPanel.tsx`:

1. Change the props interface to add `refreshSignal?: number;` and destructure it:

```tsx
export default function LabResultsPanel({ encounterId, token, pendingCount, refreshSignal }: LabResultsPanelProps) {
```

2. Add after the `const { results, loading, error, refetch } = useLabResults(...)` line:

```tsx
  useEffect(() => {
    if (refreshSignal) void refetch(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refreshSignal, refetch]);
```

3. Add the import if not present: `import { useEffect } from "react";` (add to the existing React import).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lab-results-panel.test.tsx`
Expected: 8 tests PASS (7 existing + 1 new).

- [ ] **Step 5: Lint**

Run: `npx eslint "components/consultation/LabResultsPanel.tsx" "__tests__/lab-results-panel.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "components/consultation/LabResultsPanel.tsx" "__tests__/lab-results-panel.test.tsx"
git commit -m "feat(consultation): refetch lab results panel on realtime signal"
```

---

### Task 8: Consultation page — live refresh + View Result

**Files:**
- Modify: `app/(app)/patients/[id]/consultation/page.tsx`

**Interfaces:**
- Consumes:
  - `useRealtime()` from `@/store/RealtimeContext` — `{ subscribe }` (Task 3).
  - `useLabResultBus()` from `@/store/LabResultBus` — `{ openResult }` (Task 5).
  - `LabResultsPanel` (Task 7) — new `refreshSignal` prop.
  - `LabResult` from `@/types/lab` (existing).
- Produces: Orders tab rows with a "View Result" button; lists refresh on live arrivals.

- [ ] **Step 1: Add imports**

In `app/(app)/patients/[id]/consultation/page.tsx`, add to the existing imports:

```tsx
import { useRealtime } from "@/store/RealtimeContext";
import { useLabResultBus } from "@/store/LabResultBus";
import type { LabResult } from "@/types/lab";
```

- [ ] **Step 2: Extend the `Order` interface**

Add after the `ordered_at: string;` line inside `interface Order { … }`:

```ts
  lab_requests?: {
    id: number;
    test_name: string;
    status: string;
    results: LabResult[];
  }[];
```

- [ ] **Step 3: Add hooks + subscription + refresh key**

Inside the component, after the existing `const { token } = useAuth();` line add:

```tsx
  const { subscribe } = useRealtime();
  const { openResult } = useLabResultBus();
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0);
```

Add a new effect (after the `useEffect(() => { if (token && patientId) fetchConsultationData(); …` effect):

```tsx
  useEffect(() => {
    if (!token) return;
    const off = subscribe("clinops_lab_results", (raw: unknown) => {
      const ev = raw as { encounter_id?: number; lab_result_id?: number };
      if (typeof ev?.lab_result_id !== "number") return;
      if (ev.encounter_id !== undefined && ev.encounter_id !== summary?.encounter?.id) return;
      setResultsRefreshKey((k) => k + 1);
      void fetchConsultationData();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token, summary?.encounter?.id]);
```

Note: `fetchConsultationData` is defined before this effect in the file, so the
reference is stable enough for the eslint-disable. If `encounter_id` is missing in
a payload, fall back to matching `data.patient_id === Number(patientId)` by adding
`else if (ev.patient_id !== undefined && ev.patient_id !== Number(patientId)) return;`.

- [ ] **Step 4: Pass the refresh signal to the Results panel**

In the `{activeSubTab === "results" && (…)}` block, add the prop:

```tsx
                    refreshSignal={resultsRefreshKey}
```

- [ ] **Step 5: Add the View Result button to order rows**

In the `{activeSubTab === "orders" && (…)}` block, inside the `orders.map((order) => (…))`
row, replace the trailing `<StatusBadge … />` with a flex container that keeps the
badge and adds a button when a released result exists:

```tsx
                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge
                                label={order.status}
                                variant={order.status?.toLowerCase() === "completed" ? "success" : "warning"}
                                size="sm"
                              />
                              {order.lab_requests?.some((lr) => lr.results?.length) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const result = order.lab_requests?.flatMap((lr) => lr.results ?? [])[0];
                                    if (result) openResult(result.id);
                                  }}
                                >
                                  View Result
                                </Button>
                              )}
                            </div>
```

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 7: Lint**

Run: `npx eslint "app/(app)/patients/[id]/consultation/page.tsx"`
Expected: no errors.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/patients/[id]/consultation/page.tsx"
git commit -m "feat(consultation): live lab result refresh and View Result modal from Orders tab"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Full lint**

Run: `npm run lint`
Expected: no errors across the project.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Manual end-to-end check**

With the backend, bridge (`node WebSocketBridge/server.js` in
`ClinOps-EMR-System-backend`), and frontend all running:

1. Open a patient consultation in the frontend; place a lab order from the Orders tab.
2. From the lab worklist (`/lab`), enter → verify → release a result for that order.
3. In the consultation page, confirm the Orders tab shows **View Result** on the
   order and the toast "Lab result received: …" appears; open the modal and confirm
   value/unit/range/badges render.
4. Stop the bridge and confirm the app still works (lists refresh manually); restart
   the bridge and confirm the connection re-establishes and new arrivals are picked up.

- [ ] **Step 5: Confirm working tree contains only intended files**

Run: `git status --short`
Expected: no unexpected modified files. `next-env.d.ts` and any pre-existing scratch
files may remain as-is (untouched by this plan).

---

## Plan Self-Review

- **Spec coverage:** `getWsUrl` (Task 1), singleton client + `LabResultEvent` type
  (Task 2), `RealtimeProvider` (Task 3), modal (Task 4), bus with inbox/toast/de-dupe/
  fallback (Task 5), layout mount (Task 6), `LabResultsPanel` refresh signal (Task 7),
  consultation Orders "View Result" + live refresh (Task 8), full verification incl.
  manual E2E (Task 9). Error handling (offline, fetch-fail fallback, de-dupe) and the
  conditional `released_by`/reference-range rendering from the spec are all covered.
- **Placeholder scan:** no TBD/TODO; every code step has concrete code.
- **Type consistency:** `subscribe(channel, handler)` signature matches across Tasks
  2/3/5/8; `useLabResultBus().openResult(id)` (Task 5) is used in Task 8; `LabResult`
  field names used in the modal (Task 4) and bus fallback (Task 5) match `types/lab.ts`;
  `refreshSignal` prop defined in Task 7 is consumed in Task 8.
