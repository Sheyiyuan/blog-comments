---
title: "Arch Linux 脚本安装与 GNOME 桌面环境配置指南"

published: 2025-09-30
category: "技术分享"
tags: 
  - "arch-linux"
  - "Linux"
  - "安装"
  - "操作系统"
  - "美化"
  - "配置"
image: "images/1759239147-arch-scaled.webp"
draft: false
---

## 前情提要

这是主包第三次安装 Arch Linux。先交代一下前两次翻车的原因：

- **第一次安装：** 跟着视频用 `archinstall` 装的，能用但小问题不少。更关键的是当时没认真看 Arch Wiki，把引导分区放在了 Windows 磁盘上，后来 Windows 更新改了引导项，直接无法开机。那时也不会救援，只能重装。

- **第二次安装：** 这次是按[archlinux 简明指南](https://arch.icekylin.online/guide/)、[Archlinux-Gnome-FullGuide-ShorinArchExperience](https://github.com/shorinkiwata/Archlinux-Gnome-FullGuide-ShorinArchExperience/tree/main)和 [Arch Wiki](https://wiki.archlinux.org/)手动安装，但因为没有完整记录操作步骤，后面出现了掉引导、掉驱动、掉声音、掉网络等问题，最终还是没救回来。

这篇文档的主干来自上面两篇指南，并补充了主包自己踩坑后总结的实战经验。由于本次是实体机安装，安装阶段图片会比较少（部分示意图来自原指南）；后续如果在虚拟机重装，会再补图完善。

## 阅读导航

- [前期准备](#前期准备)
- [安装流程（archinstall）](#安装流程archinstall)
- [系统配置（驱动、桌面与常用工具）](#系统配置驱动桌面与常用工具)
- [系统维护与更新习惯](#系统维护与更新习惯)
- [进阶美化与个性化配置](#进阶美化与个性化配置)
- [收尾：给未来的你留一条回头路](#收尾给未来的你留一条回头路)

## 前期准备

### 解决双系统导致的时间错乱

安装双系统的机器在 Linux 使用一段时间后切换回 Windows 就会出现时间错乱的情况，这是因为两个系统对硬件时钟的处理方式不同（[CSDN博客：双系统时间不一致解决方案](https://blog.csdn.net/zhouchen1998/article/details/108893660)）。

在 Windows 中以管理员身份运行 PowerShell，输入下面的命令：

```
Reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1
```

这样就能解决两个系统时间不同步的问题。

### 准备安装启动盘

我们需要一个不小于 8 GB 且没有重要数据的 U 盘（制作启动盘会格式化，务必提前备份），用来存放系统镜像。工具有很多，这里以 [Ventoy](https://www.ventoy.net/cn/index.html) 为例。

用这种方法的好处是在安装后如果出现系统级的崩溃和错误，连 tty 都无法进入时也可以用安装镜像修复系统错误或者抢救数据。并且 Ventoy 在一次准备后可以存放多个系统镜像，把 Windows 安装媒介和 PE 都放进去，实在是居家旅行必备良品（雾）。

Ventoy 的具体使用方法参考官网教程或其他文档即可，操作本身不复杂，这里不展开。

> Arch Linux 会在每个月 1 号发布最新安装镜像。由于 Arch 是滚动更新，尽量使用你能拿到的最新镜像，旧镜像可能会出现奇怪错误。

### vi 基础操作说明

`vi` 是命令行文本编辑器，`vim`、`neovim` 的基础操作和它类似。安装系统时你基本绕不开它（虽然我更推荐后续装 `vim` 或 `neovim`）。这里先给最常用的按键：

- `i`：在光标位置进入编辑模式（编辑模式下按键就是普通输入）
- `Shift + A`：跳到行尾并进入编辑模式
- `Esc`：退出编辑模式
- `yy`：复制当前行
- `dd`：剪切（删除）当前行
- `p`：粘贴
- `:q`：退出
- `:w`：保存
- `:wq`：保存并退出
- `/关键词`：查找文本

这里的冒号必须是英文冒号，中文冒号不会被识别。

### 记好笔记

搞清楚自己做过什么，把每一步操作都记下来。真的，别偷懒。

不然你为什么会看到这篇文档呢（笑）

## 安装流程（archinstall）

### 1. 连接网络

使用 `iwctl` 工具连接无线网络，在命令行输入 `iwctl` 后回车进入交互式命令行。需要注意这里只建议使用英文名 Wi‑Fi，使用中文可能乱码导致无法连接。

```
# 启动交互式命令行
iwctl

# （可选）先扫描，再获取可用 Wi-Fi 列表 
station wlan0 scan
station wlan0 get-networks

# 连接网络
station wlan0 connect [wifi名称]
# 回车后输入密码，这里密码不会显示，直接输入完后回车

# 退出 iwctl
exit
```

### 可选：更新 archinstall

Arch 会在每个月第一天发布最新的安装镜像。如果你的镜像不是最新的镜像，建议在 Live 环境里更新 `archinstall`，避免一些奇奇怪怪的错误。

```
# 更新数据库（Live 环境临时用没问题；装好系统后尽量避免只用 -Sy 造成部分升级）
pacman -Syy
# 更新密钥与 archinstall
pacman -S --needed archlinux-keyring archinstall
```

### 2. 使用 archinstall 安装

接下来输入 `archinstall`，回车进入安装配置 TUI 界面：

```
archinstall
```

第一项是脚本语言，第二项是系统本地化。建议保持英文，改成中文在某些环境可能乱码，直接看第三项即可。

#### Mirrors and repositories 设置镜像源

1. 选择第一项 `Select regions` 设置自己的所在地。加载会比较慢，耐心等一等。
2. 选择第三项 `optional repositories`，回车激活 `multilib`（32 位程序的源）。

#### Disk configuration 磁盘分区

选择 partitioning 进入磁盘分区。

> ⚠️ 这里开始涉及真实磁盘写入操作。执行每一步前先确认目标磁盘型号与容量，避免误操作到数据盘。

- 情况一：整块空闲硬盘安装 Arch

1. 选择第一项进行自动分区 > 要使用的硬盘 > btrfs（文件系统） > yes（是否使用推荐子卷布局） > use compression（透明压缩）
2. 选择 btrfs snapshots（快照软件） > Snapper，选择 back 返回。

- 情况二：和其他系统共享同一块硬盘：选择第二项手动分区 > 要使用的硬盘

1. 创建启动分区：选中要使用的空闲空间 > Size（分区大小）1024MB > Filesystem（文件系统）FAT32 > Mountpoint（挂载点）/boot

2. 创建 swap 分区（可选）：**如果你不需要“休眠到硬盘（hibernate）”的话可以跳过这一步**。休眠指把系统当前状态写入硬盘，然后电脑完全断电，下一次开机恢复到休眠前的状态。swap 交换空间与虚拟内存和休眠有关。建议设置 zram 作为日常 swap，**仅在需要休眠时再配置硬盘 swap**。swap 有分区或文件两种方式：分区更简单，文件更灵活。

| 内存 | 不需要睡眠 | 需要睡眠 | 不建议超过 |  |
| --- | --- | --- | --- | --- |
| 1GB | 1GB | 2GB | 2GB |  |
| 2GB | 2GB | 3GB | 4GB |  |
| 3GB | 3GB | 5GB | 6GB |  |
| 4GB | 4GB | 6GB | 8GB |  |
| 5GB | 2GB | 7GB | 10GB |  |
| 6GB | 2GB | 8GB | 12GB |  |
| 8GB | 3GB | 11GB | 16GB |  |
| 12GB | 3GB | 15GB | 24GB |  |
| 16GB | 4GB | 20GB | 32GB |  |
| 24GB | 5GB | 29GB | 48GB |  |
| 32GB | 6GB | 38GB | 64GB |  |
| 64GB | 8GB | 72GB | 128GB |  |
| 128GB | 11GB | 139GB | 256GB |  |
| 256GB | 16GB | 272GB | 512GB |  |
| 512GB | 23GB | 535GB | 1TB |  |
| 1TB | 32GB | 1056GB | 2TB |  |
| 2TB | 46GB | 2094GB | 4TB |  |
| 4TB | 64GB | 4160GB | 8TB |  |
| 8TB | 91GB | 8283GB | 16TB |  |
|  |  |  |  |  |

```
 Size参考上面的表 > linux-swap
```

3. 创建 root 分区：Size 部分直接回车分配全部空间 > btrfs > 选中刚刚创建的 btrfs 回车。选择 Mark/Unmark as compressed 设置透明压缩；再选择 Set subvolumes（创建子卷）> Add subvolume，至少创建 root 子卷和 home 子卷：Subvolume name 设为 `@`，对应 mountpoint 为 `/`；`@home` 对应 `/home`。最后 confirm and exit > confirm and exit > back 退出硬盘分区。

#### Swap（zram交换空间）

这一步会自动帮你配置 zram 交换空间，选择 `Yes` 开启即可。

#### Bootloader引导系统

最常用的是 GRUB，选择 GRUB 即可；有其他需求再按需查文档。

#### Hostname主机名

不用改，你想要改成其他名字也行

#### Authentication身份认证

- `Root password`：设置管理员密码。

- `User account > Add a user`：创建普通用户。`Should "xxx" be a superuser (sudo)` 是在问要不要给该用户管理员权限，通常选择 `Yes`。

- `U2F login setup`：物理密钥登录，有需要再配置。

#### Profile

这里可以选择自动安装桌面、最小化安装等配置。既然都用 `archinstall` 了，桌面也可以顺手装上。如果你还没想好，先在 GNOME 和 KDE Plasma 里二选一：KDE 更接近 Windows 习惯，资源占用更低、可定制性更强；GNOME 中文输入法体验更稳定，更接近 macOS 的交互逻辑，整体更统一。

- Type > Desktop > 想安装的桌面环境或者窗口管理器

- `Graphics driver`（自动安装显卡驱动）：AMD 选择 `AMD/ATi (opensource)`；NVIDIA 先去 [CodeNames · freedesktop.org](https://nouveau.freedesktop.org/CodeNames.html) 查显卡对应的 NV family。通常 NV160 及以后可选 `NVIDIA (open kernel module …)`；NV110~NV160 可选 `NVIDIA (proprietary)`；更早型号用 `NVIDIA (open-source nouveau …)`。

不过这里自动装的桌面通常会附带不少你不一定用得上的软件。追求干净系统的话，建议走最小化安装，再手动补齐自己要的组件。

#### Applications（蓝牙和音视频）

- `Bluetooth > Yes`：自动安装蓝牙组件。

- `Audio > pipewire`：自动安装音视频服务。PipeWire 是当前主流方案，兼容旧的 PulseAudio 等服务，直接选 `pipewire` 即可。

#### Kernel（系统内核）

按 `Tab` 键切换选项。偏续航可选 `linux`，偏性能可选 `linux-zen`。

#### Network configuration （网络配置）

建议选第三项 `NetworkManager`，它和 GNOME / KDE Plasma 集成最好。

#### Additional packages（自定义安装其他软件包）

按 `/` 进行搜索，按 `Tab` 键选择。

> 这里的包选择会直接影响后续引导与联网体验，至少保证 `vim`、`os-prober` 这类基础组件被选中。

必须安装：vim（任意文本编辑器）、os-prober（双系统需要）

如果你安装了其他内核，比如我使用 linux-zen，可以把头文件 `linux-zen-headers` 勾选上。

可选安装中文字体：wqy-zenhei（文泉驿字体）、noto-fonts（谷歌开源字体）、noto-fonts-emoji（表情）

#### Timezone（时区）

左斜杠键搜索Shanghai，这里没有北京，不要找北京了。

#### Automatic time sync (NTP) （自动启用网络时间同步）

默认开启，不用修改

#### Install

选择 `Install` 开始安装。

### 3. 双系统

安装完成后配置 Windows 和 Linux 的双系统。

1. 选择 `Exit archinstall`，退出安装器。
2. 挂载 Windows 的 EFI 启动分区（ESP，FAT32）。

```
   lsblk -pf #列出当前分区情况
```

找到 Windows 所在磁盘上的 EFI System Partition（FAT32，常见类似 `nvme0n1p1`/`nvme1n1p1`）。可以用 `fdisk -l`（小写字母 l）看更详细信息。确认无误后再挂载到 `/mnt` 下任意目录（例如 `/mnt/winboot`）。

> 设备名仅为示例，务必按你机器的实际输出填写，别直接照抄。

```
   mount /dev/nvme1n1p1 /mnt/winboot 
```

3. arch-chroot

```
   arch-chroot /mnt #进入刚刚安装的系统
```

4. 编辑 GRUB 配置启用 `os-prober`

```
   vim /etc/default/grub 

   i键进入编辑模式

  确保存在并设置：GRUB_DISABLE_OS_PROBER=false（取消注释或新增一行）

   esc退出编辑模式

   :wq 冒号小写wq保存并退出
```

5. 禁用 watchdog：在 `GRUB_CMDLINE_LINUX_DEFAULT=""` 里添加参数

```
   nowatchdog modprobe.blacklist=sp5100_tco
```

Intel CPU 用户把 `sp5100_tco` 换成 `iTCO_wdt`。

6. 将 `GRUB_DEFAULT=0` 改成 `GRUB_DEFAULT=saved`，再取消 `GRUB_SAVEDEFAULT=true` 的注释。这一步用于记住上一次开机选择。

7. 生成 GRUB 配置文件

```
   grub-mkconfig -o /boot/grub/grub.cfg
```

8. exit 退出 chroot
9. reboot 重启
10. 如有需要，进入 BIOS/UEFI 调整启动项顺序。

## 系统配置（驱动、桌面与常用工具）

### 网络连接

设置开机自启并立即启动 `NetworkManager` 服务：

```
systemctl enable --now NetworkManager
```

若为无线连接，则需要在启动 `NetworkManager` 后使用 `nmtui` 连接网络：

```
nmtui
```

### 可选：安装 fastfetch

`fastfetch` 可以把系统信息和发行版 Logo 一并打印出来。通过 `pacman` 安装：

```
pacman -S fastfetch
```

### 显卡驱动和硬件编解码

以 4060 和 780M 为例。

参考链接：[NVIDIA - ArchWiki](https://wiki.archlinux.org/title/NVIDIA)、[AMDGPU](https://wiki.archlinux.org/title/AMDGPU)

#### 检查头文件

```
sudo pacman -S linux-zen-headers
```

把 `linux` 替换成你正在使用的内核名；例如 Zen 内核对应 `linux-zen-headers`。

#### 安装显卡驱动

- Intel 核显

```
sudo pacman -S mesa lib32-mesa vulkan-intel lib32-vulkan-intel
```

- Nvidia

``` 
sudo pacman -S --needed nvidia-dkms nvidia-settings nvidia-utils lib32-nvidia-utils
```

显卡驱动的选择：先在[CodeNames · freedesktop.org](https://nouveau.freedesktop.org/CodeNames.html)搜索自己的显卡，确认对应的 family；然后在[NVIDIA - ArchWiki](https://wiki.archlinux.org/title/NVIDIA)查对应驱动。NV160 family 往后的显卡通常可用 `nvidia-open`；NV110~NV190 如果 `nvidia-open` 表现不佳可以使用 `nvidia`。注意：非 stable 内核要安装的驱动包可能不同，具体看 wiki，例如 zen 内核常见是 `nvidia-open-dkms`。

- AMD 显卡一般不需要额外安装专有驱动，确认 Vulkan 相关包即可。

```
  sudo pacman -S --needed vulkan-radeon vulkan-mesa-layers
```

#### 硬件编解码

- NVIDIA

```
  sudo pacman -S libva-nvidia-driver
```

- AMD 自带，无需额外安装。

- 重启激活显卡驱动和字体

```
  reboot 
```

### GNOME

#### 安装 GNOME 最小环境

```
sudo pacman -S --needed gnome-shell gdm gnome-control-center gnome-software flatpak
```

终端模拟器可按需安装（例如 `ghostty`/`gnome-console` 等）。

如果在安装音频相关组件时提示选择 JACK provider，一般选择 `pipewire-jack`。

```
gnome-shell GNOME 桌面最小核心
gdm 是显示管理器（GNOME Display Manager）
ghostty 是一个可高度自定义的终端模拟器（terminal emulator)
gnome-control-center 是设置中心
gnome-software 是软件商城
flatpak 是跨发行版通用的软件打包形式，通常版本更新会更及时
```

- 临时开启GDM

```
systemctl start gdm 
```

- 正常启动后设置 gdm 开机自启

```
sudo systemctl enable gdm
```

#### 安装声音固件和声音服务

- 安装声音固件

```
sudo pacman -S --needed sof-firmware alsa-firmware alsa-ucm-conf
```

- 安装声音服务

```
sudo pacman -S --needed pipewire pipewire-pulse pipewire-alsa pipewire-jack wireplumber
```

- 启用服务

```
systemctl --user enable --now pipewire pipewire-pulse wireplumber
```

- 可选：安装GUI（图形界面管理工具）

```
sudo pacman -S pavucontrol 
```

#### 启用蓝牙

```
sudo pacman -S --needed bluez bluez-utils
```

```
sudo systemctl enable --now bluetooth
```

#### 安装高级网络配置工具nm-connection-editor

```
sudo pacman -S --needed network-manager-applet dnsmasq
```

#### 配置 archlinuxcn 源

这里先配置 `archlinuxcn` 源，后面的代理工具和 AUR 助手会用到。

AUR 上很多包在无代理环境下很难下载，所以建议先把网络环境准备好。

```
  sudo vim /etc/pacman.conf
```

文件底部写入（ctrl+shift+V粘贴）：

```
  [archlinuxcn]
  Server = https://mirrors.ustc.edu.cn/archlinuxcn/$arch 
  Server = https://mirrors.tuna.tsinghua.edu.cn/archlinuxcn/$arch 
  Server = https://mirrors.hit.edu.cn/archlinuxcn/$arch 
  Server = https://repo.huaweicloud.com/archlinuxcn/$arch 
```

同步数据库并安装 archlinuxcn 密钥

```
  sudo pacman -Syu --needed archlinuxcn-keyring
```

安装代理软件 clash-verge-rev 和 AUR 助手 yay：

> `paru` 也是 AUR 助手，但部分场景下兼容性不如 `yay`。建议固定使用一个助手，不要混用。

```
  sudo pacman -S clash-verge-rev yay 
```

#### 安装微软字体

```
yay -S ttf-ms-win11-auto-zh_cn
```

#### 本地化设置

```
sudo vim /etc/locale.gen 
```

左斜杠键搜索，取消zh\_CN.UTF-8的注释

```
sudo locale-gen
```

#### 配置 Flatpak 源

如果 Flatpak 下载慢或加载异常，可以切换国内镜像源。

```
sudo flatpak remote-modify flathub --url=https://mirror.sjtu.edu.cn/flathub
```

#### fcitx5输入法

已知问题：在某些应用里面会吞字，或者某个按键没能被输入法获取直接变成英文字母输入。

```
sudo pacman -S fcitx5-im # 输入法基础包组
sudo pacman -S fcitx5-chinese-addons # 官方中文输入引擎
sudo pacman -S fcitx5-mozc # 日文输入引擎
sudo pacman -S fcitx5-pinyin-moegirl # 萌娘百科词库。二刺猿必备（archlinuxcn）
```

- 在商店搜索 `Extension Manager`，安装蓝色图标的那个。

- 安装扩展：input method panel  
    https://extensions.gnome.org/extension/261/kimpanel/

- 编辑环境变量

```
sudo vim /etc/environment
```

```
XIM=fcitx # 解决 WeChat 可能用不了输入法的问题
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
XDG_CURRENT_DESKTOP=GNOME #解决某些软件里面输入法吞字的问题
```

- 卸载 fcitx5

1. 删除包

```
   sudo pacman -Rns fcitx5-im fcitx5-mozc fcitx5-rime rime-ice-pinyin-git
```

2. 删除残留文件

```
   sudo rm -rfv ~/.config/fcitx5 ~/.local/fcitx5
```

3. 清理环境变量

```
   sudo vim /etc/environment
```

4. 如果之前禁用过系统设置里的打字快捷键记得恢复

#### 自定义安装软件

下面是主包自己常装的一批软件，你可以按需裁剪。

**安装软件后没显示图标的话登出一次**

- pacman

```
  sudo pacman -S --needed mission-center gnome-text-editor gnome-disk-utility gnome-font-viewer loupe snapshot baobab celluloid fragments file-roller foliate chromium gst-plugin-pipewire gst-plugins-good pacman-contrib decibels papers
```

```
  mission-center 类似 Windows 11 的任务管理器，强烈推荐
  gnome-text-editor GNOME 标配记事本
  gnome-disk-utility 磁盘管理工具，可以调节分区大小和格式化分区等等
  gnome-font-viewer 方便安装和查看字体
  loupe 图片查看工具
  snapshot 相机，摄像头
  baobab 磁盘使用情况分析工具
  celluloid 是基于 mpv 的视频播放器
  fragments 是符合 GNOME 设计风格的种子下载器（也可换 qBittorrent）
  file-roller 压缩解压缩
  foliate 电子书阅读器
  chromium 是开源 Chromium 浏览器，兼容 Chrome 插件生态；偏好 Firefox 可自行替换
  gst-plugin-pipewire gst-plugins-good 对 GNOME 自带录屏有帮助，安装后建议登出一次
  pacman-contrib 提供 pacman 额外功能，比如 `checkupdates` 用于检查更新
  decibels 是可以显示波形的音频播放器，这只是个音频播放器，不是音乐播放器
```

- 从 AUR 安装常用软件（示例）

```bash
yay -S linuxqq-appimage wechat-appimage wps-office-cn wps-office-mui-zh-cn obsidian-appimage albert
```

```
  linuxqq Linux 版 QQ
  wechat-appimage 是 AppImage 版微信
  wps-office-cn 是 WPS
  wps-office-mui-zh-cn 是 WPS 中文语言包
  obsidian-appimage 是 Markdown 编辑器
```

- 关于 WPS 打开文件的问题  
  WPS 在 Linux 上可能出现“设置打开方式后仍无法通过双击打开文档”的问题。一般在设置里切换窗口管理模式，改成“多组件模式”后即可双击打开；之后再切回原来的模式通常也不影响文件打开。（Linux，很神奇吧）

- 关于字体：从网上下载常用办公字体后，解压并存放到 `~/.local/share/fonts`（建议分目录整理），然后刷新字体缓存：`fc-cache --force`。

- Flatpak 这一组都是比较实用的小工具，可以在商店搜，也可以直接命令安装。

```
  flatpak install flathub be.alexandervanhee.gradia io.github.Predidit.Kazumi io.gitlab.theevilskeleton.Upscaler com.github.unrud.VideoDownloader io.github.ilya_zlobintsev.LACT com.geeks3d.furmark io.github.flattool.Warehouse com.github.tchx84.Flatseal com.dec05eba.gpu_screen_recorder
```

```
  gradia 用于截图编辑
  kazumi 用于追番
  upscaler 用于图片超分
  video downloader 支持下载 YouTube/Bilibili 144p～8k 视频
```

- Gradia 可以对截图做文字、马赛克、图表、背景等轻编辑。设置自定义快捷键时可使用：`flatpak run be.alexandervanhee.gradia --screenshot=INTERACTIVE`。

#### 快捷键配置

路径：设置 > 键盘 > 查看与自定义快捷键。

- 导航

```
super+shift+数字键 #将窗口移到工作区
super+shift+A/D #将窗口左右移动工作区
super+shift+Q/E #移动到左/右工作区
PS：GNOME 默认 `Super + 鼠标滚轮上下` 可以切换工作区。
alt+tab #切换应用程序
alt+` #在应用程序的窗口之间切换窗口
```

- 截图

```
ctrl+alt+A #交互式截图
```

- 无障碍

```
屏幕阅读 禁用
```

- 窗口

```
super+Q #关闭窗口
super+F #切换最大化
super+alt+F #切换全屏
```

- 系统

```
ctrl+super+S #打开快速设置菜单
super+G #显示全部应用
```

- 自定义快捷键<快捷键> <命令>

```
super+B   chromium
super+T   ghostty
super+`    missioncenter
super+D   nautilus
ctrl+alt+S gnome-control-center
```

#### 功能性扩展

> 警告：GNOME 大版本更新时，扩展很可能大面积失效。遇到大版本更新，先禁用扩展再升级。

- 从商店安装蓝色的扩展管理器

```
flatpak install flathub com.mattjakeman.ExtensionManager
```

- AppIndicator and KStatusNotifierItem Support 面板上显示后台应用

- caffeine 防止熄屏

- lock keys 装 kazimieras.vaina 的那个。OSD 会显示大写锁定和小键盘锁定；设置里把指示器风格改成 `show/hide cap-locks only`

- Fuzzy Application Search 模糊搜索

- steal my focus window 如果打开窗口时窗口已经被打开则置顶

- tiling shell 窗口平铺。tiling shell 是布局式平铺；另一个 forge 更像 Hyprland 那种自动平铺，但在部分机器上会卡。主包更推荐 tiling shell。可自定义快捷键：`Super+W/A/S/D` 上下左右移动窗口，`Super+Alt+W/A/S/D` 上下左右扩展窗口，`Super+Z` 取消平铺，`Super+C` 窗口居中。

- tiling assistant 这个扩展提供最基础的四角平铺和上下左右半屏平铺功能。设置里 gaps 和 tiling shell 调成一样的，禁用 keybinds 里 general 一项的第 1/2/4 项，仅保留 restore window size。

- 可选：forge。如果你更喜欢无预设布局的自动平铺，可以安装 forge。装了 forge 就不要再装 tiling shell 和 tiling assistant 了。

- color picker 用来吸取屏幕颜色，对自定义很实用。

- Arch Linux Updates Indicator 在面板上显示一个和arch更新相关的图标。要安装pacman-contrib。设置取消始终显示，高级设置里命令改成

```
  ghostty -e sudo pacman -Syu
```

- quick settings tweaks 让右上角快速设置更合理：可把通知迁移到快速设置、缩小时间面板占位、把免打扰开关移到快速设置，还能单独调应用音量。扩展设置里 `menu` 页面有两项可开启：第一项让音量菜单悬浮显示，第二项增加动画。

- clipboard indicator 剪贴板历史。可在设置里把菜单快捷键改成 `Super+V`。

##### 睡眠到硬盘

硬盘上必须有交换空间才能睡眠到硬盘

- 添加 hook

```
sudo vim /etc/mkinitcpio.conf
```

```
在 `HOOKS()` 里添加 `resume`，注意要放在 `udev` 后面。
```

- 重新生成initramfs

```
sudo mkinitcpio -P
```

- reboot

```
reboot
```

- 使用命令进行睡眠

```
systemctl hibernate
```

##### open in any terminal

[GitHub - Stunkymonkey/nautilus-open-any-terminal](https://github.com/Stunkymonkey/nautilus-open-any-terminal)

这是一个在文件管理器“右键在此处打开终端”的功能

- 如果用的是ghostty

```
sudo pacman -S nautilus-python
```

- 其他终端仿真器

```
yay -S nautilus-open-any-terminal 
```

```
sudo glib-compile-schemas /usr/share/glib-2.0/schemas 
```

```
sudo pacman -S dconf-editor
```

```
修改配置，路径为/com/github/stunkymonkey/nautilus-open-any-terminal
```

重载nautilus

```
nautilus -q 
```

##### 性能模式切换工具 power-profiles-daemon

性能模式有三个档位：`performance`（性能）、`balanced`（平衡）、`power-saver`（省电）。日常一般用平衡档就够了。

```
sudo pacman -S power-profiles-daemon
```

```
sudo systemctl enable --now power-profiles-daemon 
```

##### 实用插件扩展

power tracker：显示电池充放电  
auto power profile：配合 power-profiles-daemon 自动切换模式  
power profile indicator：在面板显示当前模式

#### 安装优化

安装优化软件进行调整：

```
sudo pacman -S gnome-tweaks
```

在商店搜索 Refine，可开启更多缩放比例。

##### 显卡切换

更推荐使用 switcheroo-control 进行管理

```
sudo pacman -S --needed switcheroo-control
sudo systemctl enable --now switcheroo-control
```

这样可以在运行软件时右键选择使用哪个显卡运行

**另外的方法（不推荐）：**

ASUS 电脑可安装 supergfxctl 与对应扩展：

```
yay -S supergfxctl
```

安装扩展supergfxctl switch

#### 快照

**快照相当于恢复点，每次试验什么之前最好都创建一下快照**

```
sudo pacman -S snapper snap-pac btrfs-assistant 
```

```
snapper 是创建快照的主要程序
snap-pac 是利用钩子在进行一些pacman命令的时候自动创建快照
btrfs-assistant 是图形化管理btrfs和快照的软件
```

- 自动生成快照启动项

```
sudo pacman -S grub-btrfs inotify-tools
```

```
reboot
```

```
sudo systemctl enable --now grub-btrfsd
```

##### 具体使用方法

打开 btrfs-assistant，切到 Snapper Settings 页面。由于前面创建了 `@`（root）和 `@home`（home）两个子卷，所以需要分别建两个 config。之后在 Snapper 的 New/Delete 页面管理快照，在 Browse/Restore 页面选中快照后点 restore 即可恢复。若要同时快照 root 与 home，就分别创建并分别恢复。

## 系统维护与更新习惯

- 滚挂：Arch Linux 是滚动发行版（rolling release），新版本会持续推送，由用户自己管理更新。滚挂指更新后系统异常，常见原因是误操作、忽略公告、跨版本依赖冲突。通常普通软件更新问题不大；**但涉及 keyring、内核、驱动、固件、引导程序的更新要更谨慎**，可以先观望社区反馈再更新。反过来，长期不更新也会因为依赖断层导致软件不可用。

- 良好的使用习惯：Btrfs 已经很稳定，但仍建议谨慎操作。使用时遵循以下几点：

1. **别第一时间更新，也别长时间不更新；重要程序更新前创建快照；密钥相关更新多留意**
2. **明白自己的行为会造成怎样的后果；做不了解的事情前创建快照**
3. **定期清理较旧的快照，保持系统整洁，否则可能会导致硬盘整个被快照占满**

## 进阶美化与个性化配置

#### zsh

我们安装 zsh 替代 bash，并加几个实用插件。

```
sudo pacman -S zsh zsh-syntax-highlighting # zsh 与语法高亮插件
sudo pacman -S thefuck # 命令纠错工具，输错后执行 fuck 可获取建议命令
```

安装 starship 美化 zsh：

```
sudo pacman -S starship
```

更改账户的默认 Shell：

```
chsh -s /usr/bin/zsh # 修改当前账户的默认 Shell
```

关闭终端后重新打开，确认已经进入 zsh。然后创建并编辑 `.zshrc`：

```
vim ~/.zshrc
```

输入下面的内容：

```
HISTSIZE=10000
SAVEHIST=10000
HISTFILE=.zsh_history
setopt HIST_IGNORE_DUPS
eval "$(starship init zsh)"
eval $(thefuck --alias)
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
```

`starship` 更多主题可在官网查看。

#### 壁纸

安装扩展：

`Lock screen background`用于修改锁屏壁纸

`Blur my Shell`可以让黑边变为模糊效果，同时可以对窗口元素进行修改

##### 可选：动态壁纸

安装 `hidamari` 作为动态壁纸引擎，它支持把视频或网页设置为动态壁纸。

这个软件对性能有一定要求，低配电脑建议跳过这一步。

#### GRUB主题

使用 yay 安装 `grub-customizer`。

然后就可以快速设置你喜欢的主题了

#### 音乐播放器

由于网易云音乐的 Linux 官方客户端长期缺乏维护，这里使用第三方播放器 `netease-cloud-music-gtk4`。它是用 Rust 构建的轻量第三方网易云播放器，除了不能添加/编辑歌单以外，使用体验很好。

```
# archlinuxcn repo
sudo pacman -Syu --needed netease-cloud-music-gtk4
# AUR
yay -S netease-cloud-music-gtk4
```

这个播放器的缺点是 GNOME 下没有托盘，需要第三方 MPRIS 插件控制。主包这里用官方推荐的 `Media Controls`，你也可以直接用通知中心控制播放。

> 为什么不使用 `yesplaymusic`？
> 
> yesplaymusic 在使用时经常会出现账号风控的情况，较为不稳定，故这里不做推荐。

#### 游戏

现在 Steam 安装很简单，开启 32 位源后直接用 pacman 安装即可：

```
sudo pacman -S steam
```

如果要玩其他游戏，可以在 Steam 库中添加非 Steam 游戏的 `.exe`，然后在 `属性-兼容性` 勾选强制使用 Steam 运行时环境。主包用这套方法跑过 PVZ、魔裁等游戏，暂时没遇到明显异常。

## 收尾：给未来的你留一条回头路

如果你能看到这里，恭喜你：你已经不只是“把 Arch 装上了”，而是把一套可维护、可回滚、可持续折腾的工作流搭起来了。

最后给你一个收尾检查单，供你参考：

1. **网络可用**：`NetworkManager` 正常、重启后能自动联网。
2. **引导可用**：GRUB 能进 Linux，双系统用户能看到 Windows 启动项。
3. **驱动可用**：显卡驱动和硬件编解码正常，常用软件启动无异常。
4. **输入可用**：fcitx5 正常工作，常用应用不吞字。
5. **回滚可用**：Snapper / btrfs-assistant 可创建并恢复快照。
6. **更新有策略**：大版本与关键组件更新前先看公告、先做快照。

Linux 这条路的核心从来不是“永不翻车”，而是“翻车后能自己把车扶起来”。

祝你折腾顺利，系统稳定，少掉引导，少炸驱动，多写点自己的经验文档。
