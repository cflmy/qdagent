type Props = {
  title?: string
  kind?: string
  mediaType?: string
  size?: number
  diagnostics?: unknown[]
  onDownload?: () => void | Promise<void>
  downloading?: boolean
}

/** Design Office preview: honest conversion.unavailable — never infinite spinner. */
export function OfficePreview({
  title,
  kind,
  mediaType,
  size,
  diagnostics,
  onDownload,
  downloading,
}: Props) {
  const codes = (diagnostics || []).map((d) => {
    if (typeof d === 'object' && d && 'code' in d) return String((d as { code?: string }).code || '')
    return String(d)
  })
  const conversionMissing = codes.some((c) => c === 'conversion.unavailable')

  return (
    <div className="mq-office-preview flex flex-col gap-3 rounded border border-[var(--qd-border)] p-3">
      <div className="text-sm font-medium text-[var(--qd-text)]">
        {title || 'Office 文档'}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-[var(--qd-muted)]">
        <dt>类型</dt>
        <dd>{kind || mediaType || 'office'}</dd>
        {typeof size === 'number' && size >= 0 ? (
          <>
            <dt>大小</dt>
            <dd>{size} bytes</dd>
          </>
        ) : null}
        <dt>转换</dt>
        <dd>{conversionMissing ? '插件未安装（conversion.unavailable）' : '状态未知'}</dd>
      </dl>
      <p className="text-sm leading-6 text-[var(--qd-text)]">
        不会伪造预览或提取结果。转换插件落地后按派生 PDF/表格/HTML 渲染并标明可能的格式差异；
        本卡保留完整能力闭环，不是终态替代方案。
      </p>
      {onDownload && (
        <button
          type="button"
          className="self-start rounded border border-[var(--qd-border)] px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-40"
          disabled={downloading}
          onClick={() => void onDownload()}
        >
          {downloading ? '准备下载…' : '下载原件'}
        </button>
      )}
      {!!diagnostics?.length && (
        <details className="text-xs text-[var(--qd-muted)]">
          <summary>诊断</summary>
          <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(diagnostics, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}
