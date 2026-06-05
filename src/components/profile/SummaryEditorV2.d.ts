import type { FC, Dispatch, SetStateAction } from 'react';

export interface SummaryEditorV2Props {
  profileData: Record<string, unknown> | null;
  generatedSummary: string;
  setGeneratedSummary: Dispatch<SetStateAction<string>>;
  onProfileUpdate: (data: Record<string, unknown> & { generatedSummary?: string }) => void;
}

declare const SummaryEditorV2: FC<SummaryEditorV2Props>;
export default SummaryEditorV2;
