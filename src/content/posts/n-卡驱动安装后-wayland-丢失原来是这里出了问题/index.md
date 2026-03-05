---
title: "N 卡驱动安装后 Wayland 丢失？显示器不亮？原来是这里出了问题"
published: 2026-02-28 08:59
description: "Debian 13 安装 NVIDIA 闭源驱动后 Wayland 选项消失？本文记录 GDM 场景下的排查思路、修复步骤与回滚方法，快速恢复 Wayland 登录。"
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

### Part 2：开启内核模式设置 (DRM KMS) —— **最核心的解决方案**

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

## 碎碎念

1. 不同发行版该文件可能不在 `/usr/lib/udev/rules.d/`，请根据实际情况调整路径。
2. 如果你不是 GDM（比如 KDE + SDDM），这篇的做法可能不适用。
3. 这类问题和驱动版本、内核版本、桌面环境版本都有关系，升级后可能再次出现。

## 结尾

以上就是主包这次的踩坑记录。文章不长，但希望能帮你在遇到同样问题时少查半天资料。

如果你有更稳的处理方式（比如更优雅的规则覆盖方案），欢迎留言交流。