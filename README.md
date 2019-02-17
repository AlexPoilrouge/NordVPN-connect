# README:

'NordVPN Connect' gnome-shell extension
The natural basic necessary step before using this GNOME-Shell extension is, of course, to read this README in its entirety.


## About

This extension acts merely and only as a simple GUI for the 'nordvpn' command
line tool basic features that are connection and disconnection to a vpn server.
It also provides basic info about the current status of said connection: whether
or not there is connection and, if so, to which server.
Of course, this requires the 'nordvpn' command line tool, and all necessary
dependencies and requirements to be installed as well. To that effect check out
NordVPN's corresponding page: https://nordvpn.com/download/linux/

Ultimately, this extension should be replaced by any GUI app, NordVPN might officially release for Linux desktop.

###### ToDo?

On the off change, such GUI app isn't released for Linux in the near future. Some welcome ameliorations to this extension would be:
- [] Add more of the 'nordvpn' CLI tool features in this extension such as an 'AutoConnect' toggle, a protocol (UDP/TCP) picked and a 'CyberSec' feature toggle.
- [ ] Add a 'settings' page for this extension.
- [ ] Add the possibility to type in the name of the server (e.g.: de145, uk123, fr067) the user wants to connect to.
- [ ] Add the possibility to pick server by choosing a city (instead of country).


## Disclaimer

###### Nothing official

This extension has been made **without any endorsement or support from NordVPN.**
The developer has no ties nor affiliation whatsoever with NordVPN, its
services, nor its software.
Naturally, this extension is free and isn't, shouldn't and will **not be
subject to any form of profit or compensation**.


###### Release and use

This extension was made for personal needs and use. The code is release on the
off chance it might be of use to someone but without the intention of providing
any form of utility software or service in a rigorous manner.
Therefore, **no support** is endorsed by the developer, meaning that **any
comment, feedback, or request regarding this code should be expected to be completely
ignored by the developer**.
Additionally, the responsibility of any undesired effect the execution of this
code might have on any system lies solely in the hands of the user.


## Installation prerequisites

Since this is only a GNOME-Shell GUI for the 'nordvpn' command line tool, said
tool must be installed before anything else. This extension is destined for
**systemd distributions only!**

If you're on a debian based distribution, checkout this page: https://nordvpn.com/download/linux/

If you're on an archlinux based distribution, this tool *might* be available in
the AUR: https://aur.archlinux.org/packages/nordvpn-bin/

Once the 'nordvpn' CLI tool is installed, check the packaged daemon's status:

	systemd status nordvpnd.service
    
If the daemon isn't up and running, fix that:

    systemd enable nordvpnd.service
    systemd start nordvpnd.service
    
Now, set up your logins to the NordVPN service:

	nordvpn login
    
Now you should be able to use this extension.


###### Test

This tool has been tested on '*Archlinux*', with '*GNOME Shell 3.30.2*' and the *'nordvpn' CLI tool version 2.1.0-5*.


## Help

***The extension says « tool not found. », Holly Cow!***

  This probably means that the 'nordvpn' CLI tool is either not installed, either not found by the system. See previous section for installation and the NordVPN website ( https://nordvpn.com/download/linux/ ).

***The extension says « daemon disabled/missing », what gives?***

  Installing the 'nordvpn' CLI tool isn't enough. The 'nordvpnd' systemd daemon must be up and running. Open a terminal and type:
  
	systemd enable nordvpnd.service
	systemd start nordvpnd.service

***The extension says « tool not logged in », what's up?***

  You probably haven't set up your logins to the 'nordvpn' CLI tool. Open a terminal and type:
  
	nordvpn login
    
and enter your NordVPN logins.

***The extension seems to be blocked in some sort of “ waiting state ”.***

  This extension is supposed to react to the current state of the NordVPN server connection given by the 'nordvpn' CLI tool and the 'nordvpnd' systemd daemon. Therefore, you might need to use those tool to fix the issue.

***

*From Strasbourg, with love.*

Alex Poilrouge
