"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  ImagePlus,
  Code,
  FileText,
} from "lucide-react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { GalleryPickerModal } from "./GalleryPickerModal";

interface RichTextEditorProps {
  content?: Record<string, unknown> | null;
  onChange?: (content: Record<string, unknown>) => void;
  placeholder?: string;
}

const BLOCK_OPTIONS = [
  { value: "paragraph", label: "Paragraph" },
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
  { value: "4", label: "Heading 4" },
  { value: "5", label: "Heading 5" },
  { value: "6", label: "Heading 6" },
] as const;

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const [, setTick] = useState(0);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenInNewTab, setLinkOpenInNewTab] = useState(false);
  const [linkSelection, setLinkSelection] = useState<{ from: number; to: number } | null>(null);
  const [codeView, setCodeView] = useState(false);
  const [codeViewHtml, setCodeViewHtml] = useState("");
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl dark:prose-invert mx-auto focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  const forceToolbarUpdate = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const onSelectionUpdate = () => forceToolbarUpdate();
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, forceToolbarUpdate]);

  const blockValue = (() => {
    if (!editor) return "paragraph";
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive("heading", { level })) return String(level);
    }
    return "paragraph";
  })();

  const setBlock = (value: string) => {
    if (!editor) return;
    editor.chain().focus().run();
    if (value === "paragraph") {
      editor.commands.setParagraph();
    } else {
      const level = parseInt(value, 10) as 1 | 2 | 3 | 4 | 5 | 6;
      if (level >= 1 && level <= 6) editor.commands.toggleHeading({ level });
    }
    forceToolbarUpdate();
  };

  const openLinkModal = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const attrs = editor.getAttributes("link");
    setLinkSelection({ from, to });
    setLinkUrl(attrs.href || "");
    setLinkOpenInNewTab(attrs.target === "_blank");
    setLinkModalOpen(true);
  };

  const applyLink = () => {
    if (!editor || !linkSelection) return;
    const href = linkUrl.trim();
    editor.chain().focus().setTextSelection(linkSelection).run();
    if (!href) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({
          href: href.startsWith("http") ? href : `https://${href}`,
          target: linkOpenInNewTab ? "_blank" : undefined,
        })
        .run();
    }
    setLinkModalOpen(false);
    setLinkSelection(null);
    setLinkUrl("");
    setLinkOpenInNewTab(false);
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setLinkSelection(null);
    setLinkUrl("");
    setLinkOpenInNewTab(false);
  };

  const handleGallerySelect = (shortcode: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(`<p>${shortcode}</p>`).run();
    forceToolbarUpdate();
  };

  const switchToCodeView = () => {
    if (!editor) return;
    setCodeViewHtml(editor.getHTML());
    setCodeView(true);
  };

  const switchToVisualView = () => {
    if (!editor) return;
    try {
      editor.commands.setContent(codeViewHtml.trim() || "<p></p>", true, undefined, {
        errorOnInvalidContent: true,
      });
      setCodeView(false);
      forceToolbarUpdate();
    } catch {
      alert("Invalid HTML. Fix errors and try again.");
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b">
        {!codeView && (
          <>
            <span className="text-sm text-muted-foreground px-1" title="WYSIWYG visual editor">
              Visual
            </span>
            <div className="w-px h-6 bg-border mx-1" />
            <Select value={blockValue} onValueChange={setBlock}>
              <SelectTrigger className="w-[140px] h-9" aria-label="Block format">
                <SelectValue placeholder="Paragraph" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant={editor.isActive("bold") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBold().run();
                forceToolbarUpdate();
              }}
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive("italic") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleItalic().run();
                forceToolbarUpdate();
              }}
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant={editor.isActive("bulletList") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBulletList().run();
                forceToolbarUpdate();
              }}
              aria-label="Bullet list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive("orderedList") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleOrderedList().run();
                forceToolbarUpdate();
              }}
              aria-label="Numbered list"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive("blockquote") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().toggleBlockquote().run();
                forceToolbarUpdate();
              }}
              aria-label="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("left").run();
                forceToolbarUpdate();
              }}
              aria-label="Align left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("center").run();
                forceToolbarUpdate();
              }}
              aria-label="Align center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("right").run();
                forceToolbarUpdate();
              }}
              aria-label="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive({ textAlign: "justify" }) ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setTextAlign("justify").run();
                forceToolbarUpdate();
              }}
              aria-label="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant={editor.isActive("link") ? "default" : "ghost"}
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                openLinkModal();
              }}
              aria-label="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                const url = window.prompt("Enter image URL:");
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }}
              aria-label="Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                setGalleryPickerOpen(true);
              }}
              aria-label="Insert gallery"
              title="Insert gallery"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={switchToCodeView}
              aria-label="HTML view"
              title="HTML view"
            >
              <Code className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </>
        )}
        {codeView && (
          <>
            <span className="text-sm text-muted-foreground px-1">HTML</span>
            <div className="flex-1" />
            <Button
              type="button"
              variant="default"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault();
                switchToVisualView();
              }}
              aria-label="Visual view"
              title="Apply HTML and switch to visual"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Visual
            </Button>
          </>
        )}
      </div>
      {codeView ? (
        <textarea
          value={codeViewHtml}
          onChange={(e) => setCodeViewHtml(e.target.value)}
          className="w-full min-h-[300px] p-4 font-mono text-sm border-0 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset bg-muted/30 resize-y"
          placeholder="Edit HTML…"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      <Dialog open={linkModalOpen} onOpenChange={(open) => !open && closeLinkModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to remove the link from selected text.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="link-new-tab"
                checked={linkOpenInNewTab}
                onCheckedChange={(v) => setLinkOpenInNewTab(!!v)}
              />
              <Label htmlFor="link-new-tab" className="text-sm font-normal cursor-pointer">
                Open in new tab
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeLinkModal}>
              Cancel
            </Button>
            <Button onClick={applyLink}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GalleryPickerModal
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
