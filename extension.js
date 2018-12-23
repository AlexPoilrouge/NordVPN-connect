
const St = imports.gi.St;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Util = imports.misc.util;
const GLib = imports.gi.GLib;



let text, button;

function _hideHello() {
    Main.uiGroup.remove_actor(text);
    text = null;
}

function _showHello() {
    if (!text) {
        text = new St.Label({ style_class: 'helloworld-label', text: "Hello, world!" });
        Main.uiGroup.add_actor(text);
    }

    text.opacity = 255;

    let monitor = Main.layoutManager.primaryMonitor;

    text.set_position(monitor.x + Math.floor(monitor.width / 2 - text.width / 2),
                      monitor.y + Math.floor(monitor.height / 2 - text.height / 2));

    Tweener.addTween(text,
                     { opacity: 0,
                       time: 2,
                       transition: 'easeOutQuad',
                       onComplete: _hideHello });
}

class NVPNMenu extends PanelMenu.Button{
  static get STATUS() {
    return {
      NOT_FOUND: 0,
      DISCONNECTED: 1,
      CONNECTED: 2
    };
  }

  constructor(){
    super(0.0, _("NordVPN"));

    let hbox= new St.BoxLayout({style_class: 'panel-status-menu-hbox'});
    let icon = new St.Icon({ icon_name: 'media-eject-symbolic',
                               style_class: 'system-status-icon' });
    hbox.add_child(icon);
    hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
    this.actor.add_child(hbox);

    let _itemCurrent = new PopupMenu.PopupBaseMenuItem({
            reactive: false
        });

    let vbox= new St.BoxLayout({style_class: 'nvpn-menu-vbox'});
    vbox.set_vertical(true);
    let hbox2= new St.BoxLayout({style_class: 'nvpn-menu-hbox'});
    let label1= new St.Label({style_class: 'label-nvpn-menu', text: "NordVPN"});

    hbox2.add_child(label1);

    log('[nvpn] is nvpn found? '+ this._is_NVPN_found().toString());
    log('[nvpn] is nvpn connected? '+ this._is_NVPN_connected().toString());
    log('[nvpn] nvpn status? '+ this._get_current_status().toString());

    this.label_status= new St.Label({style_class: 'label-nvpn-status'});
    this.label_connection= new St.Label({style_class: 'label-nvpn-connection', text: '--'});
    this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;
    this._update_status_and_ui();

    log('[nvpn] nvpn server? '+ this. _get_server_text_info());


    hbox2.add_child(this.label_status);

    vbox.add_child(hbox2);
    vbox.add_child(this.label_connection);

    _itemCurrent.actor.add(vbox, { expand: true });
    this.menu.addMenuItem(_itemCurrent,0);
  }

  destroy(){
    super.destroy();
  }

  _is_NVPN_found(){
    return (GLib.spawn_command_line_sync("sh -c 'hash nordvpn'")[2].length === 0);
  }

  _is_NVPN_connected(){
    return (GLib.spawn_command_line_sync("sh -c \"nordvpn status | grep -Po Disconnected\"")[1].length===0);
  }

  _get_current_status(){
    if (!(this._is_NVPN_found())){
      return NVPNMenu.STATUS.NOT_FOUND;
    }
    else{
      if (this._is_NVPN_connected()){
        return NVPNMenu.STATUS.CONNECTED;
      }
      else {
        return NVPNMenu.STATUS.DISCONNECTED;
      }
    }
  }

  _update_status_and_ui(){
    this.currentStatus= this._get_current_status();

    switch(this.currentStatus){
    case NVPNMenu.STATUS.NOT_FOUND:
      this.label_status.text= " tool not found.";

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
      this.label_status.text= " disconnected.";

      break;
    case NVPNMenu.STATUS.CONNECTED:
      this.label_status.text= " connected to";

      this.label_connection.text= this._get_server_text_info();

      break;
    }
  }

  _get_server_text_info(){
    if(this.currentStatus === NVPNMenu.STATUS.CONNECTED){
      return "-"+
          GLib.spawn_command_line_sync("sh -c \"nordvpn status | grep -Po 'Current server: .*\\..*\\..*' | cut -d: -f2 | cut -d: -f2\"")[1].toString().replace(/(\r\n\t|\n|\r\t)/gm,"")
              +" -" ;
    }
    else{
      return "--";
    }
  }


};

function init() {
    //Convenience.initTranslations();
}

let _indicator;

function enable() {
    //Main.panel._rightBox.insert_child_at_index(button, 0);

    _indicator= new NVPNMenu;
    Main.panel.addToStatusArea('nvpn-menu', _indicator);
}

function disable() {
    //Main.panel._rightBox.remove_child(button);

    _indicator.destroy();
}

