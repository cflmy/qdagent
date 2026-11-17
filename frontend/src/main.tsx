import React from 'react';
import ReactDOM from 'react-dom/client';
import {lazy,Suspense} from 'react';
import Landing from './Landing';
import './styles.css';
import './artifact-gallery.css';
import './knowledge.css';
const KnowledgePage=lazy(()=>import('./components/KnowledgePage'));
const FullReader=lazy(()=>import('./components/FullReader'));
const App=lazy(()=>import('./App'));
const content=window.location.pathname==='/app/knowledge'?<Suspense fallback={<p>正在打开知识编译…</p>}><KnowledgePage/></Suspense>:window.location.pathname==='/app/view'?<Suspense fallback={<p>正在打开大屏阅读…</p>}><FullReader/></Suspense>:window.location.pathname==='/app'||window.location.pathname.startsWith('/app/')?<Suspense fallback={<div className="workbench-loading"><img src="/brand/qd-mark.svg" alt="QD"/>正在打开工作台…</div>}><App/></Suspense>:<Landing/>;
class Boundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<div className="fatal-error"><h1>工作台遇到了显示问题</h1><p>服务器中的任务和文件仍然保留。</p><button onClick={()=>window.location.reload()}>重新打开工作台</button></div>:this.props.children}}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary>{content}</Boundary></React.StrictMode>);
