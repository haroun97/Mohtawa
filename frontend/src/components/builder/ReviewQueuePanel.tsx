import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, runsApi, type ReviewQueueItem, type ReviewQueueResponse } from "@/lib/api";
import { parseS3KeyFromUrl } from "@/lib/audioPlayback";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Film, Loader2, AlertCircle, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "needs_review" | "approved" | "rendered" | "skipped" | "failed";

const STATUS_LABELS: Record<ReviewQueueItem["status"], string> = {
  needs_review: "Needs review",
  approved: "Approved",
  skipped: "Skipped",
  rendered: "Rendered",
  failed: "Failed",
};

const STATUS_VARIANTS: Record<ReviewQueueItem["status"], "default" | "secondary" | "destructive" | "outline"> = {
  needs_review: "secondary",
  approved: "default",
  skipped: "outline",
  rendered: "default",
  failed: "destructive",
};

interface ReviewQueuePanelProps {
  runId: string | null;
  workflowName?: string;
  /** Open EDL editor for a given project (per-iteration). Used by Queue row "Edit". */
  onOpenEdlEditor?: (projectId: string) => void;
}

function filterItems(items: ReviewQueueItem[], filter: FilterTab, search: string): ReviewQueueItem[] {
  let list = items;
  if (filter !== "all") {
    list = items.filter((i) => i.status === filter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter((i) => i.title.toLowerCase().includes(q));
  }
  return list;
}

export function ReviewQueuePanel({ runId, workflowName, onOpenEdlEditor }: ReviewQueuePanelProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["review-queue", runId],
    queryFn: () => runsApi.getReviewQueue(runId!),
    enabled: !!runId,
  });

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return filterItems(data.items, filter, search);
  }, [data?.items, filter, search]);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground min-h-[200px]">
        <Film className="h-10 w-10 opacity-50" />
        <p>Run the workflow to see the review queue.</p>
        <p className="text-xs">When a run has iterations waiting for review, they will appear here.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-destructive min-h-[200px]">
        <AlertCircle className="h-10 w-10" />
        <p>Failed to load review queue.</p>
      </div>
    );
  }

  const queue = data as ReviewQueueResponse;
  const { totalItems, items, counts } = queue;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold truncate" title={workflowName}>
            {workflowName ?? "Review queue"}
          </h3>
          <span className="text-xs text-muted-foreground shrink-0">{totalItems} items</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {counts.needsReview > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              Needs review: {counts.needsReview}
            </Badge>
          )}
          {counts.approved > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Approved: {counts.approved}
            </Badge>
          )}
          {counts.rendered > 0 && (
            <Badge variant="default" className="text-[10px]">
              Rendered: {counts.rendered}
            </Badge>
          )}
          {counts.skipped > 0 && (
            <Badge variant="outline" className="text-[10px]">
              Skipped: {counts.skipped}
            </Badge>
          )}
          {counts.failed > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              Failed: {counts.failed}
            </Badge>
          )}
        </div>
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start shrink-0 rounded-none border-b bg-transparent p-0 h-9 gap-0">
          <TabsTrigger value="all" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            All
          </TabsTrigger>
          <TabsTrigger value="needs_review" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Needs review
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rendered" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Rendered
          </TabsTrigger>
          <TabsTrigger value="skipped" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Skipped
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">
            Failed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="flex-1 mt-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <ul className="p-2 space-y-1.5">
              {filteredItems.length === 0 ? (
                <li className="py-8 text-center text-xs text-muted-foreground">
                  {items.length === 0 ? "No iterations in this run." : "No items match the current filter."}
                </li>
              ) : (
                filteredItems.map((item) => (
                  <ReviewQueueRow
                    key={item.iterationId}
                    runId={runId}
                    item={item}
                    onOpenEdlEditor={onOpenEdlEditor}
                    onRegenerated={() =>
                      queryClient.invalidateQueries({ queryKey: ["review-queue", runId] })
                    }
                  />
                ))
              )}
            </ul>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Resolve draftVideoUrl to a playable URL (presigned for S3/storage keys). */
function usePlayableDraftUrl(draftVideoUrl: string | null): { playUrl: string | null; loading: boolean } {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!draftVideoUrl) {
      setPlayUrl(null);
      setLoading(false);
      return;
    }
    if (draftVideoUrl.startsWith("http")) {
      setPlayUrl(draftVideoUrl);
      setLoading(false);
      return;
    }
    const key = parseS3KeyFromUrl(draftVideoUrl) ?? (draftVideoUrl.includes("/") ? draftVideoUrl : null);
    if (!key) {
      setPlayUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!cancelled) setPlayUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setPlayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draftVideoUrl]);
  return { playUrl, loading };
}

function ReviewQueueRow({
  runId,
  item,
  onOpenEdlEditor,
  onRegenerated,
}: {
  runId: string;
  item: ReviewQueueItem;
  onOpenEdlEditor?: (projectId: string) => void;
  onRegenerated?: () => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const { playUrl: draftPlayUrl, loading: draftUrlLoading } = usePlayableDraftUrl(item.draftVideoUrl);
  const canEdit = !!item.projectId && item.status !== "failed";
  const isFailed = item.status === "failed";

  const handleRegenerate = async () => {
    if (!runId || !isFailed || regenerating) return;
    setRegenerating(true);
    try {
      await runsApi.regenerateDraft(runId, item.iterationId);
      onRegenerated?.();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <li
      className={cn(
        "flex gap-2 rounded-lg border p-2 bg-card hover:bg-muted/40 transition-colors",
        "min-h-[60px]"
      )}
    >
      {/* Thumbnail: resolve S3/storage URLs to playable so thumbnails load */}
      <div className="shrink-0 w-14 h-14 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {item.draftVideoUrl ? (
          draftUrlLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : draftPlayUrl ? (
            <video
              src={draftPlayUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              playsInline
            />
          ) : (
            <Film className="h-6 w-6 text-muted-foreground" />
          )
        ) : (
          <Film className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <p className="text-xs font-medium truncate" title={item.title}>
          {item.title || `Item ${item.itemIndex + 1}`}
        </p>
        <Badge variant={STATUS_VARIANTS[item.status]} className="w-fit text-[10px]">
          {STATUS_LABELS[item.status]}
        </Badge>
        {isFailed && (item.errorMessage ?? item.failedNodeTitle) && (
          <p
            className="text-[10px] text-destructive line-clamp-2 mt-0.5"
            title={item.errorMessage ?? undefined}
          >
            {item.failedNodeTitle && (
              <span className="font-medium">{item.failedNodeTitle}: </span>
            )}
            {item.errorMessage ?? "Unknown error"}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {isFailed && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={regenerating}
            onClick={handleRegenerate}
            title="Fix the workflow (e.g. add Voice TTS), then retry this item"
          >
            {regenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Regenerate
          </Button>
        )}
        {onOpenEdlEditor && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            disabled={!canEdit}
            onClick={() => canEdit && item.projectId && onOpenEdlEditor(item.projectId)}
            title={canEdit ? `Edit draft for ${item.title}` : "No draft to edit"}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        )}
      </div>
    </li>
  );
}
