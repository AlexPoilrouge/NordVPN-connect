
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
      DAEMON_DOWN: 1,
      DISCONNECTED: 2,
      CONNECTED: 3
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


    hbox2.add_child(this.label_status);

    vbox.add_child(hbox2);
    vbox.add_child(this.label_connection);

    _itemCurrent.actor.add(vbox, { expand: true });


    this.menu.addMenuItem(_itemCurrent,0);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());


    let _itemCurrent2 = new PopupMenu.PopupBaseMenuItem({
            reactive: false
        });
    let vbox2= new St.BoxLayout({style_class: 'nvpn-menu-vbox2'});
    vbox2.set_vertical(true);

    // this.action_button= new St.Button({style_class: 'action_button'});
    this.label_action_btn= new St.Label({style_class: 'label-action-btn', text: 'Quick Connect'});
    // this.action_button.add_child(this.label_action_btn);
    this.action_button= new St.Button({style_class: 'action_button', child:this.label_action_btn});

    this.action_button.connect('clicked', this._button_clicked.bind(this));

    vbox2.add_child(this.action_button);




    _itemCurrent2.actor.add(vbox2, { expand: true });
    this.menu.addMenuItem(_itemCurrent2);


    this.submenu= new PopupMenu.PopupSubMenuMenuItem(_("Select country"), true);
    this.menu.addMenuItem(this.submenu);

    this._fill_country_submenu();



    this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;
    this._update_status_and_ui();

    log('[nvpn] nvpn server? '+ this. _get_server_text_info());
  }

  destroy(){
    super.destroy();
  }

  _is_NVPN_found(){
    return (GLib.spawn_command_line_sync("sh -c 'hash nordvpn'")[2].length === 0);
  }

  _is_NVPN_connected(){
    return !(GLib.spawn_command_line_sync("sh -c \"nordvpn status | grep -Po ' [cC]onnected'\"")[1].length===0);
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
    case NVPNMenu.STATUS.DAEMON_DOWN:
      this.label_status.text= " tool not found.";

      this.label_connection.text= "--";

      this.label_action_btn= "Help?";

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
      this.label_status.text= " disconnected.";

      this.label_connection.text= "--";

      this.label_action_btn.text= "Quick Connect";

      break;
    case NVPNMenu.STATUS.CONNECTED:
      this.label_status.text= " connected to";

      this.label_connection.text= this._get_server_text_info();

      this.label_action_btn.text= "Disconnect";

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

  _button_clicked(){
    log('[nvpn] button clicked?');
    switch(this.currentStatus){
    case NVPNMenu.STATUS.NOT_FOUND:
    case NVPNMenu.STATUS.DAEMON_DOWN:

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
      GLib.spawn_command_line_sync("sh -c \"nordvpn c\"");
        log('[nvpn] -> sh -c \"nordvpn c\"?');

      break;
    case NVPNMenu.STATUS.CONNECTED:
      GLib.spawn_command_line_sync("sh -c \"nordvpn d\"");
        log('[nvpn] -> sh -c \"nordvpn d\"?');


      break;
    }

    this._update_status_and_ui();

  }

  _get_countries_list(){
    let lst_str= GLib.spawn_command_line_sync("sh -c \"nordvpn countries | sed 's/\\s\\\{1,\\\}/;/g' | sed 's/;-;//g' | sed ':a;N;\\$!ba;s/\\\\n/;/g'\"")[1].toString();

    log('[nvpn] lst_str= '+ lst_str);

    return lst_str.split(';');
  }

  _fill_country_submenu(){
    let country_list= this. _get_countries_list();
    let tsmm= this.submenu.menu;




    let item= new PopupMenu.PopupBaseMenuItem();
    let label_item= new St.Label({style_class: 'label-action-btn', text: 'Default'});
    item.actor.add(label_item);

    tsmm.addMenuItem(item);

    country_list.forEach(function(elmt){
      log('[nvpn] - c= ' + elmt);

      item= new PopupMenu.PopupBaseMenuItem();
      label_item= new St.Label({style_class: 'label-action-btn', text: elmt});
      item.actor.add(label_item);

      tsmm.addMenuItem(item);
    });
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

