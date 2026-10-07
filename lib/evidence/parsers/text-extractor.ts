// lib/evidence/parsers/text-extractor.ts
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        
        pdfParser.on("pdfParser_dataError", (errData: any) => {
          console.error("pdf2json error:", errData.parserError);
          reject(new Error(errData.parserError));
        });

        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });

        pdfParser.parseBuffer(buffer);
      });
    } 
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error: any) {
    console.error("Text extraction failed:", error);
    throw new Error("Failed to extract text from file.");
  }
}
