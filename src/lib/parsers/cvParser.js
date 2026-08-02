// CV Parser implementation
import { PDFParser } from './pdfParser';
import { DocParser } from './docParser';
import { TextParser } from './textParser';
import { extractBasicInfo } from '../utils/textProcessing';

export class CVParser {
  constructor() {
    this.pdfParser = new PDFParser();
    this.docParser = new DocParser();
    this.textParser = new TextParser();
  }

  async parse(file) {
    const fileType = file.name.split('.').pop().toLowerCase();
    let text = '';

    try {
      switch (fileType) {
        case 'pdf':
          text = await this.pdfParser.extractText(file);
          break;
        case 'doc':
        case 'docx':
          text = await this.docParser.extractText(file);
          break;
        case 'txt':
          text = await this.textParser.extractText(file);
          break;
        default:
          throw new Error('Unsupported file format');
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      // Extract basic information using regex patterns
      const basicInfo = extractBasicInfo(text);
      
      // Append the extracted information to the text for OpenAI processing
      const enhancedText = `
Extracted Information:
Name: ${basicInfo.name}
Email: ${basicInfo.email}
Languages: ${basicInfo.languages.join(', ')}
Certifications: ${basicInfo.certifications.join(', ')}
Skills: ${basicInfo.skills.join(', ')}

Original Text:
${text}
      `.trim();

      return enhancedText;
    } catch (error) {
      throw new Error(`Failed to parse CV: ${error.message}`);
    }
  }
}