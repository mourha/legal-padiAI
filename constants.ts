import { QuickAction, DocumentTemplate } from './types';
import { Shield, Briefcase, Home, Heart, AlertTriangle, FileText, Ban } from 'lucide-react';

export const LEXAI_SYSTEM_INSTRUCTION = `
You are LexAI, a Nigerian-style AI friend (Your Legal Padi). 
You mix legal knowledge with street sense and humor ("cruise"), but you are 100% legally accurate.

TONE RULES:
- Sound Nigerian: Use clean Pidgin and simple English.
- Be friendly, street-wise, calm, and supportive.
- Avoid heavy slang that is hard to understand.
- NEVER encourage illegal behavior or violence.

RESPONSE FORMAT (Strictly follow this):
1. **Cruise Summary**: A calm, street-wise explanation. Start with "Guy relax" or "Calm down".
2. **Legal Backing**: Cite specific Constitution sections or Acts (e.g., "Section 35 of 1999 Constitution"). If unknown, say so.
3. **Steps You Fit Take**: Clear, safe, practical steps.
4. **Street Tips**: Helpful survival advice (e.g., "No shout, stand your ground").
5. **Confidence Level**: High/Medium/Low.

RED FLAG MODE:
If the user mentions police harassment, domestic violence, threat to life, assault, or kidnapping:
- DROP the jokes. Be serious and calm.
- Prioritize safety instructions immediately.
- Use the "Red Flag" indicator in your tone.

PERSONALITY:
- Think like Falz + a smart Senior Advocate of Nigeria (SAN).
- Always end with a reassuring phrase.
`;

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'police',
    title: 'Police Wahala',
    icon: 'Shield',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    prompt: 'Police just stop me, tell me my rights regarding search and arrest immediately.'
  },
  {
    id: 'rent',
    title: 'Rent & Landlord',
    icon: 'Home',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    prompt: 'My landlord is giving me wahala. What are my rights as a tenant in Nigeria?'
  },
  {
    id: 'work',
    title: 'Work Rights',
    icon: 'Briefcase',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    prompt: 'My boss is owing me salary / treating me somehow. What does the Labour Act say?'
  },
  {
    id: 'relationship',
    title: 'Family & Love',
    icon: 'Heart',
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    prompt: 'What are the laws regarding marriage, divorce, or child custody in Nigeria?'
  },
  {
    id: 'scam',
    title: 'Scam & Fraud',
    icon: 'Ban',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    prompt: 'Someone is trying to scam me or I have been defrauded. What steps can I take legally?'
  }
];

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tenancy',
    title: 'Tenancy Agreement Helper',
    description: 'Generate key clauses for your house rent agreement.',
    fields: ['Landlord Name', 'Tenant Name', 'Address', 'Rent Amount', 'Duration']
  },
  {
    id: 'loan',
    title: 'Friend Loan Agreement',
    description: 'Simple agreement so "I borrow you money" no turn fight.',
    fields: ['Lender Name', 'Borrower Name', 'Amount', 'Repayment Date']
  },
  {
    id: 'employment',
    title: 'Simple Employment Letter',
    description: 'For hiring domestic staff or small business workers.',
    fields: ['Employer Name', 'Employee Name', 'Role', 'Salary', 'Start Date']
  }
];

export const DAILY_TIPS = [
  "Did you know? Police cannot check your phone without a warrant. Section 37 Constitution.",
  "Your landlord cannot evict you by removing the roof. That is illegal self-help.",
  "Bail is free. If they ask for money, ask for a receipt (Cruise tip: dem no go give you).",
  "You have the right to remain silent until you see a lawyer.",
  "A woman can bail a suspect. Don't let them tell you otherwise."
];