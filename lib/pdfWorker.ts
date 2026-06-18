// @ts-ignore - Uses the legacy build safe for Next.js SSR / Node environments
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set up the global worker CDN securely only in the browser
if (typeof window !== "undefined") {
  if (pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs`;
  }
}

export async function extractTextFromPdf(file: File): Promise<string> {
  // Prevent execution on the server completely during prerendering
  if (typeof window === "undefined") return "";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjs as any).getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += `[Page ${i}] ${pageText}\n`;
  }

  return fullText;
}