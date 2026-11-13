import { defineConfig } from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseURL=process.env.QDAGENT_TEST_URL||'http://127.0.0.1:17964';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,timeout:45000,
 webServer:process.env.QDAGENT_START_TEST_SERVER==='1'?{
  command:'.marqdo/qdagent-go',cwd:root,url:baseURL+'/healthz',reuseExistingServer:false,timeout:15000,
  env:{QDAGENT_ROOT:root,QDAGENT_DEV_OWNER:'migration-verification',QDAGENT_ADDR:'127.0.0.1:17964',QDAGENT_DEFAULT_MODEL:'builtin-local',QDAGENT_OIDC_REDIRECT_ORIGINS:'http://127.0.0.1:17964,http://localhost:17964'},
 }:undefined,
 use:{baseURL,browserName:'chromium',launchOptions:{executablePath:process.env.QDAGENT_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']},viewport:{width:1586,height:992},screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:'list',
});
