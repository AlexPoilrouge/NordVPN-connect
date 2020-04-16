
const St = imports.gi.St;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Tweener = imports.ui.tweener;

const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Unescape= Me.imports.unescape;
const MyUtils= Convenience.MyUtils;

const Util = imports.misc.util;
const GLib = imports.gi.GLib;

const Gettext = imports.gettext.domain('gnome-shell-extensions-nvpnconnect');
const _ = Gettext.gettext;

const SubMenus= Me.imports.subMenus;

const BoxPointer = imports.ui.boxpointer;



const NORDVPN_TOOL_EXPECTED_VERSION= "3.4";


/**
 * Calls for a given shell command in a synchronous way
 * @function
 * @param {string} cmd - the shell command to execute
 * @param {string} shell - shell that will execute the command (default: "/bin/bash")
 *                        if null, undefined or empty, acts as default call (system dependant)
 * @param {number} descriptor - 1 (default) for the function to return the stdout output,
 *                              2 for stderr.
 * @returns {string} the stddout of the command's exectuion as a string
 */
function COMMAND_LINE_SYNC(cmd, shell="/bin/bash", descriptor=1){
  let command= (shell)? (shell + " -c \""+ cmd + "\"") : cmd;
  return ByteArray.toString(GLib.spawn_command_line_sync(command)[(descriptor>=2)?2:1]);
}

/**
 * Calls for a given shell command in an asynchronous way
 * @function
 * @param {string} cmd - the shell command to execute
 * @param {string} shell - shell that will execute the command (default: "/bin/bash")
 *                        if null, undefined or empty, acts as default call (system dependant)
 */
function COMMAND_LINE_ASYNC(cmd, shell="/bin/bash"){
  let command= (shell)? (shell + " -c \""+ cmd + "\"") : cmd;
  GLib.spawn_command_line_async(command);
}

/**
 * Dictionnary that pair up country from their country code
 * (seems similar to the ISO norm except for the uk ('uk' instead
 * of 'gb' )
 */
const Country_Dict= {
  al: "Albania", de: "Germany", pl: "Poland",
  ar: "Argentina", gr: "Greece", pt: "Portugal",
  au: "Australia", hk: "Hong_Kong", ro: "Romania",
  at: "Austria", hu: "Hungary", //ru: "Russia", (russia no longer availabe due to governmental reasons)
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
  fi: "Finland", nl: "Netherlands", uk: "United_Kingdom",//gb: "United_Kingdom",
  fr: "France", nz: "New_Zealand", us: "United_States",
  ge: "Georgia", no: "Norway", vn: "Vietnam"
};

/**
 * The list of all the 'groups' that the CLI tool can connect to
 */
const Group_List=[
  "Africa,_The_Middle_East_And_India",
  "Asia_Pacific",
  "Europe",
  "The_Americas",
  "Dedicated_IP",
  "P2P",
  "Double_VPN",
  //"Onion_Over_VPN", //this group seems to have disappeared from the CLI tool
];

/**
 * Class that allows to store and extract infos about the currently
 * connected server from the 'status' textual output of the CLI tool.
 */
class ServerInfos{
  constructor(){
    this.reset();
  }

  /**
   * Method that (re)initializes the data
   */
  reset(){
    this._connected= false;
    this._current_serv= undefined;
    this._country= undefined;
    this._city= undefined;
    this._ip= [undefined, undefined, undefined, undefined];
    this._protocol= false; //false=UDP, true= TCP
    this._transfer= {recv: {data: 0, unit: 'B'}, sent: {data: 0, unit: 'B'}};
    this._uptime= "unknown";
    this._technology= false; //false=OpenVPN, true=NordLynx
  }


  isConnected(){ return this._connected; }

  get serverName(){return (this._current_serv)?this._current_serv:"";}
  get country(){return this._country;}
  get city(){return this._city;}
  get ip(){return this._ip;}

  isUDP(){return !(this._protocol);}

  isOpenVPN(){return (!this._technology);}

  get transferData(){return this._transfer;}
  get uptimeInfoString(){return this._uptime;}

  /**
   * Method that extracts information about the server and stores it.
   * The text information is expected to be (at least partially) matching
   * the format of the output of the 'nordvpn status' command
   * 
   * @param {string} txt text containing matching the 'nordvpn status' output
   *  from which to extract the server informations
   */
  process(txt){
    this.reset();

    let lines= txt.split('\n');

    lines.forEach( (line)=>{
        var r= null;
        if( (r=/^[Ss]tatus:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._connected= r[1].match(/[Cc]onnected/)!=null;
        }
        else if( (r=/^[Cc]urrent\s*[Ss]erver:\s*(.*)$/.exec(line)) && r.length>1 ){
          r= r[1].match(/^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/);
          this._current_serv= (r && r.length>0)? r[0] : undefined;
        }
        else if( (r=/^[Cc]ountry:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._country= (r[1])?r[1]:'';
        }
        else if( (r=/^[Cc]ity:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._city= (r[1])?r[1]:'';
        }
        else if( (r=/^.*IP:\s*(.*)$/.exec(line)) && r.length>1 ){
          if( (r=r[1].match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)) ){
            var i=0;
            r[0].split('.').forEach( (strn) => {
              this._ip[i]= parseInt(strn);
              ++i;
            });
          }
        }
        else if( (r=/^.*[Pp]rotocol:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._protocol= ( r[1] && r[1]==='TCP' );
        }
        else if( (r=/^.*[Tt]ransfer:\s*(.*)$/.exec(line)) && r.length>1 ){
          if( (r=/^([0-9]+(\.[0-9]*)?)\s([PTGMK]i)?B\sreceived,\s*([0-9]+(\.[0-9]*)?)\s([PTGMK]i)?B\ssent.*$/.exec(r[1])) && r.length>6){
            if(r[1] && r[3] && r[4] && r[6]){
              let r_data= parseFloat(r[1]);
              let s_data= parseFloat(r[4]);

              if(r_data && s_data){
                this._transfer.recv.data= r_data;
                this._transfer.recv.unit= r[3]+'B';
                this._transfer.sent.data= s_data;
                this._transfer.sent.unit= r[6]+'B';
              }
            }
          }
        }
        else if( (r=/^.*[Uu]ptime:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._uptime= r[1];
        }
        else if( (r=/^.*[Tt]echnology:\s*(.*)$/.exec(line)) && r.length>1 ){
          this._technology= ( r[1] && r[1]==='NordLynx' );
        }
    });
  }
}

/** Object that will be the access holder to this extension's gSettings */
var SETTINGS;

/**
 *  Class that loads the core commands of this extension that are stored in the gSettings
 *  It connects signals to allow any exterior change on them to take effect.
 **/
class Core_CMDs{
  /**
   *
   * @param {*} parent Parent is use to directly connect this class with the instance
   *                     of NVPNMenu using this instance of Core_CMDs (direct callbacks)
   */
  constructor(parent=null){
    // Store the id of the signal connections for disarding
    this.SETT_SIGS= [];
    this._parent= parent;
  }

  /**
   * Initiate all the values from the gSettings, and connect signals
   * 
   * 'SETTINGS' variable must be correctly intiated
   */
  init(){
    let txt= "";
    /** Here the 'Unescape.convert()' method is used since, in string read from gSettings',
     *  special characters don't seem to be interpreted. This helps sets things right (hopefully)
     *  if need be.
     */
    this.command_shell= (txt=Unescape.convert(SETTINGS.get_string("cmd-shell")))?
                          txt : "/bin/bash";
    this.tool_available= (txt=Unescape.convert(SETTINGS.get_string("cmd-tool-available")))?
                          txt : "hash nordvpn";
    this.tool_connected_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-tool-connected-check")))?
                          txt : "nordvpn status | grep -Po ' [cC]onnected'";
    this.tool_transition_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-tool-transition-check")))?
                          txt : "nordvpn status | grep -Po '[cC]onnecting'";
    this.daemon_unreachable_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-daemon-unreachable-check")))?
                          txt : "nordvpn status | grep -Po 'TransientFailure.*nordvpn.sock'";
    this.tool_logged_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-tool-logged-check")))?
                          txt : "echo '' | nordvpn login | grep -Po 'already logged'";
    this.current_server_get= (txt=Unescape.convert(SETTINGS.get_string("cmd-current-server-get")))?
                          txt : "nordvpn status";
    this.server_place_connect= (txt=Unescape.convert(SETTINGS.get_string("cmd-server-place-connect")))?
                          txt : "nordvpn c _%target%_";
    this.server_disconnect= (txt=Unescape.convert(SETTINGS.get_string("cmd-server-disconnect")))?
                          txt : "nordvpn d";
    this.daemon_online_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-daemon-online-check")))?
                          txt : "echo \";`systemctl --user is-active nordvpnud`;`systemctl is-active nordvpnsd`;`systemctl is-active nordvpnd`\" | grep -Po \";active$\"";
    this.vpn_online_check= (txt=Unescape.convert(SETTINGS.get_string("cmd-vpn-online-check")))?
                          txt : "ifconfig -a | grep tun0";
    this.option_set= (txt=Unescape.convert(SETTINGS.get_string("cmd-option-set")))?
                          txt : "nordvpn set _%option%_ _%value%_";
    this.get_options= (txt=Unescape.convert(SETTINGS.get_string("cmd-get-options")))?
                          txt : "nordvpn settings | sed -e :a -e N -e '$!ba' -e 's/\\n/;/g' | sed -e 's/: /:/g' | sed -e 's/ //g' | sed -e 's/-//g' | tr '[:upper:]' '[:lower:]'";
    this.get_version= (txt=Unescape.convert(SETTINGS.get_string("cmd-get-version")))?
                          txt : "nordvpn --version | grep -Po \"([0-9]\\.?)+[0-9]\"";
    this.get_groups_countries= (txt=Unescape.convert(SETTINGS.get_string("cmd-get-groups-countries")))?
                          txt : "echo `nordvpn groups | sed -e :a -e N -e '$!ba' -e 's/\\n/;/g'`; echo `nordvpn countries | sed -e :a -e N -e '$!ba' -e 's/\\n/;/g'`";


    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-shell', () => {
      this.command_shell= Unescape.convert(SETTINGS.get_string("cmd-shell"));
      this._shell_valid= this.command_shell_found();
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-tool-available', () => {
      this.tool_available= Unescape.convert(SETTINGS.get_string("cmd-tool-available"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-tool-connected-check', () => {
      this.tool_connected_check= Unescape.convert(SETTINGS.get_string("cmd-tool-connected-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-tool-transition-check', () => {
      this.tool_transition_check= Unescape.convert(SETTINGS.get_string("cmd-tool-transition-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-daemon-unreachable-check', () => {
      this.daemon_unreachable_check= Unescape.convert(SETTINGS.get_string("cmd-daemon-unreachable-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-tool-logged-check', () => {
      this.tool_logged_check= Unescape.convert(SETTINGS.get_string("cmd-tool-logged-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-current-server-get', () => {
      this.current_server_get= Unescape.convert(SETTINGS.get_string("cmd-current-server-get"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-server-place-connect', () => {
      this.server_place_connect= Unescape.convert(SETTINGS.get_string("cmd-server-place-connect"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-server-disconnect', () => {
      this.server_disconnect= Unescape.convert(SETTINGS.get_string("cmd-server-disconnect"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-daemon-online-check', () => {
      this.daemon_online_check= Unescape.convert(SETTINGS.get_string("cmd-daemon-online-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-vpn-online-check', () => {
      this.vpn_online_check= Unescape.convert(SETTINGS.get_string("cmd-vpn-online-check"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-option-set', () => {
      this.option_set= Unescape.convert(SETTINGS.get_string("cmd-option-set"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));
    this.SETT_SIGS.push(SETTINGS.connect('changed::cmd-get-options', () => {
      this.get_options= Unescape.convert(SETTINGS.get_string("cmd-get-options"));
      if(this._parent){
        this._parent._update_status_and_ui();
      }
    }));

    this._shell_valid= this.command_shell_found();
  }

  /**
   * Destructor; discard connected signals
   */
  destroy(){
    for(var i= 0; i<this.SETT_SIGS.length; ++i){
      if(this.SETT_SIGS[i])
        SETTINGS.disconnect(this.SETT_SIGS[i]);
    }
  }

  exec_sync(cmdKey, params={}, descriptor= 1){
    let command= this[cmdKey];

    if(!command || !this._shell_valid) return undefined;

    for(var k in params){
      command= command.replace("_%"+k+"%_", params[k]);
    }
  
    return COMMAND_LINE_SYNC(command, this.command_shell, descriptor);
  }

  exec_async(cmdKey, params={}){
    let command= this[cmdKey];

    if(!command || !this._shell_valid) return undefined;

    for(var k in params){
      command= command.replace("_%"+k+"%_", params[k]);
    }
    COMMAND_LINE_ASYNC(command, this.command_shell);

    return true;
  }

  /**
   * Method that checks if set command shell is accessible
   * @method
   * @return {boolean}
   */
  command_shell_found(){
    let t= COMMAND_LINE_SYNC("which "+this.command_shell, "", 2);
    return !(t.includes("which: no ") || t.includes("not found"));
  }
}

/**
 * Since gnome-shell 3.32, this is needed on class that extends certain UI objects,
 * including PanelMenu.Button
 */
let NVPNMenu = GObject.registerClass(
/** Class that implements the dedicated status area of the extension
 *  and contains its main menu
 */
class NVPNMenu extends PanelMenu.Button{
  /** Enumerator for the values of the "main states", this extension can be found in
   *  @readonly
   *  @enum {number}
   */
  static get STATUS() {
    return {
      /** If the 'nordvpn' tool isn't avaiblable for the extension **/
      NOT_FOUND: 0,
      /** The 'nordvpnd' systemd deamon isn't available or down **/
      DAEMON_DOWN: 1,
      /** The user hasn't set his logins through the nordvpn tool yet **/
      LOGGED_OUT: 2,
      /** The 'nordvpn' is processing and (dis)connection and his in transition **/
      TRANSITION: 3,
      /** Disconnected from any server **/
      DISCONNECTED: 4,
      /** connected to a server **/
      CONNECTED: 5
    };
  }

  /**
   * Initiate the UI element and creates the object.
   * @method
   */
  _init(){
    super._init(0.0, _("NordVPN"), false);

    /** Create and init the gSettings's core commands manager*/
    this._cmd= new Core_CMDs(this);
    this._cmd.init();


    /** storing signal connectio ids for later discards */
    this.SETT_SIGS= [];

    
    /** 'groups' and 'countries' dynamic storages */
    this.targets= {'groups': [],'countries':[]};


    this.server_info= new ServerInfos();

    /** @member {boolean} nvpn_monitor
     *  whether or not the extension monitors the state of the connection to
     *  nordvpn servers
     *  (contrary is experimental) */
    this.nvpn_monitor= true;

    //unused
    this._transition_time_out= 0;


    /** should the status be colored according to the goption 'colored-status' */
    this._b_colored_status= SETTINGS.get_boolean('colored-status');
    this.SETT_SIGS[4]= SETTINGS.connect('changed::colored-status', () => {
      this._b_colored_status= SETTINGS.get_boolean('colored-status');
      log("nordvpn this._b_colored_status: "+this._b_colored_status);
      switch(this.currentStatus){
        case NVPNMenu.STATUS.DAEMON_DOWN:
        case NVPNMenu.STATUS.LOGGED_OUT:
        case NVPNMenu.STATUS.NOT_FOUND:    
          this._panel_hbox.style_class=(this._b_colored_status)?'panel-status-menu-hbox-problem':'panel-status-menu-hbox';    
          break;
        case NVPNMenu.STATUS.CONNECTED:
          this._panel_hbox.style_class=(this._b_colored_status)?'panel-status-menu-hbox-connected':'panel-status-menu-hbox';
          break;
        case NVPNMenu.STATUS.DISCONNECTED:
        case NVPNMenu.STATUS.TRANSITION:
        default:
          this._panel_hbox.style_class=(this._b_colored_status)?'panel-status-menu-hbox-transition':'panel-status-menu-hbox';
          break;
        }
    });


    /** this private member is the horyzontal layout box contaning the server indicator
     * in the panel area*/
    this._panel_hbox= new St.BoxLayout({style_class: 'panel-status-menu-hbox'});
    /** the icon in the top panel area (may change according to current status)*/
    this._panel_icon = new St.Icon({ icon_name: 'network-vpn-offline-symbolic',
                               style_class: 'system-status-icon nvpn-status-icon' });
    this._panel_hbox.add(this._panel_icon);

    /** 'NVPN' panel text label*/
    this.label_nvpn= new St.Label({style_class: 'label-nvpn-panel', text: 'NVPN ',});
    this.label_nvpn.visible= !(SETTINGS.get_boolean('compact-icon'));
    this.SETT_SIGS[0]= SETTINGS.connect('changed::compact-icon', () => {
      this.label_nvpn.visible= (!SETTINGS.get_boolean('compact-icon'));
    });
    this._panel_hbox.add(this.label_nvpn, {y_fill: false, y_align: St.Align.MIDDLE});
    this.add_child(this._panel_hbox);

    /** saving this idea for later disconnection of the signal during object's destruction */
    this._id_c_click1= this.connect('button-press-event',
      function(){
        /** only usefull if menu is opening */
        if(this.menu.isOpen){
          this._update_displayed_server_infos(true);
          if(/*(!this.nvpn_monitor) &&*/ this.currentStatus<NVPNMenu.STATUS.CONNECTED){
            this._update_status_and_ui();
          }
          /** if the locations menu update is still pending
           *  i.e.: the locations menus haven't been updated yet
           *  i.e.: these menu are filled only on first click*/
          if(this._location_update_pending){
            /** fetchs the current value of 'displayMode' option */
            let displayMode= SETTINGS.get_int('target-display-mode');
            /** calls for refreshing and updating the locations display
             *  dynamically (according to CLI) */
            this._updateGroupsAndCountries();
            this._fill_country_submenu_b(displayMode);
            this._update_recent_location_submenu(displayMode);
            /** flag that means that the udpate is still pending, is discarded */
            this._location_update_pending= false;

            let country= this._getCountyFromServerName(this.server_info.serverName);
            if(country && this._submenuPlaces){
              this._submenuPlaces.select_from_name(country);
            }
          }
        }
      }.bind(this)
    );

    /** this private member implements the menu that appears when user clicks on the top
     * panel's indicator */
    this._main_menu = new PopupMenu.PopupBaseMenuItem({
            /** elements will not be interacive by default */
            reactive: false
        });

    /** vertical box layout, the first item of our menu, that will contain all
     * server information ui elements */
    let vbox= new St.BoxLayout({style_class: 'nvpn-menu-vbox'});
    vbox.set_vertical(true);
    let hbox2= new St.BoxLayout({style_class: 'nvpn-menu-hbox'});
    let label1= new St.Label({style_class: 'label-nvpn-menu', text: _("NordVPN")});

    hbox2.add_child(label1);

    /** this private member is the part of the server info that is an adaptable
     * text according to status */
    this._label_status= new St.Label({style_class: 'label-nvpn-status'});
    /** this private member is the text label that will display the current nordvpn connected
     * server name */
    this.label_connection= new St.Label({style_class: 'label-nvpn-connection', text: '--'});


    hbox2.add_child(this._label_status);

    vbox.add_child(hbox2);
    vbox.add_child(this.label_connection);

    this._main_menu.actor.add(vbox, {expand: true, x_fill: false});



    /**
     * Adding the text elements that will display the infos
     * about the currently connected server
     */
    let vbox3= new St.BoxLayout({style_class: 'nvpn-menu-vbox3'});
    vbox3.set_vertical(true);

    this._location_label= new St.Label({style_class: 'label-server-info', text: '*,*', x_align: St.Align.END});
    vbox3.add_child(this._location_label);
    this._ip_label= new St.Label({style_class: 'label-server-info', text: "Shown IP: ....", x_align: St.Align.END});
    vbox3.add_child(this._ip_label);
    this._tech_label= new St.Label({style_class: 'label-server-info', text: "Technology: ....", x_align: St.Align.END});
    vbox3.add_child(this._tech_label);
    this._transfer_label= new St.Label({style_class: 'label-server-info', text: "↑ - ; ↓ - ", x_align: St.Align.END});
    vbox3.add_child(this._transfer_label);
    this._uptime_label= new St.Label({style_class: 'label-server-info', text: "uptime: ", x_align: St.Align.END});
    vbox3.add_child(this._uptime_label);

    this._serverInfosItem= new PopupMenu.PopupBaseMenuItem({
      reactive: false
    });

    this._serverInfosItem.actor.add(vbox3, {expand: true, x_fill: true});

    this.menu.addMenuItem(this._serverInfosItem);
    this._serverInfosItem.actor.hide();

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());


    /** Adding the buttons that will respectively show/hide the submenus
     *  corresponding to the 'Location/group connection picker', the 
     *  'server specifier' and the 'option toggles'
     */
    let hbox3= new St.BoxLayout();

    let ic0= new St.Icon({icon_name:'mark-location-symbolic'});
    this.v3_button0= new St.Button({
			reactive: true,
			can_focus: true,
      track_hover: true,
			style_class: 'system-menu-action sub-menu-btn',
      child:ic0});
    hbox3.add_child(this.v3_button0);
    
    let ic1= new St.Icon({icon_name:'network-server-symbolic'});
    this.v3_button1= new St.Button({
			reactive: true,
			can_focus: true,
      track_hover: true,
			style_class: 'system-menu-action sub-menu-btn',
      child:ic1});
    hbox3.add_child(this.v3_button1);

    let ic2= new St.Icon({icon_name:'settings-symbolic'});
    this.v3_button2= new St.Button({
			reactive: true,
			can_focus: true,
      track_hover: true,
			style_class: 'system-menu-action sub-menu-btn',
      child:ic2});
    hbox3.add_child(this.v3_button2);


    this._itemSubmenusButtons= new PopupMenu.PopupBaseMenuItem({
      reactive: false
    });
    this._itemSubmenusButtons.actor.add(hbox3, { expand: true, x_fill: false});
    this.menu.addMenuItem(this._itemSubmenusButtons);

    this._id_c_btn2= this.v3_button1.connect('clicked', this.cb_serverManagement.bind(this));
    this._id_c_btn3= this.v3_button0.connect('clicked', this.cb_locationPick.bind(this));
    this._id_c_btn4= this.v3_button2.connect('clicked', this.cb_options.bind(this));;



    /** this private member is the implementation of the submenu that allows to select
     *  a nordvpn server by clicking on the country */
    this._submenuPlaces= new SubMenus.LocationsMenu();
    
    this.menu.addMenuItem(this._submenuPlaces);

    /** when an item of this submenu (i.e. a place name) is selected,
     *  the '_place_menu_new_selection()' method will be called (no argument). */
    this._submenuPlaces.select_callback(this._place_menu_new_selection.bind(this));

    /** the locations menu is pending
     *  will be only filled on first click/opening*/
    this._location_update_pending= true;


    /** this private member is the implementation of the submenu that allows to select
     *  to input a server name to connect to it */
    this._submenuServer= new SubMenus.ServerSubMenu();
    
    /** when a server name is entered,
     *  the 'server_entry()' method will be called (server name as argument). */
    this._submenuServer.newServerEntry_callback(this.server_entry.bind(this));

    this.menu.addMenuItem(this._submenuServer);


    /** this private member is the implementation of the submenu that allows to select
     *  to toggle different option of the nordvpn tool */
    this._submenuOptions= new SubMenus.OptionsSubMenu();

    /** when an option is toggled,
     *  the 'option_changed()' method will be called
     *  (the option name (string) and its new value (string) as arguments).*/
    this._submenuOptions.set_optionChangeCallBack(this.option_changed.bind(this));

    this.menu.addMenuItem(this._submenuOptions);

    /** when a fav'd server has been clicked,
     *  a call to the '_serv_fav_cliked()' method
     */
    this._id_sm_1= this._submenuServer.connect('server-fav-connect', this._serv_fav_cliked.bind(this));

    this._id_sm_2= this._submenuServer.connect('location-connect', this._serv_fav_cliked.bind(this));
    



    this.menu.addMenuItem(this._main_menu, 0);
    /** adding a sperator int his menu to separate the 'information display' part
     *  from the 'connection interface' part*/
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    /** creating the menu item that contains the 'connection' menu button */
    let _itemCurrent2 = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
    let vbox2= new St.BoxLayout({style_class: 'nvpn-menu-vbox2'});
    vbox2.set_vertical(true);

    this.action_button= new St.Button({style_class: 'nvpn-action-button', label: _("Quick Connect")});

    /** saving this id for later disconnection of the signal during object's destruction */
    this._id_c_btn1= this.action_button.connect('clicked', this._button_clicked.bind(this));
    vbox2.add_child(this.action_button);

    _itemCurrent2.actor.add(vbox2, { expand: true});
    this.menu.addMenuItem(_itemCurrent2);

    /** Adding the menu item that displays a message when the CLI tool version
     * doesn't match the expected version number */
    let cur_ver= this._getCliToolCurrentVersion();
    this._versionChecker= new SubMenus.VersionChecker(NORDVPN_TOOL_EXPECTED_VERSION, cur_ver);
    
    this.menu.addMenuItem(this._versionChecker);

    /** Choosing to show the message or not according to the Gnome Settings
     * current or changing state, and if the the nordvpn CLI tool is 
     * effectively installed */
    if(!SETTINGS.get_boolean('version-check') || !this._is_NVPN_found()){
      this._versionChecker.actor.hide();
    }
    this.SETT_SIGS[2]= SETTINGS.connect('changed::version-check', () => {
      if(SETTINGS.get_boolean('version-check')
          && (this._versionChecker.compareResult()<0)
          && (this._is_NVPN_found()))
      {
        this._versionChecker.actor.show();
      }
      else{
        this._versionChecker.actor.hide();
      }
    });

    /** update the 'locations menu' and 'recent locations' display in case the option
     *  value changes*/
    this.SETT_SIGS[3]= SETTINGS.connect('changed::target-display-mode', () =>{
      this._udpate_location_submenu();
    });


    this._shell_checker= new SubMenus.MessageItem(
      "Extension can't use the given shell \""+this._cmd.command_shell
      + "\".\nTry setting another shell (or change its path) within this "
      + "extension's settings page"
    );

    this.menu.addMenuItem(this._shell_checker);


    /** @member {enum} currentStatus
     *  member that stored the current status designating the current state of the interaction
     *  with the 'nordvpn' tool */
    this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;
    /** call to the private '_update_status_and_ui()' method that updates the ui and the currentStatus
     *  according to the current state provided of the 'nordvpn tool' */
    this._update_status_and_ui()
    this._update_displayed_server_infos(true);

    /**
     * Access the 'refresh-delay' gSettings and connects any change to ensure it will take effect
     * within this extension
     */
    this._refresh_delay= SETTINGS.get_int('refresh-delay');
    this.SETT_SIGS[1]= SETTINGS.connect('changed::refresh-delay', () => {
      this._refresh_delay= SETTINGS.get_int('refresh-delay');
    });
    /** this private member is a boolean that is used (when 'true') to keep the ui from updating during
     *  a connection transition, for instance */
    this._vpn_lock= false;
    /** call to the private method '_vpn_survey()' to start "the monitoring loop "
     *  that update the ui in case of a 'norvdpn' tool state change */
    this._vpn_survey();

    var max= Math.max(this.menu.actor.width,
      this._submenuServer.menu.actor.width,
      this._submenuPlaces.menu.actor.width,
      this._submenuOptions.menu.actor.width
    );
    this.menu.actor.width=hbox3.actor.width + max;


    /** flag used to inform if a connexion should be registered or not as a "recent connexion"*/
    this._unregister_next_connexion= false;
  }

  /**
   *  Disconnect the ui signals before the object's destruction
   *  @method
   */
  _onDestroy(){
    this.disconnect(this._id_c_click1);
    this._id_c_click1= 0;

    this.action_button.disconnect(this._id_c_btn1);
    this._id_c_btn1= 0;

    this.action_button.disconnect(this._id_c_btn2);
    this._id_c_btn2= 0;

    this.action_button.disconnect(this._id_c_btn3);
    this._id_c_btn3= 0;

    this.action_button.disconnect(this._id_c_btn4);
    this._id_c_btn4= 0;

    this._submenuServer.disconnect(this._id_sm_1);
    this._id_sm_1= 0;

    this._submenuServer.disconnect(this._id_sm_2);
    this._id_sm_2= 0;

    for(var i= 0; i<this.SETT_SIGS.length; ++i){
      if(this.SETT_SIGS[i])
        SETTINGS.disconnect(this.SETT_SIGS[i]);
    }

    if(this._cmd){
      this._cmd.destroy();
    }

    this._submenuPlaces.destroy();
    this._submenuServer.destroy();
    this._submenuOptions.destroy();

    super.destroy();
  }

  /** Private method that fetchs the current version of the NordVPN CLI tool
   *  by invoking the appropriate command
   *  @method
   *  @returns {string} the string that matches the found version ("0.0" if not found)
   */
  _getCliToolCurrentVersion(){
    let t= this._cmd.exec_sync('get_version');
    let txt= (t!==undefined && t!==null && this._is_NVPN_found)? t
              :"0.0";
    return txt;
  }

  /** Private method that fetchs the 'groups' and 'country' lists given by the CLI
   * @method
   * @returns {object} a couple that contains the 2 lists as fields 'groups' and 'countries',
   *          object can be null (if call failed), or fields can be null (if results unreadable) 
   */
  _getGroupsAndCountries(){
    /** anonymous function to suppress empty entries or invalid of lsit */
    let _clearEmpty= (t) => {
      var i=0;
      while(i<t.length){
        if(t[i]) ++i;
        else t.splice(i,1);
      }
    }
    
    /** calling command, initiating objects… */
    let t= this._cmd.exec_sync('get_groups_countries');
    let r= (t===undefined || t===null || t==='')? null : {'groups':null,'countries':null};
    var tmp= [];
    /** processing the command results and storing result */
    if(r){
      tmp= t.split('\n');
      r.groups= tmp[0].split(',');
      _clearEmpty(r.groups);
      if(tmp.length>1){
        r.countries= tmp[1].split(',');
        _clearEmpty(r.countries);
      }
    }

    return r;
  }

  /** Private commands that updates dynamically local attribute object that stores the 'countries'
   *  and 'groups' list given by the CLI
   *  @method
  */
  _updateGroupsAndCountries(){
    /** dynamically fetchs the lists */
    let gac= this._getGroupsAndCountries();
    
    /** update local attribute */
    this.targets.groups= ( gac && gac.groups )? gac.groups : [];
    this.targets.countries= ( gac && gac.countries )? gac.countries : [];
  }

  /** Private method used to hide or show the submenus and the associated buttons
   *  when need be.
   *  @method
   *  @param {boolean} b - Whether to show or not the submenus
   */
  _submenusVisible(b){
    if(b){
      this._submenuPlaces.actor.show();
      this._submenuServer.actor.show();
      this._submenuOptions.actor.show();
      this._itemSubmenusButtons.actor.show();
    }
    else{
      this._submenuPlaces.actor.hide();
      this._submenuServer.actor.hide();
      this._submenuOptions.actor.hide();
      this._itemSubmenusButtons.actor.hide();
    }
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool is available
   * @method
   * @return {boolean}
   */
  _is_NVPN_found(){
    // return (COMMAND_LINE_SYNC('hash nordvpn',2).length === 0);
    let t= this._cmd.exec_sync('command_shell', {}, 2);
    return (t !== undefined && t !== null)? (t.length === 0) : false;
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool has the 'Connected' status
   * @method
   * @return {boolean}
   */
  _is_NVPN_connected(){
    // return !(COMMAND_LINE_SYNC("nordvpn status | grep -Po ' [cC]onnected'").length===0);
    let t= this._cmd.exec_sync('tool_connected_check');
    return (t !== undefined && t !== null)? (t.length!==0) : false;
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool in connexion transition
   * (i.e. connecting or disconnecting from a server)
   * @method
   * @return {boolean}
   */
  _is_in_transition(){
    // return (COMMAND_LINE_SYNC("nordvpn status | grep -Po '[cC]onnecting'").length!==0);
    let t= this._cmd.exec_sync('tool_transition_check');
    return (t !== undefined && t !== null)? (t.length!==0) : false;
  }

  /**
   * Private method that determine whether or not the 'nordvpnd' systemd daemon is availabe to the
   * 'nordvpn' command line tool
   * @method
   * @return {boolean}
   */
  _is_daemon_unreachable(){
    // return !(COMMAND_LINE_SYNC("nordvpn status | grep -Po 'TransientFailure.*nordvpn.sock'").length===0);
    let t= this._cmd.exec_sync('daemon_unreachable_check');
    return (t !== undefined && t !== null)? !(t.length===0) : false;
  }

  /**
   * Private method that determine whether or not the user is logged in to use the 'nordvpn' command line tool
   * @method
   * @return {boolean}
   */
  _is_user_logged_in(){
    // return (COMMAND_LINE_SYNC("echo '' | nordvpn login | grep -Po 'already logged'").length!==0);
    let t= this._cmd.exec_sync('tool_logged_check');
    return (t !== undefined && t !== null)? (t.length!==0) : false;
  }

  /**
   * Private method that determine whether or not the user is logged in to use the 'nordvpn' command line tool
   * @method
   * @return {boolean}
   */
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
      else if(this._is_in_transition()){
        return NVPNMenu.STATUS.TRANSITION;
      }
      else{
        return NVPNMenu.STATUS.DISCONNECTED;
      }
    }
  }

  /**
   * Private method that determine the country according to server name
   * @method
   * 
   * @param {string} server string that is the server name (i.e. fr87, us88, etc.)
   * 
   * @returns {string} country corresponding the the server name, empty string if unfound
   */
  _getCountyFromServerName(server){
    var tsm= this._submenuPlaces;
    if((server) && (tsm)){
      let rgx= /([a-z]*)[0-9]*.*$/g;
      let arr= rgx.exec(server);
      if((arr!==null) && (arr[1]!==undefined)){
        /** we use the 'Country_Dict' const field, our country dictionnary, to obtain
          * the country name from the found country code */
        let country= Country_Dict[arr[1]];

        return (country)?country:"";
      }
    }

    return "";
  }

  /**
   * Private method that update this extension's current status, according to the 'nordvpn' command line tool's
   * state, and update the UI accordingly
   * @method
   */
  _update_status_and_ui(){
    if(this._cmd.command_shell_found()){ this._shell_checker.hide(); }
    else{ this._shell_checker.show(); }

    /** if the ui is lock, for reasons such as a connexion command is being passed, then abort */
    if(this._vpn_lock) return;
    /** the ui update locks other potential update, until it's done*/
    this._vpn_lock= true;
    /** use the '_get_current_status()' private method to set the 'currentStatus' attribute
     *  according to the 'nordvpn' command line tool's current state */
    let oldStatus= this.currentStatus;
    this.currentStatus= this._get_current_status();
    if(oldStatus===this.currentStatus){ this._vpn_lock= false; return; }

    /** allows the ui menu to be open on user click */
    this.setSensitive(true);

    /** update infos about the current server */
    this._update_displayed_server_infos(true);

    /** the following switch-case allows to update the relevant UI element according to the
     *  newly obtained value of the 'currentStatus' attribute */
    switch(this.currentStatus){
    case NVPNMenu.STATUS.DAEMON_DOWN:
    case NVPNMenu.STATUS.LOGGED_OUT:
    case NVPNMenu.STATUS.NOT_FOUND:
      this._label_status.text= (this.currentStatus===NVPNMenu.STATUS.LOGGED_OUT)?
                                _(" nordvpn tool not logged in")
                              : (this.currentStatus===NVPNMenu.STATUS.DAEMON_DOWN)?
                                _(" daemon disabled/missing ")
                              : _(" tool not found.");

      this.label_connection.text= "--";

      this.action_button.style_class= 'nvpn-action-button-help';
      this.action_button.label= _("Help?");

      this._panel_hbox.style_class='panel-status-menu-hbox-problem';
      this._panel_icon.icon_name= 'network-vpn-no-route-symbolic';

      /** submenus hidden */
      this._submenusVisible(false);

      break;
    case NVPNMenu.STATUS.TRANSITION:
      /** call to the '_waiting_state()' private method that lock the ui in "waiting state" */
      this._waiting_state();

      break;
    case NVPNMenu.STATUS.CONNECTED:
      this._label_status.text= _(" connected to");

      this.label_connection.text= "- "+this.server_info.serverName+" -";
      this.action_button.style_class= 'nvpn-action-button-dq';
      this.action_button.label= _("Disconnect");

      this._panel_hbox.style_class='panel-status-menu-hbox-connected';
      this._panel_icon.icon_name= 'network-vpn-symbolic';

      /** enbales the submenus to show*/
      this._submenusVisible(true);
      
      /** mark appropriate country as selected in the locations list */
      let country= this._getCountyFromServerName(this.server_info.serverName);
      if(country){
        this._submenuPlaces.select_from_name(country);
      }

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
    default:
      this._label_status.text= _(" disconnected.");

      this.label_connection.text= "--";

      this.action_button.style_class= 'nvpn-action-button';
      this.action_button.label= _("Quick Connect (default)");

      this._panel_hbox.style_class='panel-status-menu-hbox';
      this._panel_icon.icon_name= 'network-vpn-offline-symbolic';

      this._submenusVisible(true);
      /** call to the 'unselect_no_cb()' private method to clear the country server connection menu
       *  ui from any selected country */
      this._submenuPlaces.unselect_no_cb();

      break;
    }
    /** unlock ui update */
    this._vpn_lock= false;
  }

  /**
   * Private method that updates the stored data
   * about the currently connected server
   */
  _update_server_info(){
    if(this.currentStatus === NVPNMenu.STATUS.CONNECTED){
      let t= this._cmd.exec_sync('current_server_get');
      this.server_info.process(t);
    }
    else{
      this.server_info.reset();
    }
  }

  /**
   * Private method that updates the displayed data
   * about the currently connected server, according
   * to the current state of the stored data
   * 
   * @param {boolean} updateData set to true if the stored
   *  data about the server should be update (with a call to
   *  the '_update_server_info()' method) 
   */
  _update_displayed_server_infos(updateData=false){
    if(updateData){
      this._update_server_info();
    }

    this._location_label.text= '* '+this.server_info.city+' ,'+this.server_info.country+' *';
    this._ip_label.text= "Shown IP: "+this.server_info.ip.join('.');
    this._tech_label.text= "Technology: "+ ((this.server_info.isOpenVPN())?
                                              ("OpenVPN / " + (this.server_info.isUDP()?"udp":"tcp"))
                                            : "NordLynx")
    this._transfer_label.text= "↑ "+this.server_info.transferData.sent.data+" "+this.server_info.transferData.sent.unit+
                                " ; ↓ "+this.server_info.transferData.recv.data+" "+this.server_info.transferData.recv.unit;
    this._uptime_label.text= "uptime: "+this.server_info.uptimeInfoString;

    /**
     * this data is only to be displayed (shown/visible) when the server is connected
     */
    if(this.server_info.isConnected()) this._serverInfosItem.actor.show();
    else this._serverInfosItem.actor.hide();
  }

  /**
   * Private method that puts the ui in the blocked "waiting state"
   * @method
   */
  _waiting_state(){
      this.currentStatus= NVPNMenu.STATUS.TRANSITION;
      this._transition_time_out= 0;

      /** menu won't open on click */
      this.setSensitive(false);
      /** menu is closed (if opened) */
      this.menu.close();
      this._panel_icon.icon_name= 'network-vpn-acquiring-symbolic';
      this._panel_hbox.style_class='panel-status-menu-hbox-transition';
  }

  /**
   * Private method that iniate a connection through the 'nordvpn' command line tool
   * 
   * @method
   * @param {string} placeName - optional, the place name (i.e. country, server, ...) to connect to
   *          Also can specify a 'group + location' connexion attempt if string formated
   *            as "[Group] location"
   */
  _nordvpn_quickconnect(placeName=""){
    var loc= placeName;
    /** nordvpn 3.4 update feature:
     *  Integrated the feature that allow to specify a group along location (i.e. P2P + France)
     *  the given string has to be formated as follow '[Group] location' (i.e. "[P2P] France")
     *  Therefore, the following extracts the group and location from this format
     *  and transforms it has the appropriate argument for the connect command
     *  (i.e. "-group P2P France")*/
    var plc_grp= MyUtils.locationToPlaceGroupPair(placeName);
    if(Boolean(plc_grp)){
      loc= (plc_grp.place===plc_grp.group) ?
            plc_grp.place
          : "-group "+plc_grp.group+' '+plc_grp.place;
    }

    /** if the live monitoring of the vpn connection state in on (through the boolean
     *  attribute 'nvpn_monitor') */
    if(this.nvpn_monitor){

      /** locking any potential parallel auto ui update (through activate monitoring),
       *  to allow the following bit to call for a connect, setting the 'waiting state' ui,
       *  and making sure (forcing) the transition status is set, to avoir breaking interference */
      this._vpn_lock= true;

      /** if the nordvpn tool isn't is a usable state (not found, logged out, or daemon disabled),
       *  the process must be aborted and updating accordingly the ui */
      if (this._get_current_status() < NVPNMenu.STATUS.TRANSITION){
        this._update_status_and_ui();
      }
      else{
        /** asynchronous connection call */
        let t= this._cmd.exec_async('server_place_connect', {'target': loc});

        /** the 'recent location' submenu supports the '[grp] loc' format */
        this._recent_connection(
          (Boolean(plc_grp) && plc_grp.place===plc_grp.group) ?
              plc_grp.place
            : placeName
        );

        if(t!==undefined && t!==null) this._waiting_state();
      }

      /** unlocking ui updates */
      this._vpn_lock= false;
    }
    else{
      /** (if no live monitoring) synchronous connection call (freezes the ui in the
       *  meantime) */
      this._cmd.exec_sync('server_place_connect', {'target': loc});

      /** inform 'recent connection' menu of the attempt */
      this._recent_connection(placeName);
    }

    /** once the connexion attempt made, the co-joint goup is unselected (if any) */
    if(Boolean(this._submenuPlaces)){
      this._submenuPlaces.unselectGroup();
    }
  }

  /**
   * Private method that iniate a disconnection through the 'nordvpn' command line tool
   * @method
   */
  _nordvpn_disconnect(){
    /** if the live monitoring of the vpn connection state in on (through the boolean
     *  attribute 'nvpn_monitor') */
    if(this.nvpn_monitor){

      /** locking any potential parallel auto ui update (through activate monitoring),
       *  to allow the following bit to call for a disconnect, setting the 'waiting state' ui,
       *  and making sure (forcing) the transition status is set, to avoir breaking interference */
      this._vpn_lock= true;

      /** if the nordvpn tool isn't is a usable state (not found, logged out, or daemon disabled),
       *  the process must be aborted and updating accordingly the ui */
      if (this._get_current_status() < NVPNMenu.STATUS.TRANSITION){
        this._update_status_and_ui();
      }
      else{
      /** asynchronous disconnection call */
        let t= this._cmd.exec_async( 'server_disconnect' );


        if(t!==undefined && t!==null ) this._waiting_state();
      }

      /** unlocking ui updates */
      this._vpn_lock= false;
    }
    else{
      /** (if no live monitoring) synchronous disconnection call (freezes the ui in the
       *  meantime) */
      this._cmd.exec_sync('server_disconnect');
    }
  }

  /**
   * Private method that iniate a reconnection (i.e.: connection to another server if already
   * connected to one)
   * @param {string} placeName - optional, the place name (i.e. country, server, ...) to reconnect to
   * @method
   */
  _nordvpn_ch_connect(placeName=""){
    if(placeName){
      this._waiting_state();
      this._nordvpn_quickconnect(placeName);

    }

  }

  /**
   * Private method called when the action button of the menu (connect/disconnect) is pressed
   * @method
   */
  _button_clicked(){
    /** the apearance and behavior of the button changes according to the current status */
    switch(this.currentStatus){
    /** these states are not supposed to display the button, so nothing is done */
    case NVPNMenu.STATUS.NOT_FOUND:
    case NVPNMenu.STATUS.LOGGED_OUT:
    case NVPNMenu.STATUS.DAEMON_DOWN:
      Gio.app_info_launch_default_for_uri(
        "https://github.com/AlexPoilrouge/NordVPN-connect/blob/master/README.md#help",
        global.create_app_launch_context(0, -1)
      );


      break;
    case NVPNMenu.STATUS.TRANSITION:
      this._cmd.exec_async( 'server_disconnect' );

      this._update_status_and_ui();

      break;
    /** allows to connect when status is 'disconnected' */
    case NVPNMenu.STATUS.DISCONNECTED:
      if(!(this._submenuServer.menu.isOpen) || this._submenuServer.isEntryEmpty()){
        let strPlace= this._submenuPlaces.LastSelectedPlaceName;
        if(strPlace.length===0){
          this. _nordvpn_quickconnect();
        }
      }
      else{
        this._submenuServer._newServerEntry();
      }

      break;
    /** allows to disconnect when status is 'connected' */
    case NVPNMenu.STATUS.CONNECTED:
      this._nordvpn_disconnect();


      break;
    }

    /** if no live monitoring, the ui will be updated now */
    if(!this.nvpn_monitor){
      this._update_status_and_ui();
    }
  }

  /**
   *  Private method that simply gives a list of available countries to select a
   *  server from
   *  @method
   *  @returns {StringList} - The sorted string list of available countries
   */
  _get_countries_list(){
    /** We build our list from all the entries in the const field 'Country_Dict' */
    let l=[];
    for (let country in Country_Dict){
      l.push(Country_Dict[country]);
    }

    /** Returns a sorted version */
    return l.sort();
  }

  /**
   *  Private method that fills the country connection submenu with all the
   *  required country names
   *  @method
   */
  _fill_country_submenu(){
    /** get the country name list by calling the private method '_get_countries_list()' */
    let country_list= this. _get_countries_list();
    let tsm= this._submenuPlaces;

    Group_List.forEach(function(elmt){
      tsm.add_place(elmt,SubMenus.LOCATION_TYPE.GROUP)
    });

    /** foreach element in this list, it is added as an item to the submenu */
    country_list.forEach(function(elmt){
      /** using the 'LocationsMenu' object's method 'addPlace' to add this country name to
       *  this submenu */
      tsm.add_place(elmt);
    });
  }

  /**
   *  Private method that fills the country connection submenu with all the
   *  required country and groups, according to data stored with the local
   *  'targets' attributes object, and the 'displayMode' option value
   *  @method
   *  @param {integer} displayMode the value corresponding to the wanted displayMode option
   */
  _fill_country_submenu_b(displayMode){    
    var tmp= this.targets.countries;
    let c_list= (tmp)? tmp : [];
    tmp= this.targets.groups;
    let g_list= (tmp)? tmp : [];

    let tsm= this._submenuPlaces;

    /** the 'displayMode' value will affect the "style" in which the items are
     *  displayed, along with their nature (groups or countries) */
    if(displayMode===SubMenus.LOCATIONS_DISPLAY_MODE.AVAILABLE_ONLY){
      var b_noDynItem= false;
      if( (b_noDynItem=(c_list.length===0 && g_list.length===0)) ){
        c_list= this._get_countries_list();
        g_list= Group_List;
      }

      if(b_noDynItem){
        g_list.forEach(function(grp) {
          //add crossed
          tsm.add_place(grp, SubMenus.LOCATION_TYPE.GROUP, SubMenus.LOCATION_ITEM_STATE.FORCED);
        });
        c_list.forEach(function(cntry) {
          //add crossed
          tsm.add_place(cntry, SubMenus.LOCATION_TYPE.COUNTRY, SubMenus.LOCATION_ITEM_STATE.FORCED);
        });
      }
      else{
        g_list.forEach(function(grp) {
          //add normal
          tsm.add_place(grp, SubMenus.LOCATION_TYPE.GROUP);
        });
        c_list.forEach(function(cntry) {
          //add normal
          tsm.add_place(cntry);
        });
      }

    }
    else if(displayMode===SubMenus.LOCATIONS_DISPLAY_MODE.DISCRIMINATE_DISPLAY){
      let cl= this._get_countries_list();
      let gl= Group_List;

      gl.forEach(function(grp) {
        if(g_list.includes(grp)){
          //add normal
          tsm.add_place(grp, SubMenus.LOCATION_TYPE.GROUP);
        }
        else{
          //add crossed
          tsm.add_place(grp, SubMenus.LOCATION_TYPE.GROUP, SubMenus.LOCATION_ITEM_STATE.UNAVAILABLE);
        }
      })

      cl.forEach(function(cntry) {
        if(c_list.includes(cntry)){
          //add normal
          tsm.add_place(cntry);
        }
        else{
          //add crossed
          tsm.add_place(cntry, SubMenus.LOCATION_TYPE.COUNTRY, SubMenus.LOCATION_ITEM_STATE.UNAVAILABLE);
        }
      })
    }
    else{ //displayMode===SubMenus.LOCATIONS_DISPLAY_MODE.SHOW_ALL
      c_list= this._get_countries_list();
      g_list= Group_List;

      g_list.forEach(function(elmt){
        tsm.add_place(elmt,SubMenus.LOCATION_TYPE.GROUP)
      });
  
      /** foreach element in this list, it is added as an item to the submenu */
      c_list.forEach(function(elmt){
        /** using the 'LocationsMenu' object's method 'addPlace' to add this country name to
         *  this submenu */
        tsm.add_place(elmt);
      });
    }
  }

  /** Private method that dynamically (according to CLI) update the display of the
   *  location items, in function of the current displayMode option value
   */
  _udpate_location_submenu(){
    let tsm= this._submenuPlaces;

    /** fetchs the current value of 'displayMode' option */
    let displayMode= SETTINGS.get_int('target-display-mode');

    /** clear the location list, dynamically fetches the value, and fills
     *  back the menu*/
    tsm.clearAllLocations();
    this._updateGroupsAndCountries();
    this._fill_country_submenu_b(displayMode);
    tsm.select_from_name(tsm.LastSelectedPlaceName);

    /** update the styles of the 'recentLocations' menu's items */
    this._update_recent_location_submenu(displayMode);
  }

  /** Private method that updates the style in which the items of 'recentLocations' menu
   *  are displayed according to the 'displayMode' option value
   * 
   *  @param {integer} displayMode the value corresponding to the wanted displayMode option
   */
  _update_recent_location_submenu(displayMode){
    let ssm= this._submenuServer;
  
    var tmp= this.targets.countries;
    let c_list= (tmp)? tmp : [];
    tmp= this.targets.groups;
    let g_list= (tmp)? tmp : [];

    ssm.updateRecentLocationDisplay(displayMode, c_list, g_list);
  }

  /**
   *  Private method that is used as the callback method when an item in the country connection submenu is
   *  clicked by the user.
   *  @method
   *  @param {string} placeName - the callback is supposed to give the name of the selected place as argument
   */
  _place_menu_new_selection(placeName){
    var loc=placeName
    /** nordvpn v3.4 feature -
     *  if a co-joint group is selected, format the location as following '[group] location'
     */
    let s_grp= (Boolean(this._submenuPlaces))?this._submenuPlaces.SelectedGroupName:null;
    if(s_grp){
      loc= '['+s_grp+"] "+placeName;
    }

    /** Connection to this placeName if the current status is 'Disconnected' */
    if(this.currentStatus===NVPNMenu.STATUS.DISCONNECTED){
      this._nordvpn_quickconnect(loc);
    }
    else{
      if(this._submenuPlaces){
        this._submenuPlaces.unselect_current();
      }

      /** if the current status is 'connected' */
      if((this.currentStatus===NVPNMenu.STATUS.CONNECTED)){
        /** and, if the placeName is not empty, a 'reconnection' has to be made, using the
         *  '_nordvpn_ch_connect' private method */
        if(loc.length!==0){
          this._nordvpn_ch_connect(loc);
        }
        /** if placeName not empty, a reconnection cannot be made, so only a disconnection is made */
        else{
          this._nordvpn_disconnect();
        }
      }
    }

    /** if live monitoring isn't enabled, the ui update will be done now */
    if(!this.nvpn_monitor){
      this._update_status_and_ui();
    }
  }

  /**
   * This private method implements the 'live monitoring' loops that is repeated the periodically
   * check any change of connection status or availability of the 'nordvpn' command line tool
   * @method
   */
  _vpn_survey(){
    if(!this.nvpn_monitor) return;

    /** if no lock, on or by the ui update */
    //if(!this._vpn_lock){
      /** calls the '_vpn_check()' private method, that checks said potential changes, and makes
       *  update or connection calls if necessary */
      this._vpn_check();

      /** updating timeout ?  */
      if(this._vpn_timeout){
        Mainloop.source_remove(this._vpn_timeout);
        this._vpn_timeout= null;
      }
    //}

    /** recall itself, creating a separate loop, in 2 second (=timeout) */
    this._vpn_timeout= Mainloop.timeout_add_seconds(this._refresh_delay,this._vpn_survey.bind(this));
  }

  /**
   * Private method that implements the necessity of status change check, necessary for the
   * 'live monitoring'. If a change (i.e. an incoherence between currentStatus and reality of
   * the state of the vpn connection or state of the 'nordvpn' command line tool.
   * @method
   */
  _vpn_check(){
    /** boolean that will be set to true when change is detected */
    let change= false;

    let t= undefined;

    switch(this.currentStatus){
    /** when state is 'logged out', check for login state */
    case NVPNMenu.STATUS.LOGGED_OUT:
      change= this._is_user_logged_in();

      break;
    /** when the status is 'nordvpn tool not found' makes a check for this tool presence */
    case NVPNMenu.STATUS.NOT_FOUND:
      change= this._is_NVPN_found();

      break;
    /** when the status is 'daemon not operating', makes a check for the availabily of this deamon */
    case NVPNMenu.STATUS.DAEMON_DOWN:
      // change= ( COMMAND_LINE_SYNC("systemctl is-active nordvpnd | grep '\bactive'").length!==0 );
      t= this._cmd.exec_sync('daemon_online_check');
      change= ( t!==undefined && t!==null && t.length!==0 );

      break;
    /** when the status is 'in transition', checks if this is still the case */
    case NVPNMenu.STATUS.TRANSITION:
      this._transition_time_out+= this._refresh_delay;

      change= (!(this._is_in_transition()));

      break;
    /** when the status is 'disconnected', check if there's a connection to a vpn */
    case NVPNMenu.STATUS.DISCONNECTED:
      // change= ( COMMAND_LINE_SYNC("ifconfig -a | grep tun0").length!==0 );
      t= this._cmd.exec_sync('vpn_online_check');
      change= ( t!==undefined && t!==null && t.length!==0 );

      break;
    /** when the status is 'connected', chech if there's still a connection to a vpn */
    case NVPNMenu.STATUS.CONNECTED:
      // change= ( COMMAND_LINE_SYNC("ifconfig -a | grep tun0").length===0 );
      t= this._cmd.exec_sync('vpn_online_check');
      change= ( t!==undefined && t!==null && t.length===0 );

      /** if a change is detected in this case, a particular disposition has to be made:
       *  the country selection submenu has to be clear of any selection*/
      if(change){
        this._submenuPlaces.unselect_no_cb();
      }

      break;
    }

    /** if a change has been detected, a ui update is needed */
    if (change){
      this._update_status_and_ui();
    }
  }

  /**
   *  Method the enables/diables the 'live monitoring'
   *  @method
   *  @param {boolean} b - should be enabled?
   */
  set_monitoring(b){
    if(b!=this.nvpn_monitor){
      this.nvpn_monitor= b;

      /** if there was in fact a change of value, a the 'monitoring' is now enabled
       *  the survey is set, via a call to the private method '_vpn_survey()' */
      if(b){
        this._vpn_survey();
      }
    }
  }

  /** Method that set the value of the server specifier entry according to the
   *  current server the tool is connected to  
   *  @method
   */
  cb_serverManagement(){
    //this._submenuServer.setSeverEntryText(this.server_name);
    this._submenuServer.setSeverEntryText(this.server_info.serverName, this.server_info.city, this.server_info.country);

    this._submenuServer.menu.toggle();
  }

  /** Method used as a callback when one the server entry enters a new server to connect to.
   *  If server name valid, initiate connection to this server
   *  @method
   *  @param {string} txt - the string that represents the name of the server
   *                      (string must be in correct format)
   */
  server_entry(txt){
    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    //let arr= rgx.exec(this.server_name);
    let arr= rgx.exec(this.server_info.serverName);
    if((!arr) || (txt!==arr[1])){
      this._nordvpn_ch_connect(txt);
    }
  }

  /** Method used as a callback the option submenus interaction is to induce
   *  a change in siad options.
   *  @method
   *  @param {object} option - the option to modify
   *  @param {object} txt - string representing the new value of this option
  */
  option_changed(option, txt){
    let t= this._cmd.exec_sync('option_set', {'option': option, 'value': txt});


    /** these nvpn settings might affect the available locations lists.
     *  therefore they must be updated when these option values change.*/
    if( (option==="protocol" || option==="obfuscate" || option==="cybersec" || option==="technology") )
    {
      this._udpate_location_submenu();
    }

    if(SETTINGS.get_boolean('settings-change-reconnect') && this.server_info.isConnected()){
      if(this.server_info.city && option!=="notify"){
        /** use this flag to 'inform' that the location in this case should not
         *  be registered (by the recentLocations menu), since it's an automatic connexion*/
        this._unregister_next_connexion= true;
        this._nordvpn_ch_connect(this.server_info.city);
      }
    }
    /** ensure the options are displayed correctly (according to the CLI tool)
     * by forcing the display to match the actual state (of the CLI tool)
     * (only necessary when 'reconnect' option isn't on, since the menu closes otherwise)*/
    else{
      this.updateOptionsMenu();
    }
  }

  /** Method that updates the 'options' submenus */
  updateOptionsMenu(){
    let res= this._cmd.exec_sync('get_options');
    if (res!==undefined && res!==null){
    /** Generating the anonymous object as a dictionnary
     *  of all option names assiociated to their value*/
      let params= {};
      let optionsTxt= res.split(';');
      for(var i=0; i<optionsTxt.length; ++i){
        let k_v= optionsTxt[i].split(':');

        let k= k_v[0].replace(/[^0-9a-z]/gi, '');
        let v= k_v[1];
        v= (v==="enabled" || v==="true" || v==="1" || v==="on")? true
            : (v==="disabled" || v==="false" || v==="0" || v==="off")? false
              : v;

        params[k]= v;
      }

      /** updating the options submenu given the configuration that
       *  has just been generated
       */
      this._submenuOptions.updateFromOpt(params);
    }
  }

  /** Callback method, toggles 'location pick' submenu */
  cb_locationPick(){
    this._submenuPlaces.menu.toggle();
  }

  /** Callback method, update and toggles 'options' submenu */
  cb_options(){
    /** no need to update the 'options' submenu,
     *  if said submenu is closing*/
    if(!this._submenuOptions.menu.isOpen){
      this.updateOptionsMenu();
    }

    this._submenuOptions.menu.toggle();
  }

  /**
   * Callback for when a favourite server is clicked (presumably for connection)
   *  
   * @param {string} serv the server name to which try and connect
   */
  _serv_fav_cliked(item, serv){
    /** update location menus displays  */
    this._udpate_location_submenu();

    if(serv){
      this._place_menu_new_selection(serv);
    }
  }

  /**
   * Private method to inform the 'recent conenction' menu of a connexion attempt
   *  to a location. 
   * @method
   * 
   * @param {string} location the location to connect to (supports '[group] location' string format)
   */
  _recent_connection(location){
    if(location && !this._unregister_next_connexion){
      this._submenuServer.notifyRecentConnection(location);
      this._unregister_next_connexion= false;
    }
  }


});


/**
 * Called when extension is initialized
 * @function
 */
function init() {
    Convenience.initTranslations();
}

let _indicator;

/**
 * Called when extension is enabled
 * @function
 */
function enable() {
  /** Iniating the gSettings access */
  SETTINGS = Convenience.getSettings();

  SubMenus.init();
  
  /** creating main object and attaching it to the top pannel */
  _indicator= new NVPNMenu;
  Main.panel.addToStatusArea('nvpn-menu', _indicator, 0);
}

/**
 * Called when extension is disabled
 * @function
 */
function disable() {
  /** destruction of the main object */
  _indicator.destroy();
}

