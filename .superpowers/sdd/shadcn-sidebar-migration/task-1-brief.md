### Task 1: Update `nav-main.tsx` — active route matching

**Files:**
- Modify: `components/shadcn-space/blocks/sidebar-01/nav-main.tsx`

**Interfaces:**
- Consumes: `NavItem` type (already defined in the same file, unchanged)
- Produces: `<NavMain items={...} />` that highlights items matching current pathname

**Steps:**
1. Add `import { usePathname } from "next/navigation"` at the top of the file
2. Inside `NavMain` component, add `const pathname = usePathname();` and pass it to each `<NavMainItem>`
3. In `NavMainItem`, add pathname-based active detection:
   - For items without children: compare `pathname` with `item.href` (exact match or prefix match with `/`)
   - For items with children: check if any child's href matches pathname and auto-expand the collapsible
4. Run `npx tsc --noEmit` to verify no TypeScript errors
5. Commit with message: `"feat: add active route matching to shadcn-space NavMain"`
