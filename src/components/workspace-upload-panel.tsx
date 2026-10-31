
import type { ReactNode } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkspaceUploadPanel({ uploadArea, uploadUnavailable, reviewLaterCount, onUpload, onReviewCalendar, onReviewLater }: { uploadArea: ReactNode; uploadUnavailable: boolean; reviewLaterCount: number; onUpload: () => void; onReviewCalendar: () => void; onReviewLater: () => void }) {
  return <aside className="console-upload-panel app-chrome" aria-label="Upload documents">
    <Button type="button" className="console-upload-toggle w-full" disabled={uploadUnavailable} onClick={onUpload}><CloudUpload aria-hidden="true" className="size-5" />Upload</Button>
    <p className="mt-3 text-sm text-slate-600">Drop any document. The app recognizes it and guides you to the next step.</p>
    <div className="mt-4">{uploadArea}</div>
    <div className="console-upload-review"><Button type="button" size="sm" variant="outline" disabled={uploadUnavailable} onClick={onReviewCalendar}>Review calendar entries</Button><Button type="button" size="sm" variant="outline" disabled={uploadUnavailable} onClick={onReviewLater}>Review later · {reviewLaterCount}</Button></div>
  </aside>;
}
