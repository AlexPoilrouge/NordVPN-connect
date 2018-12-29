
const St = imports.gi.St;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Tweener = imports.ui.tweener;

const Mainloop = imports.mainloop;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Util = imports.misc.util;
const GLib = imports.gi.GLib;




const COMMAND_SHELL= "/usr/bin/bash"


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

const Country_Dict= {
  al: "Albania", de: "Germany", pl: "Poland",
  ar: "Argentina", gr: "Greece", pt: "Portugal",
  au: "Australia", hk: "Hong_Kong", ro: "Romania",
  at: "Austria", hu: "Hungary", ru: "Russia",
  az: "Azerbaijan", is: "Iceland", rs: "Serbia",
  be: "Belgium", in: "India", sg: "Singapore",
  ba: "Bosnia_And_Herzegovina", id: "Indonesia", sk: "Slovakia",
  br: "Brazil", ie: "Ireland", si: "Slovenia",
  bg: "Bulgaria", il: "Israel", za: "South_Africa",
  ca: "Canada", it: "Italy", kp: "South_Korea",
  cl: "Chile", jp: "Japan", es: "Spain",
  cr: "Costa_Rica", lv: "Latvia", se: "Sweden",
  hr: "Croatia", lu: "Luxembourg", ch: "Switzerland",
  cy: "Cyprus", mk: "Macedonia", tw: "Taiwan",
  cz: "Czech_Republic", my: "Malaysia", th: "Thailand",
  dk: "Denmark", mx: "Mexico", tr: "Turkey",
  ee: "Estonia", md: "Moldova", ua: "Ukraine",
  fi: "Finland", nl: "Netherlands", gb: "United_Kingdom",
  fr: "France", nz: "New_Zealand", us: "United_States",
  ge: "Georgia", no: "Norway", vn: "Vietnam"
};

class PlaceItem extends PopupMenu.PopupBaseMenuItem{
  constructor(str_Place){
    super();

    this.placeName= str_Place;

    this.checkIcon = new St.Icon({  icon_name: 'network-vpn-symbolic',
                                style_class: 'countries_submenu_label_item_selected_icon' });
    this.actor.add(this.checkIcon);

    let label_item= new St.Label({style_class: 'countries_submenu_label_item', text: this.placeName});
    this.actor.add(label_item);
    // log('[nvpn] creating placeitem for ' + str_Place);
    this.checkIcon.hide();
  }

  select(b=true){
    if (b){
      this.checkIcon.show();
    }
    else{
      this.checkIcon.hide();
    }
  }

  get PlaceName(){
    return this.placeName;
  }
};

class PlacesMenu extends PopupMenu.PopupSubMenuMenuItem{
  constructor(){
    super(_("Select country"), true);

    this.select_cb= null;
    this.cur_selected=null;
  }

  add_place(str_Place){
    let item= new PlaceItem(str_Place);
    this.menu.addMenuItem(item);

    // item.connect('clicked',this._item_select.bind(this));
    let t= this;
    // item.addAction(_("Select_Place"),function(){t._item_select();});
    item.connect('activate', this._item_select.bind(this,item));
  }

  select_callback(func=null){
    this.select_cb= func;
  }

  _item_select(item){
    log("[nvpn] item{pn="+item.PlaceName+"}.select("+(item==this.cur_selected).toString()+")")
    if(this.cur_selected!=null){
      this.cur_selected.select(false);
    }

    if(item==this.cur_selected){
      this.cur_selected= null;
      item.select(false);
    }
    else{
      this.cur_selected= item;
      item.select();
    }

    this.select_cb(this.LastSelectedPlaceName);
  }

  get LastSelectedPlaceName(){
    if (this.cur_selected!=null){
      return this.cur_selected.PlaceName;
    }
    else {
      return "";
    }
  }

  unselect_no_cb(){
    if (this.cur_selected!=null){
      this.cur_selected.select(false);
      this.cur_selected= null;
    }
  }

  select_from_name(placeName){
    let children= this.menu._getMenuItems();
    for(let i=0; i<this.menu.length; ++i){
      let item= children[i];
      if(item.PlaceName===placeName){
        if(this.cur_select!=null){
          this.cur_selected.select(false);
        }
        item.select();
        this.cur_selected= item;
      }
    }
  }
};

class NVPNMenu extends PanelMenu.Button{
  static get STATUS() {
    return {
      NOT_FOUND: 0,
      DAEMON_DOWN: 1,
      LOGGED_OUT: 2,
      DISCONNECTED: 3,
      CONNECTED: 4
    };
  }

  constructor(){
    super(0.0, _("NordVPN"));

    this.nvpn_monitor= true;
    this.connection_wait= false;

    this._auto_connect_to= "";

    this.panel_hbox= new St.BoxLayout({style_class: 'panel-status-menu-hbox'});
    this.panel_icon = new St.Icon({ icon_name: 'action-unavailable-symbolic',
                               style_class: 'system-status-icon' });
    this.panel_hbox.add_child(this.panel_icon);
    let label_nvpn= new St.Label({style_class: 'label-nvpn-panel', text: 'NVPN '});
    this.panel_hbox.add_child(label_nvpn);
    // this.panel_hbox.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
    this.actor.add_child(this.panel_hbox);

    this.connect('clicked',
      function(){
        if(!this.nvpn_monitor){
          this._update_status_and_ui();
        }
      }.bind(this)
    );

    this._main_menu = new PopupMenu.PopupBaseMenuItem({
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

    this._main_menu.actor.add(vbox, { expand: true });


    this.menu.addMenuItem(this._main_menu,0);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());


    this.submenu= new PlacesMenu();
    this.menu.addMenuItem(this.submenu);

    // this.submenu.select_callback(function(placeName){
    //   log("[nvpn] Wow! Clicked on " + placeName);
    // });
    this.submenu.select_callback(this._place_menu_new_selection.bind(this));

    this.submenuSelection= 0;
    this._fill_country_submenu();


    let _itemCurrent2 = new PopupMenu.PopupBaseMenuItem({
            reactive: true
        });this.panel_icon
    let vbox2= new St.BoxLayout({style_class: 'nvpn-menu-vbox2'});
    vbox2.set_vertical(true);

    // this.action_button= new St.Button({style_class: 'action_button'});
    this.label_action_btn= new St.Label({style_class: 'label-action-btn', text: 'Quick Connect'});
    // this.action_button.add_child(this.label_action_btn);
    this.action_button= new St.Button({style_class: 'nvpn-action-button', child:this.label_action_btn});

    this.action_button.connect('clicked', this._button_clicked.bind(this));

    vbox2.add_child(this.action_button);




    _itemCurrent2.actor.add(vbox2, { expand: true });
    this.menu.addMenuItem(_itemCurrent2);



    this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;
    this._update_status_and_ui();

    this._vpn_lock= false;
    this._vpn_survey();

    log('[nvpn] nvpn server? '+ this. _get_server_text_info());
  }

  destroy(){
    super.destroy();
  }

  _is_NVPN_found(){
    return (GLib.spawn_command_line_sync(COMMAND_SHELL + " -c 'hash nordvpn'")[2].length === 0);
  }

  _is_NVPN_connected(){
    return !(GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn status | grep -Po ' [cC]onnected'\"")[1].length===0);
  }

  _is_daemon_unreachable(){
    return !(GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn status | grep -Po 'Daemon.*unreachable'\"")[1].length===0);
  }

  _is_user_logged_in(){
    return (GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"echo '' | nordvpn login | grep -Po 'already logged'\"")[1].length!==0);
  }

  _get_current_status(){
    if (!(this._is_NVPN_found())){
      return NVPNMenu.STATUS.NOT_FOUND;
    }
    else{
      if (this._is_NVPN_connected()){
        return NVPNMenu.STATUS.CONNECTED;
      }
      else if (this._is_daemon_unreachable()) {
        return NVPNMenu.STATUS.DAEMON_DOWN;
      }
      else if (!this._is_user_logged_in()){
        return NVPNMenu.STATUS.LOGGED_OUT;
      }
      else{
        return NVPNMenu.STATUS.DISCONNECTED;
      }
    }
  }

  _update_status_and_ui(){
    if(this._vpn_lock) return;
    this._vpn_lock= true;
    this.currentStatus= this._get_current_status();

    // this.actor.show();
    this.setSensitive(true);

    switch(this.currentStatus){
    case NVPNMenu.STATUS.DAEMON_DOWN:
    case NVPNMenu.STATUS.LOGGED_OUT:
    case NVPNMenu.STATUS.NOT_FOUND:
      this.label_status.text= (this.currentStatus===NVPNMenu.STATUS.LOGGED_OUT)?
                                " nordvpn tool not logged in"
                              : (this.currentStatus===NVPNMenu.STATUS.DAEMON_DOWN)?
                                " daemon disabled/missing "
                              : " tool not found.";

      this.label_connection.text= "--";

      this.action_button.style_class= 'nvpn-action-button-help'
      this.label_action_btn.text= "Help?";

      this.panel_hbox.style_class='panel-status-menu-hbox-problem';
      this.panel_icon.icon_name= 'network-vpn-no-route-symbolic';

      this.submenu.actor.hide();

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
      this.label_status.text= " disconnected.";

      this.label_connection.text= "--";

      this.action_button.style_class= 'nvpn-action-button'
      this.label_action_btn.text= "Quick Connect (default)";

      this.panel_hbox.style_class='panel-status-menu-hbox';
      this.panel_icon.icon_name= 'action-unavailable-symbolic';

      this.submenu.actor.show();
      this.submenu.unselect_no_cb();

      break;
    case NVPNMenu.STATUS.CONNECTED:
      this.label_status.text= " connected to";

      let server_txt= this._get_server_text_info();
      this.label_connection.text= server_txt;
      this.action_button.style_class= 'nvpn-action-button-dq';
      this.label_action_btn.text= "Disconnect";

      this.panel_hbox.style_class='panel-status-menu-hbox-connected';
      this.panel_icon.icon_name= 'network-vpn-symbolic';

      this.submenu.actor.show();
      if(this.submenu.LastSelectedPlaceName.length ===0){
        let rgx= /- ([a-z]*)[0-9]*.*$/g;
        let arr= rgx.exec(server_txt);
        if((arr!==null) && (arr[1]!==undefined)){
          let country= Country_Dict[arr[1]];
          if (country!==undefined){
             log('[nvpn] finding '+country);
            this.submenu.select_from_name(country);
          }
        }
      }

      break;
    }
    this._vpn_lock= false;
  }

  _get_server_text_info(){
    if(this.currentStatus === NVPNMenu.STATUS.CONNECTED){
      return "-"+
          GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn status | grep -Po 'Current server: .*\\..*\\..*' | cut -d: -f2 | cut -d: -f2\"")[1].toString().replace(/(\r\n\t|\n|\r\t)/gm,"")
              +" -" ;
    }
    else{
      return "--";
    }
  }

  _waiting_state(){
      this.setSensitive(false);
      this.menu.close();
      this.panel_icon.icon_name= 'network-vpn-acquiring-symbolic';
  }

  _nordvpn_quickconnect(placeName=""){
    let cmd= COMMAND_SHELL + " -c \"nordvpn c " + placeName + "\"";
    if(this.nvpn_monitor){
      GLib.spawn_command_line_async( cmd );
      // this.actor.hide();
      this._waiting_state();
    }
    else{
      GLib.spawn_command_line_sync( cmd );
    }
  }

  _nordvpn_disconnect(){
    let cmd= COMMAND_SHELL + " -c \"nordvpn d\"";
    if(this.nvpn_monitor){
      GLib.spawn_command_line_async( cmd );
      // this.actor.hide();
      this._waiting_state();
    }
    else{
      GLib.spawn_command_line_sync( cmd );
    }
  }

  _nordvpn_ch_connect(placeName=""){
    // let cmd= COMMAND_SHELL + " -c \"nordvpn d; nordvpn c " + placeName + "\"";
    // if(this.nvpn_monitor){
    //   GLib.spawn_command_line_async( cmd );
      // this.actor.hide();
    //   this._waiting_state();
    // }
    // else{
    //   GLib.spawn_command_line_sync( cmd );
    // }
    if(placeName.length!==0){
      this._auto_connect_to= placeName;
      this._nordvpn_disconnect();
    }
    if(this.nvpn_monitor){
      _nordvpn_quickconnect(placeName);
    }

  }

  _button_clicked(){
    log('[nvpn] button clicked?');
    switch(this.currentStatus){
    case NVPNMenu.STATUS.NOT_FOUND:
    case NVPNMenu.STATUS.LOGGED_OUT:
    case NVPNMenu.STATUS.DAEMON_DOWN:

      break;
    case NVPNMenu.STATUS.DISCONNECTED:

      let strPlace= this.submenu.LastSelectedPlaceName;
      if(strPlace.length===0){
        // GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn c\"");
        this. _nordvpn_quickconnect();
        log('[nvpn] -> sh -c \"nordvpn c\"?');
      }

      break;
    case NVPNMenu.STATUS.CONNECTED:
      // GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn d\"");
      this._nordvpn_disconnect();
        log('[nvpn] -> sh -c \"nordvpn d\"?');


      break;
    }

    if(!this.nvpn_monitor){
      this._update_status_and_ui();
    }
  }

  _get_countries_list(){
    // let lst_str= GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn countries | sed 's/\\s\\\{1,\\\}/;/g' | sed 's/;-;//g' | sed ':a;N;\\$!ba;s/\\\\n/;/g'\"")[1].toString();

    // log('[nvpn] lst_str= '+ lst_str);

    // return lst_str.split(';').sort();

    let l=[];
    for (let country in Country_Dict){
      l.push(Country_Dict[country]);
    }

    return l.sort();
  }

  _fill_country_submenu(){
    let country_list= this. _get_countries_list();
    let tsm= this.submenu;

    country_list.forEach(function(elmt){
      tsm.add_place(elmt);
    });
  }

  _place_menu_new_selection(placeName){
    log("[nvpn] Wow! Clicked on " + placeName);
    if(this.currentStatus===NVPNMenu.STATUS.DISCONNECTED){
      // GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn c " + placeName + "\"");
      this._nordvpn_ch_connect(placeName);
      log('[nvpn] -> sh -c \"nordvpn c ' + placeName + '\"?');
    }
    else{
      if((this.currentStatus===NVPNMenu.STATUS.CONNECTED)){
        // GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn d\"");
        log('[nvpn] -> sh -c \"nordvpn d\"?');

        if(placeName.length!==0){
          // GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"nordvpn c " + placeName + "\"");
          this._nordvpn_ch_connect(placeName);
          log('[nvpn] -> sh -c \"nordvpn c ' + placeName + '\"?');
        }
        else{
          this._nordvpn_disconnect();
        }
      }
    }

    if(!this.nvpn_monitor){
      this._update_status_and_ui();
    }
  }

  _vpn_survey(){
    if(!this.nvpn_monitor) return;

    this._vpn_check();

    if(this._vpn_timeout){
      Mainloop.source_remove(this._vpn_timeout);
      this._vpn_timeout= null;
    }

    this._vpn_timeout= Mainloop.timeout_add_seconds(2,this._vpn_survey.bind(this));
  }

  _vpn_check(){
    let change= false;
    switch(this.currentStatus){
    case NVPNMenu.STATUS.LOGGED_OUT:
      change= this._is_user_logged_in();

      break;
    case NVPNMenu.STATUS.NOT_FOUND:
      change= this._is_NVPN_found();

      break;
    case NVPNMenu.STATUS.DAEMON_DOWN:
      change= ( GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"systemctl status nordvpnd 2> /dev/null | grep 'active (running)'")[1].toString().length!==0 );

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
      change= ( GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"ifconfig -a | grep tun0\"")[1].toString().length!==0 );

      break;
    case NVPNMenu.STATUS.CONNECTED:
      change= ( GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \"ifconfig -a | grep tun0\"")[1].toString().length===0 );
      if(change){
        this.submenu.unselect_no_cb();

        log("[nvpn] act= "+this._auto_connect_to)
        if(this._auto_connect_to.length!==0){
          this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;

          log("[nvpn] hi!")
          this._nordvpn_quickconnect(this._auto_connect_to);

          this._auto_connect_to="";
          change= false;
        }
      }

      break;
    }

    if (change){
      this._update_status_and_ui();
    }
  }

  set_monitoring(b){
    if(b!=this.nvpn_monitor){
      this.nvpn_monitor= b;

      if(b){
        this._vpn_survey();
      }
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

