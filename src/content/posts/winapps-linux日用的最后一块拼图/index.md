---
title: "WinApps——Linux日用的最后一块拼图"

published: 2025-10-07
category: "技术分享"
tags: 
  - "arch-linux"
  - "kvm"
  - "linux"
  - "photoshop"
  - "qemu"
  - "rdp"
  - "winapps"
  - "windows"
  - "windows11"
  - "安装"
  - "操作系统"
  - "配置"
image: "images/1759850655-截图-2025-10-07-23-24-05.png"
---

尽管目前Linux的软件生态已经是一片勃勃生机，万物进发的景象犹在眼前。但是我们仍然面对Office、PhotoShop等部分软件不得不使用windows环境来运行的情况。wine对于部分软件来说仍然有兼容性问题，而直接使用虚拟机又显得不太方便。这个时候我们的WinApps出场了，WinApps使用远程桌面协议（RDP）直接与我们需要使用的windows软件交互，让我们可以不必打开vm就直接使用软件，也不用再在虚拟机内与windows桌面交互了。

下面我们以`PhotoShop`为例，演示WinApp的使用方法。

## 安装虚拟机管理器

首先我们要安装一个虚拟机管理器，这部分请参考[上期内容](http://8.155.148.120/archives/110)。

然后在虚拟机管理器的`编辑-首选项`勾选前两项：

![在首选项中选择启用xml编辑和系统托盘图标](images/txs4ug.png)

## 虚拟机安装windows

### 准备安装镜像

我们需要准备两个安装镜像，一个是windows系统安装镜像，另一个是windows虚拟驱动的安装镜像`virtio-win`

windows安装镜像请前往微软官网下载，而驱动这里我们选择[fedora的镜像站](https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/archive-virtio/virtio-win-0.1.285-1/)下载其中的`virtio-win.iso`

这里我以windows11为例进行安装。

### 安装过程

首先我们打开虚拟机管理器，选择`文件-新建虚拟机-本地安装介质`；

![image](images/u37dq2.png)

选择本地windows系统镜像；

![image](images/u4i8ai.png)

接下来两步按照你的电脑配置自己确定大小，内存不建议低于4G；

![image](images/u7sa1v.png)

完成之后，我们还需要做一些别的配置：

1. 在`CPU`选项中启用`复制主机CPU配置`并打开XML,确保`clock`一项与下面一致：

```
  <clock offset="localtime">
    <timer name="rtc" tickpolicy="catchup"/>
    <timer name="pit" tickpolicy="delay"/>
    <timer name="hpet" present="yes"/>
    <timer name="hypervclock" present="yes"/>
  </clock>
```

2. 在`引导选项`选项中，启用`主机引导时启动虚拟机`；

4. 在 `SATA Disk 1` 选项中，选择`VirtIO`作为磁盘总线；

6. 在`NIC`选项中，将`设备型号`设置为`VirtIO`

8. 单击屏幕左下角的`添加硬件`按钮，然后选择`存储-CDROM`作为设备类型，然后在`管理`处选择准备好的`virtio-win.iso`文件；

10. 再添加一个TPM设备，否则无法安装win11。  
     ![image](images/uijnok.png)

配置好后点击左上按钮开始安装。

无脑下一步+和我的“我没有产品密钥”说去吧。

映像选择专业版。

在安装win11的位置这里选择`Load Driver`然后挂载驱动`E:\viostor\win11\amd64`

![image](images/vvft62.png)

![截图 2025-10-07 19-29-52](images/h6a6bx.png)

选中后点击安装，接下来就能够找到磁盘了，继续安装即可。

![image](images/vxtxhf.png)

进入引导页面后，我们开始配置win11

![image](images/w0a5hh.png)

按住`shift+f10`打开命令提示符，输入`oobe\bypassnro`

![image](images/w2rep5.png)

选择`我没有网络连接`  
![image](images/w39ovr.png)

之后设置账户和密码并拒绝所有隐私服务即可。

![image](images/w52igv.png)

进入系统后我们安装虚拟驱动，打开文件管理器找到`E:/virtio-win-guest-tools`安装驱动

![截图 2025-10-07 19-44-55](images/h5oiy3.png)

## 虚拟机的其他配置

用浏览器打开`https://github.com/Fmstrat/winapps/blob/main/install/RDPApps.reg`，下载该文件。

![image](images/w9mdwx.png)

打开文件，`右键-更多选项-合并`

![image](images/waek3m.png)

修改完注册表后我们还要修改设备名称，前往`设置-系统-系统信息-重命名这台电脑`为设备重命名为`RDPWindows`，下一步，之后选择`稍后重新启动`

![image](images/wcm4rd.png)

之后打开远程桌面，开启远程桌面，这里的名字还没有更改也没关系，等重启就好了。然后记得打开防火墙。

![image](images/wdwx19.png)

现在我们可以安装需要的windows软件了，这里我安装了`PhotoShop`，安装包使用的是学校提供的正版安装包。

![image](images/xu5v34.png)

接下来打开`cmd`输入命令ipconfig查看虚拟机ip并记录。

![image](images/yrmzy7.png)

在做好所有准备工作后重启电脑，但不要登录。关闭查看器和虚拟机管理器。

## 准备WinApps For Linux

首先安装`freerdp`:

```
sudo pacman -S freerdp
```

然后RDP测试连接是否正常：

```
xfreerdp3 /u:"用户名" /p:"密码" /v:192.168.122.101 /cert:tofu #ip替换为你虚拟机的实际ip
```

如果出现了窗口，说明连接正常，接下来关掉窗口开始安装`WinApps`。

![image](images/yy0y18.png)

创建`WinApps`配置目录和配置文件：

```
mkdir ~/.config/winapps
vim ~/.config/winapps/winapps.conf
```

将下面内容写入配置文件：

```
RDP_USER="用户名" 
RDP_PASS="密码"
RDP_IP=""
VM_NAME="RDPWindows"
WAFLAVOR="libvirt"
RDP_SCALE="100"
RDP_FLAGS="/cert:tofu /sound /microphone +home-drive"
DEBUG="true"
```

修改文件权限：

```
chmod 600 ~/.config/winapps/winapps.conf
```

运行WinApps安装脚本：

```
bash <(curl https://raw.githubusercontent.com/winapps-org/winapps/main/setup.sh)
```

前面三项依次选择：`Install` `Current User` `Manual`

跳过官方软件：  
![image](images/10ssy9p.png)

手动选择其他软件：  
![截图 2025-10-07 22-25-38](images/h4zzbl.png)

按下空格勾选我们需要的软件：  
![image](images/10u52fo.png)

这里可能自动设置环境变量失败，如果失败了需要手动添加：

```
echo 'export PATH=~/.local/bin:$PATH' >> ~/.zshrc && source ~/.zshrc
```

现在我们就可以在菜单里看到PhotoShop了：

![image](images/12dhqmh.png)
