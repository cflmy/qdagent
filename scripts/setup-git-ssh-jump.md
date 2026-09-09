# 更稳定的 Git 推送方案（经香港机）

## 问题本质

本机 → `proxy.cflmy.top`：

- `ping` 正常（小包 ICMP）
- `ping -M do -s 1472` 丢包 → **PMTU 黑洞**（大包过不去）
- 默认 TLS1.3 ClientHello 偏大 → HTTPS 像“连不上”
- 一次推送多个 commit / 大 pack → 代理偶发 `Empty reply`

香港机 → GitHub：通常很稳。所以应让 **本机只跟港机说话，由港机直连 GitHub**。

## 方案 A（推荐）：SSH ProxyJump

1. 把本机公钥装到港机（只需一次）：

```bash
# 本机
cat ~/.ssh/id_ed25519.pub
# 登录港机后：
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'PASTE_PUBKEY_HERE' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

2. 本机 `~/.ssh/config`：

```sshconfig
Host hk
  HostName 83.229.126.119
  User cflmy
  IdentityFile ~/.ssh/id_ed25519
  # 可选：AddressFamily inet

Host github.com
  HostName github.com
  User git
  ProxyJump hk
  IdentityFile ~/.ssh/id_ed25519
```

3. 仓库改用 SSH remote：

```bash
cd ~/work/qdagent
git remote set-url origin git@github.com:cflmy/qdagent.git
ssh -T git@github.com   # 应看到 Hi cflmy!
git push -u origin master
```

此后推送路径：本机 --SSH--> 港机 --SSH--> GitHub，避开 HTTPS 代理与 PMTU 大包问题。

## 方案 B（过渡）：逐提交 HTTPS 推送

不改跳板时用仓库脚本（已内置 TLS1.2 + HTTP/1.1 + 重试）：

```bash
./scripts/git-push-stable.sh origin master
```

## 方案 C（本机网卡）：降低 MTU

需 root，可永久缓解大包黑洞：

```bash
sudo ip link set eno2 mtu 1400
# 持久化视发行版写入 NetworkManager / netplan
```

## 方案 D：港机裸仓库中转

港机：`git init --bare ~/repos/qdagent.git`，本机 SSH push 到港机，`post-receive` hook 再 `git push --mirror` 到 GitHub。适合多台内网机共用一个出口。
