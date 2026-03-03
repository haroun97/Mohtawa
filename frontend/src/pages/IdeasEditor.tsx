import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  PanelLeftClose,
  PanelLeft,
  FileText,
  FolderOpen,
  Trash2,
  Loader2,
  Plus,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ideaDocsApi, type IdeaDocListItem, type IdeaDocFull } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const SIDEBAR_WIDTH = 240;
const AUTOSAVE_DEBOUNCE_MS = 500;

export default function IdeasEditor() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<"all" | "trash">("all");
  const [docs, setDocs] = useState<IdeaDocListItem[]>([]);
  const [trashDocs, setTrashDocs] = useState<IdeaDocListItem[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("Untitled");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docTitleRef = useRef(docTitle);
  docTitleRef.current = docTitle;
  const lastSavedTitleRef = useRef(docTitle);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[320px] px-1 py-4",
      },
    },
  });

  const fetchList = useCallback(async () => {
    try {
      const [list, trash] = await Promise.all([
        ideaDocsApi.list(false),
        ideaDocsApi.list(true),
      ]);
      setDocs(list);
      setTrashDocs(trash);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadDoc = useCallback(
    async (id: string) => {
      try {
        const doc = await ideaDocsApi.get(id);
        const title = doc.title ?? "Untitled";
        lastSavedTitleRef.current = title;
        setDocTitle(title);
        editor?.commands.setContent((doc.content as object) ?? { type: "doc", content: [] });
        setCurrentDocId(id);
      } catch {
        toast.error("Failed to load document");
      }
    },
    [editor]
  );

  const handleCreateNew = useCallback(async () => {
    try {
      const doc = await ideaDocsApi.create("Untitled");
      const title = doc.title ?? "Untitled";
      lastSavedTitleRef.current = title;
      setDocs((prev) => [{ id: doc.id, title: doc.title, createdAt: doc.createdAt, updatedAt: doc.updatedAt }, ...prev]);
      setDocTitle(doc.title);
      editor?.commands.setContent((doc.content as object) ?? { type: "doc", content: [{ type: "paragraph" }] });
      setCurrentDocId(doc.id);
      setSidebarView("all");
    } catch {
      toast.error("Failed to create document");
    }
  }, [editor]);

  const handleUpdate = useCallback(() => {
    if (!currentDocId || !editor) return;
    setSaveStatus("saving");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await ideaDocsApi.update(currentDocId, {
          title: docTitleRef.current,
          content: editor.getJSON(),
        });
        setSaveStatus("saved");
        setDocs((prev) =>
          prev.map((d) =>
            d.id === currentDocId
              ? { ...d, title: docTitleRef.current, updatedAt: new Date().toISOString() }
              : d
          )
        );
      } catch {
        toast.error("Failed to save");
        setSaveStatus("idle");
      }
      saveTimeoutRef.current = null;
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [currentDocId, editor]);

  useEffect(() => {
    if (!editor || !currentDocId) return;
    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, handleUpdate, currentDocId]);

  const titleSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentDocId || !editor) return;
    if (docTitle === lastSavedTitleRef.current) return;
    if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
    titleSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await ideaDocsApi.update(currentDocId, { title: docTitle });
        lastSavedTitleRef.current = docTitle;
        setDocs((prev) =>
          prev.map((d) =>
            d.id === currentDocId ? { ...d, title: docTitle, updatedAt: new Date().toISOString() } : d
          )
        );
      } catch {
        /* ignore */
      }
      titleSaveTimeoutRef.current = null;
    }, 600);
    return () => {
      if (titleSaveTimeoutRef.current) clearTimeout(titleSaveTimeoutRef.current);
    };
  }, [docTitle, currentDocId]);

  const handleDelete = useCallback(
    async (id: string, permanent: boolean) => {
      try {
        await ideaDocsApi.delete(id, permanent);
        if (currentDocId === id) setCurrentDocId(null);
        await fetchList();
        toast.success(permanent ? "Document deleted" : "Moved to Trash");
      } catch {
        toast.error("Failed to delete");
      }
    },
    [currentDocId, fetchList]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await ideaDocsApi.restore(id);
        await fetchList();
        toast.success("Restored");
      } catch {
        toast.error("Failed to restore");
      }
    },
    [fetchList]
  );

  const displayList = sidebarView === "trash" ? trashDocs : docs;

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: SIDEBAR_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 border-r border-border/60 bg-card/50 overflow-hidden flex flex-col"
          >
            <div className="w-[240px] py-4 px-3 flex flex-col gap-1 flex-1 min-h-0">
              <div className="flex gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setSidebarView("all")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium flex-1",
                    sidebarView === "all"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  All Docs
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarView("trash")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium flex-1",
                    sidebarView === "trash"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Trash
                </button>
              </div>
              {sidebarView === "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 mb-2"
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4" />
                  New doc
                </Button>
              )}
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {loading ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  displayList.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                        currentDocId === doc.id && sidebarView === "all"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left truncate min-w-0"
                        onClick={() => sidebarView === "all" && loadDoc(doc.id)}
                      >
                        <span className="truncate block">{doc.title || "Untitled"}</span>
                      </button>
                      {sidebarView === "trash" ? (
                        <span className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleRestore(doc.id)}
                            aria-label="Restore"
                          >
                            Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive"
                            onClick={() => handleDelete(doc.id, true)}
                            aria-label="Delete permanently"
                          >
                            Delete
                          </Button>
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                          onClick={() => handleDelete(doc.id, false)}
                          aria-label="Move to Trash"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
                {!loading && displayList.length === 0 && (
                  <p className="px-3 py-2 text-muted-foreground text-sm">
                    {sidebarView === "trash" ? "Trash is empty" : "No documents yet"}
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border/60 bg-card/30 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          <div className="h-12 md:h-14 px-3 md:px-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" asChild>
              <Link to="/">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="border-0 bg-transparent shadow-none text-base font-semibold focus-visible:ring-0 max-w-[280px] md:max-w-sm"
              placeholder="Document title"
              disabled={!currentDocId}
            />
            <div className="ml-auto flex items-center gap-2">
              {saveStatus === "saving" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-muted-foreground">Saved</span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6">
            {currentDocId ? (
              <div className="rounded-lg border border-border/50 bg-card/30 shadow-sm overflow-hidden">
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/50 bg-card/20 flex flex-col items-center justify-center min-h-[320px] gap-4 px-6">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  {docs.length === 0
                    ? "Create your first document to get started."
                    : "Select a document from the sidebar or create a new one."}
                </p>
                {docs.length === 0 && (
                  <Button onClick={handleCreateNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New doc
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
