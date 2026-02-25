"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock } from "lucide-react";
import type { PhpAuthFeatureOrPermissionTreeNode } from "@/lib/php-auth/fetch-roles";

export interface RoleDetailData {
  id?: string;
  name?: string;
  slug: string;
  label: string;
  featuresTree: PhpAuthFeatureOrPermissionTreeNode[];
  permissionsTree: PhpAuthFeatureOrPermissionTreeNode[];
}

function countTreeNodes(nodes: PhpAuthFeatureOrPermissionTreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1 + countTreeNodes(node.children);
  }
  return n;
}

function roleTreeItemClass(depth: number): string {
  if (depth === 0) return "text-base font-bold";
  if (depth === 1) return "text-sm text-muted-foreground";
  return "text-xs text-muted-foreground";
}

function RoleTreeList({
  nodes,
  depth = 0,
}: {
  nodes: PhpAuthFeatureOrPermissionTreeNode[];
  depth?: number;
}) {
  return (
    <ul className="list-none p-0 m-0 space-y-1.5">
      {nodes.map((node) => (
        <li key={node.slug} className="flex flex-col gap-0.5">
          <div
            className={roleTreeItemClass(depth)}
            style={{ paddingLeft: depth > 0 ? `${depth * 1.25}rem` : 0 }}
          >
            {node.label || node.slug}
          </div>
          {node.children.length > 0 && (
            <RoleTreeList nodes={node.children} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Read-only role detail: Permissions and Features tabs. No toggles; reference only.
 * Actual role modifications are done only in the PHP-Auth app.
 */
export function RoleDetailView({ role }: { role: RoleDetailData }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold">{role.label}</h2>
              <p className="text-sm text-muted-foreground">{role.slug}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
            <Lock className="h-3.5 w-3.5" />
            This view is for reference only. Role modifications are done in the PHP-Auth app.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="permissions">
            Permissions ({countTreeNodes(role.permissionsTree)})
          </TabsTrigger>
          <TabsTrigger value="features">
            Features ({countTreeNodes(role.featuresTree)})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-sm font-medium">Permissions assigned to this role</h3>
              <p className="text-xs text-muted-foreground">Read-only list from PHP-Auth (tree order).</p>
            </CardHeader>
            <CardContent>
              {role.permissionsTree.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions assigned.</p>
              ) : (
                <RoleTreeList nodes={role.permissionsTree} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="features" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-sm font-medium">Features assigned to this role</h3>
              <p className="text-xs text-muted-foreground">Read-only list from PHP-Auth (tree order).</p>
            </CardHeader>
            <CardContent>
              {role.featuresTree.length === 0 ? (
                <p className="text-sm text-muted-foreground">No features assigned.</p>
              ) : (
                <RoleTreeList nodes={role.featuresTree} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
