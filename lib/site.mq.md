---
title: lib/site
description: >-
  qdagent site Resource helpers for Marqdo 1.3 (ADR 0007).
  Wraps still-registered web ABI for auth / form mount / proxy+invoke / page chrome
  without compose_* or app.configure junk drawers. Import web capability first.
import cap:ext/web/_capability.mq.md
import table:lib/table.mq.md
import web:ext/web/web.mq.md
---

## page
    + `title`
    + `intro`=""

Document handle for `web.route` / listen (uses `intro`, not Markdown `body`).

> cap.load
*> web_page_new title=`title` intro=`intro` shell_css=None layout=None asset_version=None*

## md
    + `text`=""

Markdown → HTML for Document intros (Artifact body path).

> cap.load
*> web_dom_markdown text=`text`*

## page_md
    + `title`
    + `markdown`=""

Build a page whose intro is rendered Markdown (code-as-documentation bodies).

**html = > md text=`markdown`**
*> page title=`title` intro=`html`*

## css
    + `page`
    + `css`

> cap.load
*> web_page_css page=`page` css=`css`*

## head
    + `page`
    + `table`

> cap.load
*> web_page_head page=`page` table=`table`*

## order
    + `page`
    + `order`

> cap.load
*> web_page_order page=`page` order=`order`*

## link_prefix
    + `page`
    + `prefix`

> cap.load
*> web_page_link_prefix page=`page` prefix=`prefix`*

## query
    + `page`
    + `query`

> cap.load
*> web_page_query page=`page` query=`query`*

## detail
    + `page`
    + `detail`=True

> cap.load
*> web_page_detail page=`page` detail=`detail`*

## data_source
    + `page`
    + `source`

Stamp Artifact `data_source` onto a page bag (list/detail cards).

*> table.put in=`page` at="data_source" value=`source`*

## chrome
    + `page`
    + `nav`=None
    + `side`=None
    + `foot`=None

Attach nav / side / foot link tables (renderer chrome — not View compose DSL).

**p = `page`**
1. `nav`
  **p = > table.put in=`p` at="nav" value=`nav`**
1. `side`
  **p = > table.put in=`p` at="side" value=`side`**
1. `foot`
  **p = > table.put in=`p` at="foot" value=`foot`**
*`p`*

## attach_form
    + `page`
    + `id`
    + `form`

Embed a form on the page (RenderPage reads `form` / `forms` / `form_id`) and keep a copy for `/_form/{id}`.

**forms = > table.put in=None at=`id` value=`form`**
**p = > table.put in=`page` at="form_id" value=`id`**
**p = > table.put in=`p` at="form" value=`form`**
*> table.put in=`p` at="forms" value=`forms`*

## mount_form
    + `app`
    + `id`
    + `form`

Register `/_form/{id}` on the app.

> cap.load
*> web_app_mount_form app=`app` id=`id` form=`form`*

## auth
    + `app`
    + `users`
    + `session_ttl`=86400
    + `admin_prefix`="/account"
    + `login_redirect`="/"
    + `logout_redirect`="/account/login"

Wire session login desk (`/account/*`).

> cap.load
*> web_app_auth app=`app` users=`users` session_ttl=`session_ttl` admin_prefix=`admin_prefix` login_redirect=`login_redirect` logout_redirect=`logout_redirect` login_path=None register=None register_path=None default_role=None session_url=None*

## wire
    + `app`
    + `proxy`=None
    + `invoke`=None
    + `访问日志`=True
    + `json_routes`=None

Table-driven proxy + invoke (native Resource; replaces banned `configure` drawer).

> cap.load
*> web_app_middleware app=`app` cors=None security=None compress=None body_limit=None json_routes=`json_routes` access_log=`访问日志` cache_control=None proxy=`proxy` invoke=`invoke`*
