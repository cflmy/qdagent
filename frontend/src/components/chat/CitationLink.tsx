import { useContextPanelStore } from '@/stores/context-panel-store'

interface Props {
  index: number
  citationId: string
  workspaceId?: string
  documentId?: string
  nodeId?: string
  revision?: string
  generation?: string
  label?: string
}

/** Clickable [n] citation — opens the context reader at the historical locator (Q-R4). */
export function CitationLink({
  index,
  citationId,
  workspaceId = 'ws-default',
  documentId,
  nodeId,
  revision,
  generation,
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
            revision,
            generation,
            title: label || documentId,
          })
        } else {
          openTarget({
            kind: 'citation',
            workspaceId,
            citationId,
            documentId,
            nodeId,
            revision,
            generation,
            locator: {
              kind: 'node',
              value: nodeId,
              revision,
              generation,
            },
          })
        }
      }}
    >
      [{index}]
    </button>
  )
}
