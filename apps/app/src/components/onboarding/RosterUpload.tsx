import { useRef, useState } from "react";
import { FileSpreadsheet, Info, UploadCloud, X } from "lucide-react";
import { EASE, gsap, motionSafe, useGSAP } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = [".xlsx", ".xls", ".csv"];
const MAX_BYTES = 5 * 1024 * 1024;

function formatSize(bytes: number) {
  const kb = bytes / 1024;
  // A small file rounding to "0 KB" reads as an empty one, so the floor is 1.
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Step 4's drop zone.
 *
 * The file is held in the wizard's state and nothing is sent anywhere — the
 * sheet reader is not built yet. That is said on screen rather than implied,
 * because a teacher who believes their class list was imported and finds an
 * empty roster tomorrow has been misled by this screen.
 *
 * The step is here regardless so the shape of it is settled: when the parser
 * lands, this component gains an upload call and the copy changes, and nothing
 * else in the wizard moves.
 */
export function RosterUpload({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGSAP(
    () => {
      if (!file) return;

      motionSafe(() => {
        gsap.from(".roster-chip", {
          autoAlpha: 0,
          y: 10,
          scale: 0.96,
          duration: 0.45,
          ease: EASE.spring,
        });
      });
    },
    { scope, dependencies: [file] },
  );

  function accept(picked: File | undefined) {
    if (!picked) return;

    const name = picked.name.toLowerCase();
    if (!ACCEPTED.some((ext) => name.endsWith(ext))) {
      setError("That is not a spreadsheet. Use an .xlsx, .xls or .csv file.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(`That file is ${formatSize(picked.size)}. The limit is 5 MB.`);
      return;
    }

    setError(null);
    onChange(picked);
  }

  function clear() {
    setError(null);
    onChange(null);
    // The input keeps the old path otherwise, so re-picking the same file
    // fires no change event and the zone looks stuck.
    if (input.current) input.current.value = "";
  }

  return (
    <div ref={scope} className="space-y-4">
      <div data-step-item>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            accept(e.dataTransfer.files[0]);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            dragging ? "border-primary bg-accent/50" : "border-border bg-muted/30",
            error && "border-destructive/50",
          )}
        >
          <span
            className={cn(
              "mx-auto grid size-12 place-items-center rounded-full transition-colors",
              dragging ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
            )}
          >
            <UploadCloud className="size-6" />
          </span>

          <p className="mt-4 text-sm font-medium">Drop your class list here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Excel or CSV, up to 5&nbsp;MB
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => input.current?.click()}
          >
            Choose a file
          </Button>

          <input
            ref={input}
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            aria-label="Class list spreadsheet"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {file && (
        <div
          data-step-item
          className="roster-chip flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-success/10 text-success">
            <FileSpreadsheet className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{file.name}</span>
            <span className="block text-xs text-muted-foreground">
              {formatSize(file.size)}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            aria-label={`Remove ${file.name}`}
          >
            <X />
          </Button>
        </div>
      )}

      <p
        data-step-item
        className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"
      >
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          Reading names out of the sheet is not switched on yet, so nothing is
          uploaded and your file stays on this device. You can add learners by
          hand in the meantime — this step is safe to skip.
        </span>
      </p>
    </div>
  );
}
