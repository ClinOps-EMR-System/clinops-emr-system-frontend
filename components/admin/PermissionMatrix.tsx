"use client";

import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { AdminPermission } from "@/types/admin";

function groupKey(name: string) {
  const i = name.indexOf(".");
  return i === -1 ? "other" : name.slice(0, i);
}

export function PermissionMatrix({
  permissions,
  selected,
  onChange,
  disabled,
}: {
  permissions: AdminPermission[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, AdminPermission[]>();
    for (const p of permissions) {
      const key = groupKey(p.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (name: string) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange([...next].sort());
  };

  const toggleGroup = (names: string[], allOn: boolean) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    names.forEach((n) => (allOn ? next.delete(n) : next.add(n)));
    onChange([...next].sort());
  };

  return (
    <div className="space-y-4">
      {groups.map(([group, perms]) => {
        const names = perms.map((p) => p.name);
        const allOn = names.every((n) => selectedSet.has(n));
        return (
          <section
            key={group}
            className="rounded-lg border border-[var(--outline)] bg-white"
          >
            <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-2">
              <h3 className="text-sm font-semibold capitalize">{group}</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => toggleGroup(names, allOn)}
              >
                {allOn ? "Clear group" : "Select group"}
              </Button>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {perms.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-black/[0.03]"
                >
                  <Checkbox
                    checked={selectedSet.has(p.name)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(p.name)}
                  />
                  <span className="font-mono text-xs">{p.name}</span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
