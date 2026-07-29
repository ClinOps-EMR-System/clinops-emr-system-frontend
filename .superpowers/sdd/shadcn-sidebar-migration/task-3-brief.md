### Task 3: Update `Topbar.tsx` — use SidebarTrigger

**Files:**
- Modify: `components/layout/Topbar.tsx`

**Changes needed:**

1. Remove `Menu` and `X` from the lucide-react import line
2. Add `import { SidebarTrigger } from "@/components/ui/sidebar";`
3. Remove `TopbarProps` interface entirely (change to `export default function Topbar()` with no props)
4. Remove the manual hamburger button and replace it with `<SidebarTrigger />`:
   - Current code (lines 157-163):
     ```tsx
     <button
       onClick={onMenuToggle}
       className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-800/50 transition-colors"
       aria-label={sidebarCollapsed ? "Open navigation menu" : "Close navigation menu"}
     >
       {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
     </button>
     ```
   - Replace with:
     ```tsx
     <SidebarTrigger className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-800/50 transition-colors cursor-pointer" />
     ```
5. Run `npx tsc --noEmit` to verify
6. Commit with message: `"refactor: replace manual toggle with SidebarTrigger in Topbar"`
