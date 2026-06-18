"use client"

interface PdfVisualViewerProps {
  fileUrl: string | null
}

export function PdfVisualViewer({ fileUrl }: PdfVisualViewerProps) {
  if (!fileUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
        No remote file URL associated with this record.
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/10 p-2">
      {/* Native Browser PDF Core Sandbox */}
      <iframe
        src={`${fileUrl}#toolbar=1&navpanes=0`}
        className="h-[600px] w-full rounded-lg bg-background shadow-xs"
        title="PDF Document Viewer"
      />
    </div>
  )
}

// import { useState } from "react"
// import { Document, Page, pdfjs } from "react-pdf"
// import { Button } from "@/components/ui/button"
// import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

// // Point the worker to the exact version matching your package bundle
// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`

// interface PdfVisualViewerProps {
//   fileUrl: string | null
// }

// export function PdfVisualViewer({ fileUrl }: PdfVisualViewerProps) {
//   const [numPages, setNumPages] = useState<number | null>(null)
//   const [pageNumber, setPageNumber] = useState<number>(1)

//   function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
//     setNumPages(numPages)
//     setPageNumber(1)
//   }

//   if (!fileUrl) {
//     return (
//       <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
//         No remote file URL associated with this record.
//       </div>
//     )
//   }

//   return (
//     <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/10 p-4">
//       {/* Document Canvas Container */}
//       <div className="max-h-[500px] w-full overflow-y-auto rounded-lg border bg-background p-2 shadow-inner flex justify-center">
//         <Document
//           file={fileUrl}
//           onLoadSuccess={onDocumentLoadSuccess}
//           loading={
//             <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
//               <Loader2 className="size-4 animate-spin text-primary" /> Rendering canvas map...
//             </div>
//           }
//         >
//           <Page 
//             pageNumber={pageNumber} 
//             renderTextLayer={false} // Disables text selection highlights if not needed
//             renderAnnotationLayer={false} // Disables interactive form fields/links
//             width={400} // Set a strict width scale or use responsive resize observers
//           />
//         </Document>
//       </div>

//       {/* Pagination Controls Footer */}
//       {numPages && numPages > 1 && (
//         <div className="flex items-center gap-4 border-t pt-2 w-full justify-center">
//           <Button
//             variant="outline"
//             size="icon"
//             disabled={pageNumber <= 1}
//             onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
//             className="size-8"
//           >
//             <ChevronLeft className="size-4" />
//           </Button>
//           <p className="text-xs font-mono">
//             Page {pageNumber} of {numPages}
//           </p>
//           <Button
//             variant="outline"
//             size="icon"
//             disabled={pageNumber >= numPages}
//             onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages))}
//             className="size-8"
//           >
//             <ChevronRight className="size-4" />
//           </Button>
//         </div>
//       )}
//     </div>
//   )
// }