---
title: "Arch Linux 脚本安装与 GNOME 桌面环境配置指南"

published: 2025-09-30
category: "技术分享"
tags: 
  - "arch-linux"
  - "linux"
  - "安装"
  - "操作系统"
  - "美化"
  - "配置"
image: "images/1759239147-arch-scaled.webp"
draft: false
---

## 前情提要

这是主包第三次装Arch Linux。先简单介绍一下前两次翻车的原因：

- **第一次安装：** 主包第一次安装的时候跟着网上的视频使用 `archinstall`脚本安装，大问题没有但是有不少小问题，不过凑合也能用。但是由于主包没有看arch wiki，把引导分区放在了windows磁盘，windows更新后引导项被篡改导致开不了机，并且那个时候不懂怎么抢救，索性重装了。

- **第二次安装：** 主包这次跟着[archlinux 简明指南](https://arch.icekylin.online/guide/)和[Archlinux-Gnome-FullGuide-ShorinArchExperience](https://github.com/shorinkiwata/Archlinux-Gnome-FullGuide-ShorinArchExperience/tree/main)两篇文档并参考[Arch Wiki](https://wiki.archlinux.org/)手动安装了一遍，但是由于主包当时没有记录好自己都安装了些什么，导致各种掉引导、掉驱动、掉声音、掉网络之类的问题，始终解决不掉。主包于是决定这次重装把自己的所有安装过程全部记录下来：如果成功了可以给其他想入坑 Arch 的萌新参考，失败也方便复盘查找原因。

本文的主干部分源自[archlinux 简明指南](https://arch.icekylin.online/guide/)和[Archlinux-Gnome-FullGuide-ShorinArchExperience](https://github.com/shorinkiwata/Archlinux-Gnome-FullGuide-ShorinArchExperience/tree/main)两篇文档，并补充主包自己安装过程中与指南不一样的部分。由于主包使用实体机安装，拍照效果不好，在安装部分不会有任何我自己的图片，如果有也是从[archlinux 简明指南](https://arch.icekylin.online/guide/)上拿过来的（后期在虚拟机上重装一遍后补上也说不定（））。

## 前期准备

### 解决双系统导致的时间错乱

安装双系统的机器在 Linux 使用一段时间后切换回 Windows 就会出现时间错乱的情况，这是因为两个系统对硬件时钟的处理方式不同（[CSDN博客：双系统时间不一致解决方案](https://blog.csdn.net/zhouchen1998/article/details/108893660)）。

在 Windows 中以管理员身份运行 PowerShell，输入下面的命令：

```
Reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1
```

这样就能解决两个系统时间不同步的问题。

### 准备安装启动盘

我们需要一个大小不少于8G且没有重要数据的U盘（U盘在制作启动盘时会被格式化，切记提前备份数据！）用来存放系统镜像，常用的这类工具有不少，这里我们以[Ventoy](https://www.ventoy.net/cn/index.html)为例。

用这种方法的好处是在安装后如果出现系统级的崩溃和错误，连tty都无法进入时可以用安装镜像修复系统错误或者抢救数据。并且Ventoy在一次准备后可以存放多个系统镜像，把windows安装媒介和PE都放进去，实在是居家旅行必备良品（雾）。

Ventoy的具体使用方法参考官网教程或者网上其他文档，没有什么难度，这里不过多介绍。

> Arch Linux会在每个月1号发布最新的安装镜像，由于Arch滚动更新没有版本一说，请尽可能保证你的镜像是你能拿到的最新的镜像，否则可能出现一些奇怪的错误。

### vi 基础操作说明

vi 是命令行中使用的一种文本编辑器，vim、neovim 等编辑器的操作也和 vi 类似。vi 是大部分 Linux 系统安装过程中或多或少会用到的编辑器（一般默认为 vi，不过推荐安装 vim 或 neovim 代替 vi），这里简单介绍一些常用的操作，详细文档读者可以自行查找。

`i` 键在当前光标进入编辑模式，注意编辑模式中所有指令失效变成正常输入

`shift+a` 大写A进入当前行末尾并进入编辑模式

`esc` 编辑模式下按下 `esc`退出编辑模式

`yy` 两个y复制当前行

`dd` 两个d剪切当前行

`p` 键粘贴

`:q` 冒号小写q，退出

`:w` 冒号小写w，写入

`:wq` 冒号小写wq保存并退出

这里的冒号都是英文冒号，中文冒号不会被识别

`/` 查找接下来输入的文本

### 记好笔记

搞清楚自己曾经做过什么！用文档把你每步操作记录下来！

搞清楚自己曾经做过什么！用文档把你每步操作记录下来！

搞清楚自己曾经做过什么！用文档把你每步操作记录下来！

不然你为什么会看到这篇文档呢（笑）

## 基础脚本安装

### 1.连接网络

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

#退出iwctl
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

### 2.使用archinstall安装

接下来输入 `archinstall`回车进入安装配置tui界面

```
archinstall
```

第一项是脚本语言，第二项是系统本地化，保持英文就行，改了会乱码，直接看第三项。

#### Mirrors and repositories 设置镜像源

1. 选择第一项 `Select regions` 设置自己的所在地。加载会比较慢，耐心等一等。
2. 选择第三项 `optional repositories`，回车激活 `multilib`（32 位程序的源）。

#### Disk configuration 磁盘分区

选择 partitioning 进入磁盘分区。

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

这一步是自动帮你配置zram交换空间，yes开启即可。

#### Bootloader引导系统

最常用的是Grub，选Grub就行。有其他需求可以自己网上查找。

#### Hostname主机名

不用改，你想要改成其他名字也行

#### Authentication身份认证

- Root password设置管理员密码

- User account > Add a user 创建普通用户 Should "xxx" be a superuser(sudo)是问你要不要给这个用户管理员权限，选yes就行。

- U2F login setup这个是物理密钥，有需要的自行设置

#### Profile

这里可以选择自动安装桌面、最小化安装等等。都选择用archinstall自动安装系统那，那就顺便自动安装一下桌面吧。如果不知道自己想安装哪个就从Gnome和KDE Plasma里随便选一个。KDE更符合windows用户的直觉，系统占用更低，个性化起来更方便，多显示器支持更好。Gnome的中文输入法体验更好，更符合mac用户的直觉，外观更好看，更流畅，更简洁，更稳定。

- Type > Desktop > 想安装的桌面环境或者窗口管理器

- Graphics driver（自动安装显卡驱动） amd选AMD/ATi (opensource) nvidia去[CodeNames · freedesktop.org](https://nouveau.freedesktop.org/CodeNames.html)这个页面搜索你的显卡型号，确认对应的NV family；NV160以后的显卡选Nvidia (open kernel module …)；NV110~NV160的选Nvidia (proprietary)，再往前的选Nvidia (open-source nouveau …)

不过这里的桌面环境会附带很多无用软件，比较臃肿，建议最小化安装后手动配置，你都用archinstall帮你做了这么多杂活了自己配置一下桌面环境也没关系吧（笑）

#### Applications（蓝牙和音视频）

- Bluetooth > Yes 自动安装蓝牙

- Audio > pipewire 自动安装音视频服务 pipewire是新技术，兼容旧的pulseautio等服务，选pipewire就行了。
- Audio > pipewire 自动安装音视频服务。pipewire 是新方案，兼容旧的 pulseaudio 等服务，选 pipewire 就行。

#### Kernel（系统内核）

tab键选择。要续航选linux，要性能选linux-zen，其他选项有兴趣可以自己查询。

#### Network configuration （网络配置）

选第三项 NetworkManager，因为跟Gnome和KDE Plasma深度集成。有别的需求自行查找。

#### Additional packages（自定义安装其他软件包）

/左斜杠键进行搜索，tab键选择。

必须安装：vim（任意文本编辑器）、os-prober（双系统需要）

如果你安装了其他内核，比如我使用 linux-zen，可以把头文件 `linux-zen-headers` 勾选上。

可选安装中文字体：wqy-zenhei（文泉驿字体）、noto-fonts（谷歌开源字体）、noto-fonts-emoji（表情）

#### Timezone（时区）

左斜杠键搜索Shanghai，这里没有北京，不要找北京了。

#### Automatic time sync (NTP) （自动启用网络时间同步）

默认开启，不用修改

#### Install

选择install安装

### 3.双系统

安装完成后配置 Windows 和 Linux 的双系统。

1. 选择 exit archinstall，退出 archinstall。
2. 挂载 Windows 的 EFI 启动分区（ESP，FAT32）。

```
   lsblk -pf #列出当前分区情况
```

找到 Windows 所在磁盘上的 EFI System Partition（FAT32，常见类似 `nvme0n1p1`/`nvme1n1p1`）。可以用 `fdisk -l`（小写字母 l）查看更详细的分区信息。找到后挂载到 `/mnt` 下的任意一个目录，比如 `/mnt/winboot`。

```
   mount /dev/nvme1n1p1 /mnt/winboot 
```

3. arch-chroot

```
   arch-chroot /mnt #进入刚刚安装的系统
```

4. 编辑 grub 配置启用 os-prober

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

7. 生成 grub 的配置文件

```
   grub-mkconfig -o /boot/grub/grub.cfg
```

8. exit 退出 chroot
9. reboot 重启
10. 如有需要，进入 BIOS/UEFI 调整启动项顺序。

## 安装桌面环境

### 网络连接

设置开机自启并立即启动 `NetworkManager` 服务：

```
systemctl enable --now NetworkManager
```

若为无线连接，则需要在启动 `NetworkManager` 后使用 `nmtui` 连接网络：

```
nmtui
```

### 可选：安装fastfetch

`fastfetch` 可以将系统信息和发行版 logo 一并打印出来。通过 `pacman` 安装 `fastfetch`：

```
pacman -S fastfetch
```

### 显卡驱动和硬件编解码

以4060和780m为例

参考链接：[NVIDIA - ArchWiki](https://wiki.archlinux.org/title/NVIDIA)、[AMDGPU](https://wiki.archlinux.org/title/AMDGPU)

#### 检查头文件

```
sudo pacman -S linux-zen-headers
```

linux替换为自己的内核，比如zen内核是linux-zen-headers

#### 安装显卡驱动

- intel核显

```
sudo pacman -S mesa lib32-mesa vulkan-intel lib32-vulkan-intel
```

- Nvidia

``` 
sudo pacman -S --needed nvidia-dkms nvidia-settings nvidia-utils lib32-nvidia-utils
```

显卡驱动的选择：先在[CodeNames · freedesktop.org](https://nouveau.freedesktop.org/CodeNames.html)搜索自己的显卡，确认对应的 family；然后在[NVIDIA - ArchWiki](https://wiki.archlinux.org/title/NVIDIA)查对应驱动。NV160 family 往后的显卡通常可用 `nvidia-open`；NV110~NV190 如果 `nvidia-open` 表现不佳可以使用 `nvidia`。注意：非 stable 内核要安装的驱动包可能不同，具体看 wiki，例如 zen 内核常见是 `nvidia-open-dkms`。

- AMD A卡不需要自己安装驱动，检查一下vulkan驱动就行

```
  sudo pacman -S --needed vulkan-radeon vulkan-mesa-layers
```

#### 硬件编解码

- nvidia

```
  sudo pacman -S libva-nvidia-driver
```

- amd 自带无需额外安装

- 重启激活显卡驱动和字体

```
  reboot 
```

### GNOME

#### 安装gnome最小环境

```
sudo pacman -S --needed gnome-shell gdm gnome-control-center gnome-software flatpak
```

终端模拟器可按需安装（例如 `ghostty`/`gnome-console` 等）。

如果在安装音频相关组件时提示选择 JACK provider，一般选择 `pipewire-jack`。

```
gnome-shell GNOME 桌面最小核心
gdm 是显示管理器(gnome display manager)
ghostty 是一个可高度自定义的终端模拟器（terminal emulator)
gnome-control-center 是设置中心
gnome-software 是软件商城
flatpak 是flatpak软件，这是一种全发行版通用的软件打包形式，通常flatpak软件是最好用的
```

- 临时开启GDM

```
systemctl start gdm 
```

- 正常开启后设置gdm开机自启

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

#### 配置archlinuxcn源

这里我们准备好 `archlinuxcn`源，我们的代理工具和aur助手都需要从这里安装。

aur上面很多包没有代理是无法下载的，所以一定要先配置好代理。

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

安装代理软件clash-verge-rev和aur助手yay

> paru也是一个aur助手，但是会出现有些软件无法安装的情况，所以建议还是用yay。并且最好不要混用不同aur助手。

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

#### 配置flatpak源

如果flatpak没速度或者加载不出来的话更换flatpak国内源

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

- 商店搜索extension，安装蓝色的extensionmanager

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

- 卸载fcitx5

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

这是我会安装的，你可以按自己的需求安装

**安装软件后没显示图标的话登出一次**

- pacman

```
  sudo pacman -S --needed mission-center gnome-text-editor gnome-disk-utility gnome-font-viewer loupe snapshot baobab celluloid fragments file-roller foliate chromium gst-plugin-pipewire gst-plugins-good pacman-contrib decibels papers
```

```
  mission-center 类似win11的任务管理器，强烈推荐
  gnome-text-editor gnome标配记事本
  gnome-disk-utility 磁盘管理工具，可以调节分区大小和格式化分区等等
  gnome-font-viewer 方便安装和查看字体
  loupe 图片查看工具
  snapshot 相机，摄像头
  baobab 磁盘使用情况分析工具
  celluloid 是基于mpv的视频播放器
  fragments 是符合gnome设计理念的种子下载器，或者安装qtbittorrent
  file-roller 压缩解压缩
  foliate 电子书阅读器
  chromium 开源的chrome浏览器核心，兼容所有chrome插件生态。如果你喜欢firefox可以自行替换
  gst-plugin-pipewire gst-plugins-good 是gnome截图工具自带的录屏，需登出一次
  pacman-contrib 提供pacman的一些额外功能，比如checkupdates用来检查更新
  decibels 是可以显示波形的音频播放器，这只是个音频播放器，不是音乐播放器
```

- 从 AUR 安装常用软件（示例）

```bash
yay -S linuxqq-appimage wechat-appimage wps-office-cn wps-office-mui-zh-cn obsidian-appimage albert
```

```
  linuxqq linux版qq
  wechat-appimage 是appimage版微信
  wps-office-cn 是wps
  wps-office-mui-zh-cn 是wps的中文语言包
  obsidian-appimage 是markdown编辑器
```

- 关于 WPS 打开文件的问题  
  WPS 在 Linux 上可能出现“设置打开方式后仍无法通过双击打开文档”的问题。一般在设置里切换窗口管理模式，改成“多组件模式”后即可双击打开；之后再切回原来的模式通常也不影响文件打开。（Linux，很神奇吧）

- 关于字体 从网上搜索常用办公字体，下载解压后存放到 `~/.local/share/fonts`里面（在这个目录下新建文件夹整理字体文件）。放进去之后刷新字体缓存 。 `fc-cache --force`

- flatpak 这里都是些有趣或者实用的工具，可以从商店搜索安装，也可以用命令

```
  flatpak install flathub be.alexandervanhee.gradia io.github.Predidit.Kazumi io.gitlab.theevilskeleton.Upscaler com.github.unrud.VideoDownloader io.github.ilya_zlobintsev.LACT com.geeks3d.furmark io.github.flattool.Warehouse com.github.tchx84.Flatseal com.dec05eba.gpu_screen_recorder
```

```
  gradia编辑截图
  kazumi追番
  upscaler图片超分
  video downloader下载youtube/bilibili 144p～8k视频
```

- gradia可以对截图进行一些简单的添加文字、马赛克、图表、背景之类的操作 使用方法： 设置自定义快捷键的时候命令写 `flatpak run be.alexandervanhee.gradia --screenshot=INTERACTIVE`

#### 快捷键配置

设置>键盘>查看自定义快捷键

- 导航

```
super+shift+数字键 #将窗口移到工作区
super+shift+A/D #将窗口左右移动工作区
super+shift+Q/E #移动到左/右工作区
ps：gnome默认super+滚轮上下可以左右切换工作区
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

> ⚠️ 警告：扩展在gnome桌面环境大版本更新的时候大概率会大面积失效，如果出现gnome桌面环境的大版本更新，一定要先关闭所有扩展，谨慎行事

- 从商店安装蓝色的扩展管理器

```
flatpak install flathub com.mattjakeman.ExtensionManager
```

- AppIndicator and KStatusNotifierItem Support 面板上显示后台应用

- caffeine 防止熄屏

- lock keys 装kazimieras.vaina的那个。osd显示大写锁定和小键盘锁定。设置里把指示器风格改成show/hide cap-locks only

- Fuzzy Application Search 模糊搜索

- steal my focus window 如果打开窗口时窗口已经被打开则置顶

- tiling shell 窗口平铺，tilingshell是用布局平铺,另一个叫forge是hyprland那种自动平铺但是很卡。推荐用tilingshell，记得自定义快捷键，我快捷键是super+w/a/s/d对应上下左右移动窗口，Super+Alt+w/a/s/d对应上下左右扩展窗口，super+Z取消平铺，super+C把窗口移动到屏幕中心

- tiling assistant 这个扩展提供最基础的四角平铺和上下左右半屏平铺功能。设置里 gaps 和 tiling shell 调成一样的，禁用 keybinds 里 general 一项的第 1/2/4 项，仅保留 restore window size。

- 可选：forge 如果你更喜欢窗口管理器那样无预设布局的自动平铺功能，可以安装 forge。装了这个就不要装 tiling shell 和 tiling assistant 了。我没有深入用过这个扩展，所以设置部分就自己探索吧。

- color picker 获取屏幕上的颜色，对自定义非常有用

- Arch Linux Updates Indicator 在面板上显示一个和arch更新相关的图标。要安装pacman-contrib。设置取消始终显示，高级设置里命令改成

```
  ghostty -e sudo pacman -Syu
```

- quick settings tweaks 让右上角的快速设置面板变得更合理。包括把通知从时间面板移动到快速设置面板，缩小时间面板的占地面积，免打扰模式开关按钮移动到快速设置面板，允许调整单个应用的声音大小等等。 扩展设置的menu页面的两项可以激活，第一项让声音调整菜单以悬浮的方式显示出来，第二项给这个功能增加动画，很酷。

- clipboard indicator 剪贴板历史。设置里设置super+v切换菜单

##### 睡眠到硬盘

硬盘上必须有交换空间才能睡眠到硬盘

- 添加hook

```
sudo vim /etc/mkinitcpio.conf
```

```
在HOOKS()内添加resume,注意需要添加在udev的后面
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

性能模式切换，有三个档位，performance性能、balance平衡、powersave节电。一般平衡档位就够用了，也不需要调节风扇什么的。

```
sudo pacman -S power-profiles-daemon
```

```
sudo systemctl enable --now power-profiles-daemon 
```

##### 实用插件扩展

power tracker 显示电池充放电  
auto power profile 配合powerProfilesDaemon使用，可以自动切换模式  
power profile indicator 配合powerProfilesDaemon使用，面板显示当前模式

#### 安装优化

安装优化软件进行调整：

```
sudo pacman -S gnome-tweaks
```

在商店搜索refine设置更多缩放比例

##### 显卡切换

更推荐使用 switcheroo-control 进行管理

```
sudo pacman -S --needed switcheroo-control
sudo systemctl enable --now switcheroo-control
```

这样可以在运行软件时右键选择使用哪个显卡运行

**另外的方法（不推荐）：**

asus的电脑安装supergfxctl和扩展：

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

打开btrfs assistant，切换到snapper settings页面。我们创建子卷的时候创建了一个@（root）子卷和一个@home（home）子卷，所以需要两个config（配置）。创建一个root配置，再创建一个home配置。然后到snapper页面下的New/Delete页面就可以新建和管理快照了，Browse/Restore页面选中快照后点restore可以恢复到那个快照的状态。如果你要同时快照root和home的话就分别创建一个root快照和home快照，恢复的时候各自恢复就行了。

#### 关于滚挂和良好的系统使用习惯

- 滚挂 archlinux是滚动发行版。滚动是英文直译，原词是rolling，指一种推送更新的方式，只要有新版本就会推送，由用户管理更新。对应的另一种更新方式是定期更新一个大版本，例如fedora是六个月一更新，由发行方管理更新。 滚挂，指的是滚动更新的发行版因为更新导致系统异常。这通常是用户操作不当、忽略官方公告等原因导致的。只要学习一下正确的更新方式和快照的使用方法就不用担心滚挂问题。 通常软件更新不用担心。**出现密钥（keyring）、内核、驱动、固件、引导程序之类的更新要留个心眼，先不第一时间更新，等一手社区或者官方消息。** 另一个重点是滚动更新的发行版的软件通常会适配最新的依赖，如果长期不更新可能会无法使用软件。

- 良好的使用习惯 btrfs 文件系统已经足够稳定，但仍建议谨慎操作。使用时遵循以下几点：

1. **别第一时间更新，也别长时间不更新；重要程序更新前创建快照；密钥相关更新多留意**
2. **明白自己的行为会造成怎样的后果；做不了解的事情前创建快照**
3. **定期清理较旧的快照，保持系统整洁，否则可能会导致硬盘整个被快照占满**

### 进阶美化与个性化配置

#### zsh

我们安装zsh来代替bash，并添加一些插件使其更加好用

```
sudo pacman -S zsh zsh-syntax-highlighting # zsh和zsh语法高亮插件
sudo pacman -S thefuck # thefuck 是一个纠错工具，在输入错误命令后输入fuck回车即可得到建议命令
```

安装starship对zsh进行美化

```
sudo pacman -S starship
```

更改账户的默认 Shell：

```
chsh -s /usr/bin/zsh # 修改当前账户的默认 Shell
```

关闭终端模拟器后重新打开，应该就已经开始使用zsh了，回车后创建 `.zshrc`文件并编辑：

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

`starship`的更多主题可以前往官方网站自行寻找

#### 壁纸

安装扩展：

`Lock screen background`用于修改锁屏壁纸

`Blur my Shell`可以让黑边变为模糊效果，同时可以对窗口元素进行修改

##### 可选：动态壁纸

安装 `hidamari`作为动态壁纸引擎，这是一个支持使用视频和网页设置为动态壁纸的软件。

这个软件对性能有一定要求，低配电脑建议跳过这一步。

#### GRUB主题

使用yay安装 `grub-customizer`

然后就可以快速设置你喜欢的主题了

#### 音乐播放器

由于网易云音乐的 Linux 官方客户端长期缺乏维护，这里使用第三方播放器 `netease-cloud-music-gtk4`。它是用 Rust 构建的轻量第三方网易云播放器，除了不能添加/编辑歌单以外，使用体验很好。

```
# archlinuxcn repo
sudo pacman -Syu --needed netease-cloud-music-gtk4
# AUR
yay -S netease-cloud-music-gtk4
```

不过这个播放器的缺点是在gnome上没有实现托盘，需要使用第三方Mpris 插件来控制，这里我使用官方推荐的 `Media Controls`插件。或者你也可以用通知中心来控制音乐播放。

> 为什么不使用 `yesplaymusic`？
> 
> yesplaymusic 在使用时经常会出现账号风控的情况，较为不稳定，故这里不做推荐。

#### 游戏

现在steam的安装已经非常容易了，在开启32位源的情况下直接使用pacman安装即可：

```
sudo pacman -S steam
```

如果要玩其他游戏，可以在steam库中添加非steam游戏的exe文件，然后在`属性-兼容性`中勾选强制使用steam运行时环境，即可快乐启动。主包已经用此方法玩了pvz、魔裁等游戏，没有发现异常。
