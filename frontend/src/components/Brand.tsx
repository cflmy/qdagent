export function Brand({compact=false}:{compact?:boolean}) {
  return <a className={`qd-brand ${compact?'qd-brand-compact':''}`} href="/" aria-label="求道首页">
    <img src="/brand/qd-mark.svg" width="88" height="64" alt="QD"/>
    <span><strong>求道</strong>{!compact&&<small>QIUDAO</small>}</span>
  </a>;
}
