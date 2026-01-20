import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your CMS settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Configure general application settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Site Name
            </label>
            <Input placeholder="My Website" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Site URL
            </label>
            <Input placeholder="https://example.com" type="url" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            API endpoints for your client website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              API Base URL
            </label>
            <Input
              value={process.env.NEXT_PUBLIC_APP_URL || ""}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use this URL to access the API from your client website
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Available Endpoints</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• GET /api/posts - List published posts</li>
              <li>• GET /api/posts/[id] - Get single post</li>
              <li>• GET /api/galleries - List galleries</li>
              <li>• GET /api/galleries/[id] - Get gallery with items</li>
              <li>• GET /api/media/[id] - Get media details</li>
              <li>• POST /api/forms/[formId]/submit - Submit form</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
