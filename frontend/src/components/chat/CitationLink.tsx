import { useContextPanelStore } from '@/stores/context-panel-store'

interface Props {
  index: number
  citationId: string
  workspaceId?: string
  documentId?: string
  nodeId?: string
  label?: string
}

/** Clickable [n] citation — opens the context reader at the locator. */
export function CitationLink({
  index,
  citationId,
  workspaceId = 'ws-default',
  documentId,
  nodeId,
  label,
}: Props) {
  const openTarget = useContextPanelStore((s) => s.openTarget)
  return (
    <button
      type="button"
      className="mx-0.5 inline rounded bg-black/5 px-1 text-xs text-[var(--qd-accent,#2563eb)] hover:underline"
      title={label || citationId}
      onClick={() => {
        if (documentId) {
          openTarget({
            kind: 'document',
            workspaceId,
            documentId,
            nodeId,
            title: label || documentId,
          })
        } else {
          openTarget({
            kind: 'citation',
            workspaceId,
            citationId,
            locator: nodeId ? { kind: 'node', value: nodeId } : undefined,
          })
        }
      }}
    >
      [{index}]
    </button>
  )
}
