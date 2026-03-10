---
title: "Rocky Linux 服务器开荒记"
published: 2025-10-20 09:57
description: ""
image: "image/rocky-linux.png"
firstLineIndent: "0em"
tags: 
    - "Linux"
    - "Rocky Linux"
    - "服务器"
    - "运维"
    - "SSH"
    - "Docker"
    - "1Panel"
    - "Caddy"
    - "WordPress"
    - "迁移"
category: "技术分享"
draft: false
pin: 0
lang: ""
comments: true
sponsor: true
---

最近搞了一台新的服务器，打算尝试一下红帽系的发行版，在查了一些资料之后，选择了 Rocky Linux。

### SSH登陆安全设置
#### 创建普通用户
拿到服务器的第一件事就是创建一个非 root 用户。

```bash
# 创建用户
useradd -md /home/syy -s /bin/bash syy
# 创建一个 home 目录位于 /home/syy，shell 为 bash 的用户 syy

# 设置密码
passwd syy

# 将用户添加到 wheel 组给予管理员权限
usermod -aG wheel syy

# 登陆到新用户
su syy
cd ~
```

#### 禁用 root 用户的 SSH

然后我们禁用 root 用户的 SSH。
```
sudo vim /etc/ssh/sshd_config
```

在文件中找到 `PermitRootLogin` 一行，取消注释并修改其值为 `no`，保存并退出后重启 SSH 服务。

```bash
sudo systemctl restart sshd
```

### 基础软件安装

#### 基本软件

接下来我们来装一些常用的软件。
```bash
# 更新 dnf 并启用 epel 仓库
sudo dnf install epel-release

# 安装常用软件
sudo dnf install git wget screen tmux lsof
```

#### Docker
##### 设置 Docker 官方软件源
首先安装用于添加 https 源的依赖。

```bash
sudo dnf install dnf-utils device-mapper-persistent-data lvm2
```

添加 docker 官方的 yum 源。

```bash
sudo dnf config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
```

##### 安装并启用服务
安装 docker 引擎和运行时，并启动守护进程。
```bash
sudo dnf install docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
```

#### 1Panel
接下来我们安装一个 1Panel 面板。

```bash
sudo bash -c "$(curl -sSL https://resource.fit2cloud.com/1panel/package/v2/quick_start.sh)"
```

#### 安装反向代理 caddy

这里使用 caddy 是因为 caddy 的性能对于个人场景完全够用，并且可以**自动续签免费 SSL 证书**（不是自签），主打一个省心。

```bash
sudo dnf install 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy
sudo dnf install caddy
```

#### WordPress迁移
参考 [这篇文章](https://www.cnblogs.com/linux-xiaofeixiang/p/18946019)。

简单来说就是在原来的网站安装一个名为 `All-in-One WP Migration and Backup` 的插件，然后导出一个 `.wpress` 文件。然后我们在新的网站上安装同样的插件导入。

可能有些同学发现这里有大小限制，但是没有什么关系，这里我们只需要修改文件提高大小限制即可。具体方法如下。

1. `.htaccess` 文件修改（`/var/www/html/wordpress/.htaccess`）增加如下配置：

```text
php_value upload_max_filesize 1024M 
php_value post_max_size 1024M 
php_value memory_limit 1024M 
php_value max_execution_time 300 
php_value max_input_time 300
```

上面配置需要加在 BEGIN和END行之间。

2. `wp-config.php` 修改，增加如下配置：

```php
@ini_set( 'upload_max_filesize' , '1024M' );
@ini_set( 'post_max_size', '1024M');
@ini_set( 'memory_limit', '1024M' );
@ini_set( 'max_execution_time', '300' );
@ini_set( 'max_input_time', '300' );
```

上面配置需要加在 `require_once ABSPATH . 'wp-settings.php';` 行上方。

修改完配置后，重新导入就可以了。

