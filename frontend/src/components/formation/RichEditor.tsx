import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function RichEditor({ content, onChange, placeholder, readOnly = false }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? 'Commencez à écrire votre leçon…',
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [readOnly, editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor-wrapper" style={{ border: '1px solid var(--border-medium)', borderRadius: 8, overflow: 'hidden' }}>
      {!readOnly && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-page)',
        }}>
          <ToolGroup>
            <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras (Ctrl+B)">
              <b>B</b>
            </ToolBtn>
            <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique (Ctrl+I)">
              <i>I</i>
            </ToolBtn>
            <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné (Ctrl+U)">
              <u>U</u>
            </ToolBtn>
          </ToolGroup>

          <Sep />

          <ToolGroup>
            <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
              H1
            </ToolBtn>
            <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
              H2
            </ToolBtn>
            <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
              H3
            </ToolBtn>
          </ToolGroup>

          <Sep />

          <ToolGroup>
            <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
              <IcoBullet />
            </ToolBtn>
            <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
              <IcoOrdered />
            </ToolBtn>
            <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
              <IcoQuote />
            </ToolBtn>
          </ToolGroup>

          <Sep />

          <ToolGroup>
            <ToolBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Annuler (Ctrl+Z)" disabled={!editor.can().undo()}>
              <IcoUndo />
            </ToolBtn>
            <ToolBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Rétablir (Ctrl+Y)" disabled={!editor.can().redo()}>
              <IcoRedo />
            </ToolBtn>
          </ToolGroup>
        </div>
      )}

      <EditorContent
        editor={editor}
        style={{
          padding: readOnly ? 0 : '12px 16px',
          minHeight: readOnly ? 0 : 200,
          fontSize: 14,
          lineHeight: 1.7,
          color: 'var(--fg-primary)',
          background: readOnly ? 'transparent' : 'var(--bg-card)',
        }}
      />
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 1 }}>{children}</div>;
}

function Sep() {
  return <div style={{ width: 1, background: 'var(--border-subtle)', margin: '2px 4px', alignSelf: 'stretch' }} />;
}

interface ToolBtnProps {
  active: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolBtn({ active, onClick, title, disabled, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '4px 8px',
        borderRadius: 4,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
        fontWeight: 600,
        minWidth: 28,
        height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--brand-navy)' : 'transparent',
        color: active ? 'white' : disabled ? 'var(--fg-muted)' : 'var(--fg-secondary)',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-stone)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? 'var(--brand-navy)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

function IcoBullet() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>;
}
function IcoOrdered() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>;
}
function IcoQuote() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>;
}
function IcoUndo() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>;
}
function IcoRedo() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>;
}
