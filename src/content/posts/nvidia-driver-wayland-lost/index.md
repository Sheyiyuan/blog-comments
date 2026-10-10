---
title: "N 卡驱动安装后 Wayland 丢失？显示器不亮？原来是这里出了问题"
published: 2026-02-28 08:59
updated: 2026-03-17 14:56
description: "Debian 13 安装 NVIDIA 闭源驱动后 Wayland 选项消失、外接显示器不亮？本文记录 GDM 场景下的排查、修复与内核升级后 DKMS 失效的解决方案。"
image: "images/nvidia.jpg"
firstLineIndent: "0em"
tags:
    - Debian
    - Linux
    - NVIDIA
    - Fucking NVIDIA
    - Wayland
    - GDM
    - Xorg
    - 显卡驱动
    - 显示器
    - 多显示器
    - 故障排查
category: "技术分享"
draft: false
pin: 0
lang: ""
comments: true
sponsor: true
---

> 本文基于 Debian 13 + GDM 场景整理，不同发行版、不同显示管理器（如 SDDM、LightDM）路径和行为可能不同。
> 
> 下面涉及系统级文件修改，请务必先备份，再操作。相关操作具有一定风险：如果你不理解每一步在做什么，请先停下来查资料或找有经验的人协助。
>
> 因未理解本文内容而盲目操作造成的损失，作者概不负责。

主包这两天用 PyTorch 测试实验室用的小模型，然后发现的的笔记本（Debian 13）没有安装闭源的 NVIDIA 驱动，跑不了 CUDA 相关的功能。于是就安装了 NVIDIA 驱动，结果安装完成后发现 Wayland 不见了，登录界面也变成了 Xorg 的了，并且登陆页的 Wayland 选项也不见了，无法选择 Wayland 了。

那么出现这种情况，有经验的 Linux 用户肯定知道，百分之一百亿是 f**ing NVIDIA 的问题了。为了让后面遇到同样问题的朋友少走一点弯路，主包把这次排查和解决过程整理成一篇短文。

## 问题现象

安装 NVIDIA 闭源驱动后，主包这里出现了这些现象：

- 登录界面默认只有 Xorg 会话
- Wayland 选项从登录页消失
- GNOME 会话退回 X11

简单说就是：驱动装上了，CUDA 能用了，但 Wayland 没了。

## 原因简析

在 GNOME + GDM 环境下，NVIDIA 驱动安装后有概率触发 GDM 的“禁用 Wayland”逻辑。常见表现是某些规则文件被替换或生效，导致 GDM 启动时直接把 Wayland 屏蔽掉。

这不是每台机器都会中招，但一旦中招，症状通常都很一致：登录页没有 Wayland 可选。

## 解决方法

### Part 1：解除 GDM 对 Wayland 的屏蔽

我这里用的是把相关规则文件先备份掉，再重启验证。

```bash
# 备份会影响 GDM/Wayland 的规则文件（路径可能因系统而异）
sudo mv /usr/lib/udev/rules.d/61-gdm.rules /usr/lib/udev/rules.d/61-gdm.rules.bak
```

重启后回到登录界面，Wayland 选项就恢复了，能够正常选择并进入 Wayland 会话。

如果你操作后出现异常，直接把文件改回去后重启电脑即可：

```bash
sudo mv /usr/lib/udev/rules.d/61-gdm.rules.bak /usr/lib/udev/rules.d/61-gdm.rules
```

### 外界显示屏无法在 Wayland 会话下显示的问题

正当主包成功恢复了 Wayland 选项并进入了 Wayland 会话后，又遇到这样一个问题：**外界显示屏无法在 Wayland 会话下显示，但在 X 会话下一切正常。** 

这是因为 NVIDIA 驱动需要通过 DRM (Direct Rendering Manager) 接口与 Wayland 通信，但这在默认情况下往往未启用。遇到这种问题可以参考下面的 Part 2 进行解决。

### Part 2：开启内核模式设置 (DRM KMS) —— 外接显示器在 Wayland 下不亮的核心解决方案

这是解决外接显示器不亮最关键的一步。

1.  **编辑 GRUB 配置**：
    打开终端，编辑 GRUB 配置文件：
    ```bash
    sudo nano /etc/default/grub
    ```

2.  **修改内核参数**：
    找到 `GRUB_CMDLINE_LINUX_DEFAULT` 这一行，在引号内添加 `nvidia-drm.modeset=1`。
    例如：
    ```text
    GRUB_CMDLINE_LINUX_DEFAULT="quiet splash nvidia-drm.modeset=1"
    ```
    *(注意：如果你的电脑也是笔记本且支持 Optimus，有时还需要加上 `nvidia-drm.fbdev=1`，这在较新的驱动中能提升体验)*

3.  **更新 GRUB 并重启**：
    *   **Debian/Ubuntu/Mint/Kali**:
        ```bash
        sudo update-grub
        ```
    *   **Fedora/RHEL/CentOS**:
        ```bash
        sudo grub2-mkconfig -o /boot/grub2/grub.cfg
        ```
    *   **Arch Linux**:
        ```bash
        sudo grub-mkconfig -o /boot/grub/grub.cfg
        ```

    **重启电脑**，然后进入 Wayland 会话测试。

## 这次额外踩到的另一个坑：内核升级后 NVIDIA 驱动失效

本来事情到这里已经结束了，结果主包后面又踩了一个更典型的 NVIDIA 坑：**重启之后外接显示器再次不可用，同时 `nvidia-smi` 直接报错。**

报错大概长这样：

```bash
NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.
```

这个现象通常说明当前运行内核对应的 NVIDIA 内核模块没有成功加载。

### 当时的实际情况

检查后发现，系统当前运行的内核已经变成了新版本，例如：

```bash
uname -r
# 6.12.73+deb13-amd64
```

但 `dkms status` 里，NVIDIA 模块只给旧内核编译过，例如：

```bash
nvidia-current/550.163.01, 6.12.63+deb13-amd64, x86_64: installed
```

也就是说：

- 用户态 NVIDIA 包其实都还在
- CUDA 相关库也在
- 但**当前内核没有对应的 NVIDIA DKMS 模块**
- 所以 `nvidia-smi` 无法通信
- 外接显示器自然也跟着失效

这类问题在 Debian 上并不少见，本质上就是：

> **内核升级了，但 NVIDIA DKMS 没有给新内核重新编译成功。**

---

## 对应修复方法

如果你也遇到了下面这组症状：

- 外接显示器突然不可用
- `nvidia-smi` 报无法与驱动通信
- `dkms status` 里只有旧内核版本的 NVIDIA 模块

那么可以尝试下面这组命令：

```bash
sudo apt update
sudo apt install -y build-essential dkms linux-headers-$(uname -r)
sudo apt install --reinstall -y nvidia-kernel-dkms nvidia-driver
sudo dkms autoinstall -k $(uname -r)
sudo update-initramfs -u -k $(uname -r)
sudo reboot
```

修复完成后，可以用下面这些命令确认状态：

```bash
dkms status
lsmod | grep nvidia
nvidia-smi
lspci -k | grep -A3 -E 'VGA|3D'
```

如果一切正常，你应该能看到：

- 当前内核版本对应的 `nvidia-current` 已安装
- `lsmod` 里出现 `nvidia`
- `nvidia-smi` 正常返回显卡信息
- `lspci -k` 中 NVIDIA 设备显示 `Kernel driver in use: nvidia`

---

## 碎碎念 / 注意事项

1. **不同发行版路径可能不同。**  
   本文里提到的 `61-gdm.rules` 路径，在你的系统里不一定正好一致，操作前请先确认。

2. **如果你不是 GDM，这篇方法可能不适用。**  
   比如 KDE + SDDM、XFCE + LightDM，行为和处理方式都可能不同。

3. **NVIDIA、内核、GNOME、GDM 的版本组合很重要。**  
   同一套操作，不同版本组合下结果可能完全不同。系统升级之后，问题也可能再次出现。

4. **如果 `nvidia-smi` 报错，优先检查 DKMS。**  
   特别是内核升级后，第一时间看：
   ```bash
   uname -r
   dkms status
   ```
   很多时候你会发现，问题根本不在桌面环境，而在于 **NVIDIA 内核模块压根没给当前内核编出来**。

## 结尾

以上就是主包这次的踩坑记录。文章不长，但希望能帮你在遇到同样问题时少查半天资料。

如果你有更稳的处理方式（比如更优雅的规则覆盖方案），欢迎留言交流。
