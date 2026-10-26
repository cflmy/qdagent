---
markup: occlusion
title: T01b probe/discover — native unavailable; openai-compatible catalog
import:
  registry: lib/registry.mq.md
  json: lib/json.mq.md
  sys: lib/sys.mq.md
---

# main

**native = > json.parse text="{\"id\":\"prov-native-t01\",\"display_name\":\"Native X\",\"adapter\":\"openai-native\",\"base_url\":\"\",\"credential_action\":\"clear\"}"**
**sn = > registry.save_provider payload=`native`**
**nok = > json.get value=`sn` key="ok"**
1. not `nok`
  > print text=save-native-fail
  > print text=`sn`
  > sys.exit code=1

**pr = > registry.probe provider_id="prov-native-t01"**
**st = > json.get value=`pr` key="status"**
1. `st` == "unavailable"
  > print text=native-unavailable-ok
2. *
  > print text=native-should-be-unavailable
  > print text=`pr`
  > sys.exit code=1

> registry.migrate_legacy_settings
**pr2 = > registry.probe provider_id="prov-legacy-default"**
**st2 = > json.get value=`pr2` key="status"**
1. `st2` == "unavailable"
  > print text=legacy-marked-unavailable
  > print text=`pr2`
  > sys.exit code=1
1. `st2` == "reachable_config"
  > print text=legacy-reachable-ok
2. *
  > print text=legacy-unexpected
  > print text=`pr2`
  > sys.exit code=1

**disc = > registry.discover provider_id="prov-legacy-default"**
**dok = > json.get value=`disc` key="ok"**
1. not `dok`
  > print text=discover-fail
  > print text=`disc`
  > sys.exit code=1

> print text=t01b-probe-discover-ok
