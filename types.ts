
export type ViewState = 'onboarding' | 'home' | 'chat' | 'police' | 'documents' | 'profile' | 'call';

export type UserMode = 'cruise' | 'serious';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isRedFlag?: boolean;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  prompt: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  fields: string[];
}

export interface SavedRight {
  id: string;
  title: string;
  content: string;
}
