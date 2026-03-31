import React, { useEffect } from 'react'
import { Button, ColorPicker, Divider, Tooltip } from 'antd'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { BackgroundColor, Color, TextStyle } from '@tiptap/extension-text-style'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'
import './index.scss'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeight?: number
}

const normalizeHtml = (value?: string) => {
  const trimmed = (value || '').trim()
  if (!trimmed || trimmed === '<p></p>') {
    return ''
  }
  return trimmed
}

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  icon: React.ReactNode
  title: string
  onClick: () => void
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active = false,
  disabled = false,
  icon,
  title,
  onClick,
}) => (
  <Tooltip title={title}>
    <Button
      type={active ? 'primary' : 'text'}
      size="small"
      disabled={disabled}
      icon={icon}
      onClick={onClick}
    />
  </Tooltip>
)

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入内容',
  disabled = false,
  minHeight = 220,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      BackgroundColor,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.isEmpty ? '' : currentEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    if (normalizeHtml(editor.getHTML()) !== normalizeHtml(value)) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  const setLink = () => {
    if (!editor) {
      return
    }

    const currentHref = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('请输入链接地址', currentHref || 'https://')

    if (href === null) {
      return
    }

    const nextHref = href.trim()

    if (!nextHref) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: nextHref }).run()
  }

  const disabledToolbar = disabled || !editor
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      currentColor: (currentEditor?.getAttributes('textStyle').color as string | undefined) || '',
      currentBackgroundColor: (currentEditor?.getAttributes('textStyle').backgroundColor as string | undefined) || '',
    }),
  })

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor__toolbar">
        <>
            <ToolbarButton
              title="一级标题"
              icon={<Heading1 size={16} />}
              disabled={disabledToolbar}
              active={!!editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              title="二级标题"
              icon={<Heading2 size={16} />}
              disabled={disabledToolbar}
              active={!!editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              title="三级标题"
              icon={<Heading3 size={16} />}
              disabled={disabledToolbar}
              active={!!editor?.isActive('heading', { level: 3 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <Divider type="vertical" />
        </>

        <ToolbarButton
          title="加粗"
          icon={<Bold size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="斜体"
          icon={<Italic size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="下划线"
          icon={<UnderlineIcon size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('underline')}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          title="删除线"
          icon={<Strikethrough size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('strike')}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
        <ColorPicker
          value={editorState?.currentBackgroundColor || '#fff1b8'}
          disabled={disabledToolbar}
          disabledAlpha
          presets={[
            {
              label: '常用底色',
              colors: ['#fff1b8', '#ffd8bf', '#d9f7be', '#bae0ff', '#efdbff', '#ffd6e7', '#f5f5f5'],
            },
          ]}
          onChange={color => {
            editor?.chain().focus().setBackgroundColor(color.toHexString()).run()
          }}
        >
          <Button
            type="text"
            size="small"
            disabled={disabledToolbar}
            className="rich-text-editor__color-trigger"
            style={editorState?.currentBackgroundColor ? { backgroundColor: editorState.currentBackgroundColor } : undefined}
          >
            底色
          </Button>
        </ColorPicker>
        <Button
          type="text"
          size="small"
          disabled={disabledToolbar || !editorState?.currentBackgroundColor}
          className="rich-text-editor__color-clear"
          onClick={() => editor?.chain().focus().unsetBackgroundColor().run()}
        >
          清底
        </Button>
        <Divider type="vertical" />
        <ToolbarButton
          title="无序列表"
          icon={<List size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title="有序列表"
          icon={<ListOrdered size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <>
            <ToolbarButton
              title="引用"
              icon={<Quote size={16} />}
              disabled={disabledToolbar}
              active={!!editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarButton
              title="代码块"
              icon={<Code2 size={16} />}
              disabled={disabledToolbar}
              active={!!editor?.isActive('codeBlock')}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
        </>
        <Divider type="vertical" />
        <ToolbarButton
          title="链接"
          icon={<Link2 size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive('link')}
          onClick={setLink}
        />
        <ColorPicker
          value={editorState?.currentColor || '#1677ff'}
          disabled={disabledToolbar}
          disabledAlpha
          presets={[
            {
              label: '常用颜色',
              colors: ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#262626'],
            },
          ]}
          onChange={color => {
            editor?.chain().focus().setColor(color.toHexString()).run()
          }}
        >
          <Button
            type="text"
            size="small"
            disabled={disabledToolbar}
            className="rich-text-editor__color-trigger"
            icon={<Palette size={16} style={editorState?.currentColor ? { color: editorState.currentColor } : undefined} />}
          />
        </ColorPicker>
        <Button
          type="text"
          size="small"
          disabled={disabledToolbar || !editorState?.currentColor}
          className="rich-text-editor__color-clear"
          onClick={() => editor?.chain().focus().unsetColor().run()}
        >
          清色
        </Button>
        <Divider type="vertical" />
        <ToolbarButton
          title="左对齐"
          icon={<AlignLeft size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive({ textAlign: 'left' })}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          title="居中"
          icon={<AlignCenter size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive({ textAlign: 'center' })}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          title="右对齐"
          icon={<AlignRight size={16} />}
          disabled={disabledToolbar}
          active={!!editor?.isActive({ textAlign: 'right' })}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        />
        <Divider type="vertical" />
        <ToolbarButton
          title="清除格式"
          icon={<Eraser size={16} />}
          disabled={disabledToolbar}
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
        />
      </div>

      <div
        className="rich-text-editor__content"
        style={{ '--rich-text-editor-min-height': `${minHeight}px` } as React.CSSProperties}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default RichTextEditor
