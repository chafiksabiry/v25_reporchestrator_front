import type { FC } from 'react';

export interface ImportDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Record<string, unknown> & { generatedSummary?: string }) => void;
}

declare const ImportDialogV2: FC<ImportDialogV2Props>;
export default ImportDialogV2;
