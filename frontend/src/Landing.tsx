import {ArrowDown,ArrowRight,Check,CheckCircle2,ChevronRight,Eye,FileText,Layers,Box,ShieldCheck,Terminal,RefreshCw,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {Brand} from './components/Brand';
import './landing.css';

const authenticationErrors: Record<string,{title:string;body:string}> = {
  authorization:{title:'这次登录尚未完成',body:'授权已取消，或身份站未返回有效授权码。你可以重新登录，任务与文件仍然保留。'},
  discovery:{title:'暂时未能连接统一身份站',body:'读取身份站配置时连接失败。你的任务与文件仍然保留，请重新登录。'},
  state:{title:'这次登录已失效',body:'登录链接可能已使用、过期，或来自另一个入口。请从当前页面重新登录。'},
  exchange:{title:'未能完成登录授权',body:'身份站未能完成授权码交换，请重新登录。如果仍然失败，可向管理员提供错误阶段 exchange。'},
  verification:{title:'身份令牌未通过验证',body:'为保护你的账号，本次登录没有建立会话。请重新登录；如再次出现，请联系管理员。'},
  userinfo:{title:'未能确认账号资料',body:'账号资料暂时无法取得或与授权主体不一致，请重新登录。'},
  origin:{title:'登录入口未获授权',body:'请使用 agent.qdqc.com，或已配置的本机入口登录。'},
  missing_token:{title:'身份站没有返回登录凭证',body:'本次授权没有建立会话，请重新登录或联系管理员。'},
  storage:{title:'暂时无法建立登录会话',body:'服务暂时无法保存登录状态，请稍后重试。'},
};
const capabilities = [
  {icon:FileText,title:'用一份文档连接知识与行动',text:'用同一份文档描述目标、知识与约束。通过 Marqdo 连接说明与工具，让理解、执行和交付保持一致。'},
  {icon:Terminal,title:'每一步，都有真实依据',text:'通过 marqdo call 执行真实操作，记录参数、工具结果与退出证据。报告、演示与文件，让成果可以核验。'},
  {icon:Eye,title:'读得明白，也看得清楚',text:'用官方 View 阅读同一份文稿。叙述、参数与逻辑一同呈现，既能理解任务设计，也能追踪执行与交付。'},
];
const stages = [
  {icon:FileText,title:'可阅读的文档',text:'用自然的文档表达目标与知识。'},
  {icon:Layers,title:'可编译的知识',text:'由 Marqdo 解析结构、参数与调用。'},
  {icon:Box,title:'可调用的工具',text:'按需连接工具与资源，完成实际操作。'},
  {icon:ShieldCheck,title:'可验证的成果',text:'产出可复用的文稿与过程记录。'},
];

function DocumentIllustration() {
  return <figure className="lp-document" aria-label="Marqdo 文档驱动工作方式示意">
    <div className="lp-window-chrome" aria-hidden="true"><i/><i/><i/></div>
    <div className="lp-document-tab"><img src="/brand/qd-mark.svg" width="36" height="27" alt=""/><strong>task.mq.md</strong><span>文稿示意</span></div>
    <div className="lp-document-body">
      <h2>市场调研与报告</h2>
      <table><tbody><tr><th>目标</th><td>围绕既定的研究主题，系统梳理市场现状、<br className="lp-wide-only"/>关键信息与趋势，为决策提供参考。</td></tr><tr><th>交付</th><td>一份结构清晰、可复用的市场调研报告<br className="lp-wide-only"/>（Marqdo 文档，.mq.md）。</td></tr></tbody></table>
      <p className="lp-document-narrative">本任务将基于提供的<span>参考资料</span>，梳理市场的基本情况，整理<span>关键发现</span>，并生成一份<span>可复用的研究报告</span>。</p>
      <ol className="lp-example-steps" aria-label="工作流程示意"><li><Check size={12}/><span>读取参考资料</span></li><li><i/><span>整理研究发现</span></li><li><i/><span>生成可复用文稿</span></li></ol>
      <div className="lp-example-artifact"><FileText/><strong>调研报告.mq.md</strong><span><CheckCircle2/>交付成果</span></div>
      <figcaption className="lp-command"><ChevronRight/><code>marqdo call task.mq.md research</code></figcaption>
    </div>
  </figure>;
}

export default function Landing({authenticationRequired=false,serviceError,onRetry}:{authenticationRequired?:boolean;serviceError?:string;onRetry?:()=>void}) {
  const [dismissed,setDismissed]=useState(false);
  const code=new URLSearchParams(window.location.search).get('auth_error')||'';
  const error=authenticationErrors[code];
  useEffect(()=>{document.title='求道 · 让知识，成为行动';return()=>{document.title='求道 · 工作台'}},[]);
  const login='/login';
  return <div className="landing">
    <a className="lp-skip" href="#main">跳到正文</a>
    <div className="lp-canvas">
      <header className="lp-header"><Brand/><span className="lp-header-divider" aria-hidden="true"/><nav aria-label="首页导航"><a href="#capabilities">产品能力</a><a href="#marqdo">Marqdo 驱动</a><a href="#workflow">工作方式</a></nav><a className="lp-nav-button" href="/app">进入工作台</a></header>
      {(error||authenticationRequired||serviceError)&&!dismissed&&<section className="lp-auth-notice" role="alert"><ShieldCheck/><div><strong>{error?.title||(serviceError?'工作台暂时无法连接':'登录后，进入你的工作台')}</strong><p>{error?.body||serviceError||'使用统一身份登录，继续你的任务、文稿与知识。'}</p>{error&&<small>错误阶段：{code} · 不会自动执行或重做任务</small>}</div><a href={login}><RefreshCw size={15}/>重新登录</a>{serviceError&&onRetry&&<button onClick={onRetry}>重新连接</button>}<button className="lp-notice-close" aria-label="关闭登录提示" onClick={()=>setDismissed(true)}><X size={17}/></button></section>}
      <main id="main">
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-hero-copy"><p className="lp-eyebrow">MARQDO · EXECUTABLE KNOWLEDGE</p><h1 id="hero-title">让知识，<br/>成为行动。</h1><p className="lp-intro">可阅读的文档，可执行的知识。求道将你的目标、知识与工具连在一起，让每一次行动都有依据，让每一份成果都能继续复用。</p><div className="lp-hero-actions"><a className="lp-button lp-primary" href={login}>开始使用求道</a><a className="lp-button lp-secondary" href="#workflow">看看如何工作<ArrowDown/></a></div><ul className="lp-proofs" aria-label="产品特点">{['文档驱动','真实执行','过程可见'].map(text=><li key={text}><Check/>{text}</li>)}</ul></div>
          <DocumentIllustration/>
        </section>
        <section className="lp-workflow" id="workflow" aria-label="从文档到交付的工作方式">{stages.map(({icon:Icon,title,text},i)=><div className="lp-stage" key={title}><Icon/><div><h2>{title}</h2><p>{text}</p></div>{i<3&&<ArrowRight className="lp-stage-arrow"/>}</div>)}</section>
        <section className="lp-capabilities" id="capabilities" aria-labelledby="capabilities-title"><div className="lp-section-heading"><h2 id="capabilities-title">不止于回答，更能完成工作。</h2><p>同一份知识，贯穿理解、执行与交付。</p></div><div className="lp-feature-grid" id="marqdo">{capabilities.map(({icon:Icon,title,text},i)=><article className="lp-feature" key={title}><div className="lp-feature-top"><Icon/><span>0{i+1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        <section className="lp-cta" aria-labelledby="cta-title"><div><h2 id="cta-title">把下一次对话，变成真正的成果。</h2><p>从一个目标开始，留下可以复用的知识。</p></div><a className="lp-button" href={login}>开始你的第一个任务<ArrowRight/></a></section>
      </main>
      <footer className="lp-footer"><Brand compact/><span className="lp-footer-divider"/><p>Powered by <a href="https://github.com/cflmy/marqdo" target="_blank" rel="noreferrer">Marqdo</a></p><span className="lp-footer-note">文档原生 · 知识可执行</span></footer>
    </div>
  </div>;
}
