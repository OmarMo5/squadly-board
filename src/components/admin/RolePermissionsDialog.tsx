import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  allPermissions: Permission[];
  currentPermissions: Permission[];
  onSave: (role: string, permissionIds: string[]) => Promise<void>;
};

export function RolePermissionsDialog({
  open,
  onOpenChange,
  role,
  allPermissions,
  currentPermissions,
  onSave,
}: Props) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize selected permissions when dialog opens
    setSelectedPermissions(new Set(currentPermissions.map((p) => p.id)));
  }, [currentPermissions, open]);

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const handleSelectAll = (category: string) => {
    const categoryPerms = allPermissions.filter((p) => p.category === category);
    const allSelected = categoryPerms.every((p) => selectedPermissions.has(p.id));

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      categoryPerms.forEach((p) => {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(role, Array.from(selectedPermissions));
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Permissions for
            <Badge className="capitalize">{role}</Badge>
          </DialogTitle>
          <DialogDescription>
            Select the permissions this role should have. Changes will affect all users with this role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(permissionsByCategory).map(([category, perms]) => {
            const allSelected = perms.every((p) => selectedPermissions.has(p.id));
            const someSelected = perms.some((p) => selectedPermissions.has(p.id));

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold capitalize text-lg">{category}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(category)}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-border">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={perm.id}
                        checked={selectedPermissions.has(perm.id)}
                        onCheckedChange={() => handleTogglePermission(perm.id)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={perm.id}
                          className="cursor-pointer font-medium"
                        >
                          {perm.description || perm.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {perm.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
