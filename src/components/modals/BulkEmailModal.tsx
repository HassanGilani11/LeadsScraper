import React, { useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    X, Mail, Send, Eye, EyeOff, Users, AlertCircle, CheckCircle2, Loader2,
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Type
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/store/useStore';
import { toast } from 'sonner';

interface BulkEmailModalProps {
    leads: Lead[];
    selectedIds: string[];
    senderName: string;
    senderEmail: string;
    userId: string;
    onClose: () => void;
    onSuccess: (sent: number) => void;
}

type SendStatus = 'idle' | 'sending' | 'done' | 'error';

const MERGE_TAGS = [
    { label: '{{first_name}}', value: '{{first_name}}' },
    { label: '{{last_name}}',  value: '{{last_name}}'  },
    { label: '{{company}}',    value: '{{company}}'    },
    { label: '{{email}}',      value: '{{email}}'      },
];

/* ── Toolbar Button ── */
const ToolbarBtn = ({ active, onClick, children, title }: {
    active?: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className={`p-1.5 rounded-md transition-all text-sm
            ${active
                ? 'bg-[#1b57b1] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
        {children}
    </button>
);

/* ── Editor Toolbar ── */
const Toolbar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt('Enter URL', 'https://');
        if (url) editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-slate-200 bg-slate-50/80">
            {/* Text style */}
            <ToolbarBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon size={14} />
            </ToolbarBtn>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Headings */}
            <ToolbarBtn title="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Type size={14} />
            </ToolbarBtn>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Lists */}
            <ToolbarBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered size={14} />
            </ToolbarBtn>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Alignment */}
            <ToolbarBtn title="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                <AlignLeft size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                <AlignCenter size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                <AlignRight size={14} />
            </ToolbarBtn>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {/* Link */}
            <ToolbarBtn title="Insert Link" active={editor.isActive('link')} onClick={addLink}>
                <LinkIcon size={14} />
            </ToolbarBtn>
        </div>
    );
};

/* ── Merge Tag applied to HTML ── */
function applyMergeTagsToHtml(html: string, lead: Lead, senderName?: string): string {
    if (!html) return '';
    let result = html;
    const fromName = senderName || 'Sender';

    const replacements: { [key: string]: string } = {
        "first_name": lead.first_name || lead.email.split('@')[0],
        "last_name": lead.last_name || '',
        "company": lead.company || 'your company',
        "email": lead.email,
        "client_name": lead.first_name || lead.email.split('@')[0],
        "your_name": fromName,
        "company_name": lead.company || 'your company',
    };

    for (const [key, val] of Object.entries(replacements)) {
        const regex = new RegExp(`(\\{\\{|\\{|\\[|\\[\\[)\\s*${key.replace("_", "[_\\s]?")}\\s*(\\}\\}|\\}|\\]|\\]\\])`, "gi");
        result = result.replace(regex, val);
    }

    // Final catch-all for [Client Name] etc
    result = result
        .replace(/\[Client Name\]/gi, lead.first_name || lead.email.split('@')[0])
        .replace(/\[Your Name\]/gi, fromName)
        .replace(/\[Company Name\]/gi, lead.company || 'your company');

    return result;
}

function htmlToPlainText(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ─────────────────────────────────── Main Modal ─────────────────────────────────── */
const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
    leads, selectedIds, senderName, senderEmail, userId, onClose, onSuccess,
}) => {
    const recipients = useMemo(
        () => selectedIds.length > 0 ? leads.filter(l => selectedIds.includes(l.id)) : leads,
        [leads, selectedIds]
    );

    const [fromName, setFromName]   = useState(senderName);
    const [replyTo,  setReplyTo]    = useState(senderEmail);
    const [subject,  setSubject]    = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [sendStatus, setSendStatus]   = useState<SendStatus>('idle');
    const [sendError, setSendError]     = useState<string | null>(null);
    const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

    /* ── Tiptap editor ── */
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
            Placeholder.configure({ placeholder: `Hi {{first_name}},\n\nI noticed you work at {{company}} and wanted to reach out...\n\nBest,\n${senderName}` }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none min-h-[180px] px-4 py-3 text-slate-800 focus:outline-none leading-relaxed email-content-area',
            },
        },
    });

    const insertMergeTag = (tag: string) => {
        editor?.chain().focus().insertContent(tag).run();
    };

    const previewLead = recipients[0];
    const bodyHtml = editor?.getHTML() ?? '';
    const previewHtml = previewLead ? applyMergeTagsToHtml(bodyHtml, previewLead, fromName) : bodyHtml;

    const canSend = subject.trim().length > 0
        && (editor?.getText() ?? '').trim().length > 0
        && fromName.trim().length > 0
        && recipients.length > 0;

    const handleSend = async () => {
        if (!canSend) return;
        setSendStatus('sending');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            const res = await fetch(`${supabaseUrl}/functions/v1/send-bulk-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    leads: recipients.map(l => ({
                        id: l.id, email: l.email,
                        first_name: l.first_name, last_name: l.last_name, company: l.company,
                    })),
                    subject,
                    body: htmlToPlainText(bodyHtml),   // plain text fallback
                    html_body: bodyHtml,                // rich HTML
                    from_name: fromName,
                    reply_to: replyTo,
                    user_id: userId,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send emails');

            setResult(data);
            setSendStatus('done');
            
            if (data.failed > 0) {
                toast.error(`Sent ${data.sent} emails, but ${data.failed} failed.`);
            } else {
                toast.success(`Successfully sent ${data.sent} emails!`);
            }
            
            onSuccess(data.sent);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Failed to send emails';
            setSendError(msg);
            setSendStatus('error');
            toast.error(msg);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1b57b1]/10 flex items-center justify-center text-[#1b57b1]">
                            <Mail size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Bulk Email</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                Sending to <span className="text-[#1b57b1] font-bold">{recipients.length}</span> {recipients.length === 1 ? 'lead' : 'leads'}
                                {selectedIds.length === 0 && leads.length > 0 && ' (all leads)'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto">
                    {sendStatus === 'done' ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 p-8">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-slate-900">Emails Sent!</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    <span className="text-green-600 font-bold">{result?.sent} sent</span>
                                    {(result?.failed ?? 0) > 0 && (
                                        <>, <span className="text-red-500 font-bold">{result?.failed} failed</span></>
                                    )}
                                </p>
                            </div>
                            {(result?.errors?.length ?? 0) > 0 && (
                                <div className="w-full bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-600 space-y-1 max-h-28 overflow-y-auto">
                                    {result?.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                </div>
                            )}
                            <button onClick={onClose} className="px-6 py-2.5 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20">
                                Done
                            </button>
                        </div>
                    ) : sendStatus === 'error' ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-5 p-8">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            <div className="text-center px-6">
                                <p className="text-xl font-bold text-slate-900">Something went wrong</p>
                                <p className="text-sm text-slate-500 mt-1 mb-3">{sendError || 'Check the SMTP credentials or try again.'}</p>
                                {result?.errors && result.errors.length > 0 && (
                                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 max-h-32 overflow-y-auto">
                                        {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setSendStatus('idle')} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Try Again</button>
                                <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all">Close</button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 space-y-4">
                            {/* Recipients preview */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-3">
                                <div className="flex -space-x-2 shrink-0">
                                    {recipients.slice(0, 5).map((lead, i) => (
                                        <div key={lead.id} className="w-8 h-8 rounded-full bg-[#1b57b1]/10 border-2 border-white flex items-center justify-center text-xs font-bold text-[#1b57b1] uppercase" style={{ zIndex: 5 - i }}>
                                            {(lead.first_name?.[0] || lead.company?.[0] || lead.email[0])}
                                        </div>
                                    ))}
                                    {recipients.length > 5 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                                            +{recipients.length - 5}
                                        </div>
                                    )}
                                </div>
                                <div className="text-sm min-w-0">
                                    <p className="font-bold text-slate-900">{recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}</p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {recipients.slice(0, 3).map(l => l.email).join(', ')}{recipients.length > 3 ? ` +${recipients.length - 3} more` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* From / Reply-To */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">From Name</label>
                                    <input type="text" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reply-To Email</label>
                                    <input type="email" value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder="reply@domain.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all" />
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Quick question for {{first_name}}" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-[#1b57b1]/10 focus:border-[#1b57b1] outline-none transition-all" />
                            </div>

                            {/* Merge tag buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insert tag:</span>
                                {MERGE_TAGS.map(tag => (
                                    <button key={tag.value} type="button" onClick={() => insertMergeTag(tag.value)}
                                        className="px-2.5 py-1 bg-blue-50 text-[#1b57b1] rounded-lg text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-all">
                                        {tag.label}
                                    </button>
                                ))}
                            </div>

                            {/* Editor / Preview */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Body</label>
                                    <button onClick={() => setShowPreview(p => !p)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1b57b1] transition-colors" title="Preview how the email looks with merge tags replaced">
                                        {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                                        {showPreview ? 'Back to Editor' : 'Preview for Lead'}
                                    </button>
                                </div>

                                {showPreview ? (
                                    /* ── Preview pane ── */
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500">Preview — {previewLead?.email}</span>
                                            <span className="text-xs text-slate-400">{subject ? applyMergeTagsToHtml(subject, previewLead!, fromName) : '(no subject)'}</span>
                                        </div>
                                        <div
                                            className="prose prose-sm max-w-none p-4 min-h-[180px] text-slate-800 email-content-area"
                                            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-slate-300 italic">Nothing to preview yet...</p>' }}
                                        />
                                    </div>
                                ) : (
                                    /* ── Rich Editor ── */
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:ring-4 focus-within:ring-[#1b57b1]/10 focus-within:border-[#1b57b1] transition-all">
                                        <Toolbar editor={editor} />
                                        <EditorContent editor={editor} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                {sendStatus !== 'done' && sendStatus !== 'error' && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4 shrink-0">
                        <p className="text-xs text-slate-400 font-medium">
                            Sent from <span className="text-slate-600">connect@syntexdev.com</span> · Personalized per lead
                        </p>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancel</button>
                            <button
                                onClick={handleSend}
                                disabled={!canSend || sendStatus === 'sending'}
                                className="px-5 py-2.5 bg-[#1b57b1] text-white rounded-xl text-sm font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sendStatus === 'sending' ? (
                                    <><Loader2 size={15} className="animate-spin" /> Sending...</>
                                ) : (
                                    <><Send size={15} /> Send to {recipients.length} Lead{recipients.length !== 1 ? 's' : ''}</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tiptap editor styles */}
            <style>{`
                .email-content-area p.is-editor-empty:first-child::before {
                    color: #94a3b8;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .email-content-area { outline: none; }
                .email-content-area h2 { font-size: 1.125rem; font-weight: 700; margin: 0.75rem 0 0.5rem; color: #1e293b; }
                .email-content-area ul { list-style: disc !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
                .email-content-area ol { list-style: decimal !important; padding-left: 1.5rem !important; margin-bottom: 1rem !important; }
                .email-content-area li { margin: 0.2rem 0 !important; display: list-item !important; }
                .email-content-area strong { font-weight: 700; }
                .email-content-area em { font-style: italic; }
                .email-content-area u { text-decoration: underline; }
                .email-content-area a { color: #1b57b1; text-decoration: underline; }
                .email-content-area p { margin: 0 0 0.6rem; }
            `}</style>
        </div>
    );
};

export default BulkEmailModal;
