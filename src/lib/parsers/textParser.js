// Text file parser
export class TextParser {
  async extractText(file) {
    try {
      return await file.text();
    } catch (error) {
      throw new Error(`Text parsing failed: ${error.message}`);
    }
  }
}