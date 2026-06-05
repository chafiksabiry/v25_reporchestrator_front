import type { FC } from 'react';

export interface ImportDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data?: unknown) => void;
}

declare const ImportDialogV2: FC<ImportDialogV2Props>;
export default ImportDialogV2;
