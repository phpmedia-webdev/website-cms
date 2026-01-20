import { MediaUpload } from "@/components/media/MediaUpload";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Media Library</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage images and videos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Media</CardTitle>
          <CardDescription>
            Upload images to your media library. Supported formats: JPEG, PNG, WebP, GIF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaUpload />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">All Media</h2>
        <MediaLibrary />
      </div>
    </div>
  );
}
