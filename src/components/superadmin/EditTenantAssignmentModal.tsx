"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserMinus } from "lucide-react";
import { legacySlugToPhpAuthSlug } from "@/lib/php-auth/role-mapping";

export interface RoleOption {
  slug: string;
  label: string;
}

export interface EditTenantAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSiteId: string;
  tenantUserId: string;
  siteName: string;
  userDisplayLabel: string;
  initialRole: string;
  initialIsOwner: boolean;
  roles: RoleOption[];
  onSaved: () => void;
  onRemoved: () => void;
}

/**
 * Shared modal to edit a tenant user assignment (role, Owner) or remove from site.
 * Used on Tenant Sites → Related Tenant Users and on Tenant Users list.
 * Superadmin only (API enforces).
 */
export function EditTenantAssignmentModal({
  open,
  onOpenChange,
  tenantSiteId,
  tenantUserId,
  siteName,
  userDisplayLabel,
  initialRole,
  initialIsOwner,
  roles,
  onSaved,
  onRemoved,
}: EditTenantAssignmentModalProps) {
  const resolveInitialRole = () => {
    const legacyMapped = legacySlugToPhpAuthSlug(initialRole);
    const valid = roles.find((r) => r.slug === initialRole || r.slug === legacyMapped);
    return valid?.slug ?? roles[0]?.slug ?? "";
  };
  const [role, setRole] = useState(resolveInitialRole);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRole(resolveInitialRole());
      setIsOwner(initialIsOwner);
      setError(null);
    }
  }, [open, initialRole, initialIsOwner, roles]);

  const resetForm = () => {
    setRole(resolveInitialRole());
    setIsOwner(initialIsOwner);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${tenantSiteId}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: tenantUserId,
          role_slug: role,
          is_owner: isOwner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update assignment");
        return;
      }
      onSaved();
      handleOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove ${userDisplayLabel} from ${siteName}? They will lose access to this site.`)) return;
    setError(null);
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/tenant-sites/${tenantSiteId}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: tenantUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to remove from site");
        return;
      }
      onRemoved();
      handleOpenChange(false);
    } finally {
      setRemoving(false);
    }
  };

  const roleOptions = roles;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit assignment</DialogTitle>
          <DialogDescription>
            User and site are fixed. Change role or Owner status, or remove this user from the site.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="text-sm">
            <span className="text-muted-foreground">User: </span>
            <span className="font-medium">{userDisplayLabel}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Site: </span>
            <span className="font-medium">{siteName}</span>
          </div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.length === 0 ? (
                  <SelectItem value="_none" disabled>No roles from PHP-Auth</SelectItem>
                ) : (
                  roleOptions.map((r) => (
                    <SelectItem key={r.slug} value={r.slug}>
                      {r.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isOwner}
              onChange={(e) => setIsOwner(e.target.checked)}
              className="rounded border-input"
            />
            Owner (can remove other admins; only superadmin can set)
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRemove}
            disabled={saving || removing}
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Remove from site
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving || removing}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || removing || roleOptions.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
