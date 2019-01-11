
const St = imports.gi.St;
const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Tweener = imports.ui.tweener;

const Gio = imports.gi.Gio;

const Mainloop = imports.mainloop;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Util = imports.misc.util;
const GLib = imports.gi.GLib;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;




const COMMAND_SHELL= "/usr/bin/bash";

/**
 * Calls for a given shell command in a synchronous way
 * @function
 * @param {string} cmd - the shell command to execute
 * @param {number} descriptor - 1 (default) for the function to return the stdout output,
 *                              2 for stderr.
 * @returns {string} the stddout of the command's exectuion as a string
 */
function COMMAND_LINE_SYNC(cmd, descriptor=1){
  return ByteArray.toString(GLib.spawn_command_line_sync(COMMAND_SHELL + " -c \""+ cmd + "\"")[(descriptor>=2)?2:1]);
}

/**
 * Calls for a given shell command in an asynchronous way
 * @function
 * @param {string} cmd - the shell command to execute
 */
function COMMAND_LINE_ASYNC(cmd){
  GLib.spawn_command_line_async(COMMAND_SHELL + " -c \""+ cmd + "\"");
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
  fi: "Finland", nl: "Netherlands", uk: "United_Kingdom",//gb: "United_Kingdom",
  fr: "France", nz: "New_Zealand", us: "United_States",
  ge: "Georgia", no: "Norway", vn: "Vietnam"
};


/**
 * Class that implements an item to be inserted int the 'PlaceMenu' menu.
 */
class PlaceItem extends PopupMenu.PopupBaseMenuItem{
  /**
   * Constructor, also initializes the UI for the item
   */
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

  /**
   * method that marks the item (ui) as (un)selected
   * @method
   * @param {boolean} b - select if ture, unselect otherwise
   */
  select(b=true){
    if (b){
      this.checkIcon.show();
    }
    else{
      this.checkIcon.hide();
    }
  }

  /**
   * Getter for the (displayed) text of this item
   * @method
   * @returns {string} - the text displayed by this item, as a string
   */
  get PlaceName(){
    return this.placeName;
  }
};

/**
 * Class that implements the submenu use to pick a server by clicking
 * on a country name
 */
class PlacesMenu extends PopupMenu.PopupSubMenuMenuItem{
  /**
   * Initiate the attributes needed to maintain this menu
   * @method
   */
  constructor(){
    super(_("Select country"), true);

    /** this attribute will be use to store the 'callback' function
     *  that will be called whenever an item (i.e. country) of this submenu
     *  is selected */
    this.select_cb= null;
    /** attribute used to point on the item that is currently 'selected' */
    this.cur_selected=null;

    /** this attribute is a list that will be used to store the 'ids' generated
     *  when a signal connection is made with an item (in private method 'add_place()')
     *  so that these ids may be reused later to handle all the signal disonnections for
     *  all the items during this menu's destruction */
    this._ids_c_items= [];
  }

  /**
   * Destructor. Makes sure to disconnect all the signal connection made
   * for all the added items
   * @method
   */
  destroy(){
    let children= this.menu._getMenuItems();
    let diff= 0;
    for(let i=0; i<this.menu.length; ++i){
      let item= children[i];
      if(item!==undefined){
        item.disconnect(this._ids_c_items[i-diff]);
      }
      else{
        ++diff;
      }
    }

    super.destroy();
  }

  /**
   * Method to add a new country as an item to this menu
   * @method
   * @param {string} str_Place - the displayed name of the item (i.e. the country's name)
   */
  add_place(str_Place){
    /** creating the new item as an instance of 'PlaceItem' class */
    let item= new PlaceItem(str_Place);
    /** adding this item to the menu */
    this.menu.addMenuItem(item);

    /** setting the callback for when our item is click by the user, while not forgetting
     *  to store the 'connect id' for a later disconnection before destruction */
    let t= this;
    this._ids_c_items.push(
      item.connect('activate', this._item_select.bind(this,item))
    );
  }

  /**
   * Method to set the function that will be used as callback when an item is clicked.
   * @param {function} func - a function respecting this signature: void func(string)
   *   during the callbakc, the parameter passed to func will be the clicked item text
   *   (i.e. country name) passed as a string
   */
  select_callback(func=null){
    this.select_cb= func;
  }

  /**
   * Private method that is called when an item is click.
   * When the item is clicked, a callback to this method is made, with the said item
   * passed as argument. The method makes the necessary ui update and the menu's data
   * required adjustments, before calling the real callback function (pointed via the
   * attribute 'select_cb').
   * @method
   */
  _item_select(item){
    // log("[nvpn] item{pn="+item.PlaceName+"}.select("+(item==this.cur_selected).toString()+")");
    /** if there is an item currently selected (data), unselect it (ui) */
    if(this.cur_selected!=null){
      this.cur_selected.select(false);
    }

    /** if the item clicked is the one currently selected (data), then it is deselected (ui & data) */
    if(item==this.cur_selected){
      this.cur_selected= null;
      item.select(false);
    }
    /** otherwise, if the clicked is different from the one currently selected (data),
     *  make it the currently selected item (data) and select it (ui) */
    else{
      this.cur_selected= item;
      item.select();
    }

    /** make the requested call back (function pointed by attribute 'select_db'),
     *  with the currently selected item as string argument (empty string if nothing
     *  currently selected */
    this.select_cb(this.LastSelectedPlaceName);
  }

  /**
   * Getter to access the currently selected item in this country menu.
   * @method
   * @returns {string} coutnry name currently selected, empty string if nothing selected */
  get LastSelectedPlaceName(){
    if (this.cur_selected!=null){
      return this.cur_selected.PlaceName;
    }
    else {
      return "";
    }
  }

  /**
   * Method that unselects (ui and data) the currently selected country item
   * (if there is one)
   * @method
   */
  unselect_no_cb(){
    if (this.cur_selected!=null){
      this.cur_selected.select(false);
      this.cur_selected= null;
    }
  }

  /**
   * Method that allows to select an item by passing its (diplayed) text/name as argument.
   * @method
   * @param {string} placeName - the text of the item to be selected (data & ui). Of course it must
   *      be exactly matching, if no item with matching name in this menu, nothing will be selected.
   */
  select_from_name(placeName){
    /** browse every item in the menu */
    let children= this.menu._getMenuItems();
    for(let i=0; i<this.menu.length; ++i){
      let item= children[i];
      /** if this item text matches the 'placeName' argument,
       *  it is selected (ui & data) */
      if((item!==undefined) && (item.PlaceName===placeName)){
        /** if there already is a current selected item, firstly deselect it */
        if(this.cur_select!=null){
          this.cur_selected.select(false);
        }
        item.select();
        this.cur_selected= item;

        /** can't select multiple items, therefore once a match is met, ends the loop */
        break;
      }
      else if (item===undefined) {
        log("[nvpn] Error: got item (n=" + i.toString() + ") undefined looking for \"" + placeName + "\"...");
      }
    }
  }
};

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
  constructor(){
    super(0.0, _("NordVPN"));

    /** @member {boolean} nvpn_monitor
     *  whether or not the extension monitors the state of the connection to
     *  nordvpn servers
     *  (contrary is experimental) */
    this.nvpn_monitor= true;

    /** this private member is used while reconnecting to another server
     * i.e.: when user wants to switch server locations
     * if this string is not empty during deconnection, the code will try
     *  to reconnect to the location designated by this string after disconnecting*/
    this._auto_connect_to= "";

    /** this private member is the horyzontal layout box contaning the server indicator
     * in the panel area*/
    this._panel_hbox= new St.BoxLayout({style_class: 'panel-status-menu-hbox'});
    /** the icon in the top panel area (may change according to current status)*/
    this._panel_icon = new St.Icon({ icon_name: 'action-unavailable-symbolic',
                               style_class: 'system-status-icon' });
    this._panel_hbox.add_child(this._panel_icon);

    /** 'NVPN' panel text label*/
    let label_nvpn= new St.Label({style_class: 'label-nvpn-panel', text: 'NVPN '});
    this._panel_hbox.add_child(label_nvpn);
    this.actor.add_child(this._panel_hbox);

    /** saving this idea for later disconnection of the signal during object's destruction */
    this._id_c_click1= this.connect('clicked',
      /** when the panel is clicked, the extension performs a refresh of the menu's ui */
      function(){
        if(!this.nvpn_monitor){
          this._update_status_and_ui();
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

    // log('[nvpn] is nvpn found? '+ this._is_NVPN_found().toString());
    // log('[nvpn] is nvpn connected? '+ this._is_NVPN_connected().toString());
    // log('[nvpn] nvpn status? '+ this._get_current_status().toString());

    /** this private member is the part of the server info that is an adaptable
     * text according to status */
    this._label_status= new St.Label({style_class: 'label-nvpn-status'});
    /** this private member is the text label that will display the current nordvpn connected
     * server name */
    this.label_connection= new St.Label({style_class: 'label-nvpn-connection', text: '--'});


    hbox2.add_child(this._label_status);

    vbox.add_child(hbox2);
    vbox.add_child(this.label_connection);

    this._main_menu.actor.add(vbox, { expand: true });


    this.menu.addMenuItem(this._main_menu,0);
    /** adding a sperator int his menu to separate the 'information display' part
     *  from the 'connection interface' part*/
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    /** this private member is the implementation of the submenu that allows to select
     *  a nordvpn server by clicking on the country */
    this._submenu= new PlacesMenu();
    this.menu.addMenuItem(this._submenu);

    /** when an item of this submenu (i.e. a place name) is selected,
     *  the '_place_menu_new_selection()' method will be called (no argument). */
    this._submenu.select_callback(this._place_menu_new_selection.bind(this));

    /** call to private method that fill the 'country submenu' with all the required country name */
    this._fill_country_submenu();

    /** creating the menu item that contains the 'connection' menu button */
    let _itemCurrent2 = new PopupMenu.PopupBaseMenuItem({
            reactive: false
        });
    let vbox2= new St.BoxLayout({style_class: 'nvpn-menu-vbox2'});
    vbox2.set_vertical(true);

    this.label_action_btn= new St.Label({style_class: 'label-action-btn', text: _("Quick Connect")});
    this.action_button= new St.Button({style_class: 'nvpn-action-button', child:this.label_action_btn});

    /** saving this id for later disconnection of the signal during object's destruction */
    this._id_c_btn1= this.action_button.connect('clicked', this._button_clicked.bind(this));
    vbox2.add_child(this.action_button);

    _itemCurrent2.actor.add(vbox2, { expand: true });
    this.menu.addMenuItem(_itemCurrent2);

    /** @member {enum} currentStatus
     *  member that stored the current status designating the current state of the interaction
     *  with the 'nordvpn' tool */
    this.currentStatus= NVPNMenu.STATUS.DISCONNECTED;
    /** call to the private '_update_status_and_ui()' method that updates the ui and the currentStatus
     *  according to the current state provided of the 'nordvpn tool' */
    this._update_status_and_ui();

    /** this private member is a boolean that is used (when 'true') to keep the ui from updating during
     *  a connection transition, for instance */
    this._vpn_lock= false;
    /** call to the private method '_vpn_survey()' to start "the monitoring loop "
     *  that update the ui in case of a 'norvdpn' tool state change */
    this._vpn_survey();

    // log('[nvpn] nvpn server? '+ this. _get_server_text_info());
  }

  /**
   *  Disconnect the ui signals before the object's destruction
   *  @method
   */
  destroy(){
    this.disconnect(this._id_c_click1);
    this._id_c_click1= 0;
    this.action_button.disconnect(this._id_c_btn1);
    this._id_c_btn1= 0;

    super.destroy();
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool is available
   * @method
   * @return {boolean}
   */
  _is_NVPN_found(){
    return (COMMAND_LINE_SYNC('hash nordvpn',2).length === 0);
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool has the 'Connected' status
   * @method
   * @return {boolean}
   */
  _is_NVPN_connected(){
    return !(COMMAND_LINE_SYNC("nordvpn status | grep -Po ' [cC]onnected'").length===0);
  }

  /**
   * Private method that determine whether or not the 'nordvpn' command tool in connexion transition
   * (i.e. connecting or disconnecting from a server)
   * @method
   * @return {boolean}
   */
  _is_in_transition(){
    return (COMMAND_LINE_SYNC("nordvpn status | grep -Po '[cC]onnecting'").length!==0);
  }

  /**
   * Private method that determine whether or not the 'nordvpnd' systemd daemon is availabe to the
   * 'nordvpn' command line tool
   * @method
   * @return {boolean}
   */
  _is_daemon_unreachable(){
    return !(COMMAND_LINE_SYNC("nordvpn status | grep -Po 'Daemon.*unreachable'").length===0);
  }

  /**
   * Private method that determine whether or not the user is logged in to use the 'nordvpn' command line tool
   * @method
   * @return {boolean}
   */
  _is_user_logged_in(){
    return (COMMAND_LINE_SYNC("echo '' | nordvpn login | grep -Po 'already logged'").length!==0);
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
   * Private method that update this extension's current status, according to the 'nordvpn' command line tool's
   * state, and update the UI accordingly
   * @method
   */
  _update_status_and_ui(){
    /** if the ui is lock, for reasons such as a connexion command is being passed, then abort */
    if(this._vpn_lock) return;
    /** the ui update locks other potential update, until it's done*/
    this._vpn_lock= true;
    /** use the '_get_current_status()' private method to set the 'currentStatus' attribute
     *  according to the 'nordvpn' command line tool's current state */
    this.currentStatus= this._get_current_status();

    /** allows the ui menu to be open on user click */
    this.setSensitive(true);

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
      this.label_action_btn.text= _("Help?");

      this._panel_hbox.style_class='panel-status-menu-hbox-problem';
      this._panel_icon.icon_name= 'network-vpn-no-route-symbolic';

      /** country server connection menu disabled */
      this._submenu.actor.hide();

      break;
    case NVPNMenu.STATUS.TRANSITION:
      /** call to the '_waiting_state()' private method that lock the ui in "waiting state" */
      this._waiting_state();

      break;
    case NVPNMenu.STATUS.CONNECTED:
      this._label_status.text= _(" connected to");

      let server_txt= this._get_server_text_info();
      this.label_connection.text= server_txt;
      this.action_button.style_class= 'nvpn-action-button-dq';
      this.label_action_btn.text= _("Disconnect");

      this._panel_hbox.style_class='panel-status-menu-hbox-connected';
      this._panel_icon.icon_name= 'network-vpn-symbolic';

      /** enbales the country server connection menu and update the ui to shows the
       *  country corresponding to the current connected server as select */
      this._submenu.actor.show();
      /** e.g. if the country server connection menu has no country currently selected */
      if(this._submenu.LastSelectedPlaceName.length ===0){
        /** extracting the country code (i.e.: fr, us, uk, etc.) from the server name
         *  with a regex */
        let rgx= /- ([a-z]*)[0-9]*.*$/g;
        let arr= rgx.exec(server_txt);
        if((arr!==null) && (arr[1]!==undefined)){
          /** we use the 'Country_Dict' const field, our country dictionnary, to obtain
            * the country name from the found country code */
          let country= Country_Dict[arr[1]];
          if (country!==undefined){
            // log('[nvpn] finding '+country);
            /** we use the country menu object's method 'select_from_name' to update its ui
             *  so that the found country name is marked as selected */
            this._submenu.select_from_name(country);
          }
        }
      }

      break;
    case NVPNMenu.STATUS.DISCONNECTED:
    default:
      this._label_status.text= _(" disconnected.");

      this.label_connection.text= "--";

      this.action_button.style_class= 'nvpn-action-button';
      this.label_action_btn.text= _("Quick Connect (default)");

      this._panel_hbox.style_class='panel-status-menu-hbox';
      this._panel_icon.icon_name= 'action-unavailable-symbolic';

      this._submenu.actor.show();
      /** call to the 'unselect_no_cb()' private method to clear the country server connection menu
       *  ui from any selected country */
      this._submenu.unselect_no_cb();

      break;
    }
    /** unlock ui update */
    this._vpn_lock= false;
  }

  _get_server_text_info(){
    if(this.currentStatus === NVPNMenu.STATUS.CONNECTED){
      return "-"+
          COMMAND_LINE_SYNC("nordvpn status | grep -Po 'Current server: .*\\..*\\..*' | cut -d: -f2 | cut -d: -f2").replace(/(\r\n\t|\n|\r\t)/gm,"")
              +" -" ;
    }
    else{
      return "--";
    }
  }

  /**
   * Private method that puts the ui in the blocked "waiting state"
   * @method
   */
  _waiting_state(){
      /** menu won't open on click */
      this.setSensitive(false);
      /** menu is closed (if opened) */
      this.menu.close();
      this._panel_icon.icon_name= 'network-vpn-acquiring-symbolic';
      this._panel_hbox.style_class='panel-status-menu-hbox';
  }

  /**
   * Private method that iniate a connection through the 'nordvpn' command line tool
   * @method
   * @param {string} placeName - optional, the place name (i.e. country, server, ...) to connect to
   */
  _nordvpn_quickconnect(placeName=""){
    let cmd= "nordvpn c " + placeName;
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
        COMMAND_LINE_ASYNC( cmd );

        this._waiting_state();
      }

      /** if there is a reconnection, it is done with the connection step, or there is none to begin
          with. Either way we deativate it by emptying the private attribute '_auto_connect_to' */
      this._auto_connect_to="";

      /** unlocking ui updates */
      this._vpn_lock= false;
    }
    else{
      /** (if no live monitoring) synchronous connection call (freezes the ui in the
       *  meantime) */
      COMMAND_LINE_SYNC( cmd );
    }
  }

  /**
   * Private method that iniate a disconnection through the 'nordvpn' command line tool
   * @method
   */
  _nordvpn_disconnect(){
    let cmd= "nordvpn d";
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
        this._auto_connect_to="";
      }
      else{
      /** asynchronous disconnection call */
        COMMAND_LINE_ASYNC( cmd );

        this._waiting_state();
      }

      /** unlocking ui updates */
      this._vpn_lock= false;
    }
    else{
      /** (if no live monitoring) synchronous disconnection call (freezes the ui in the
       *  meantime) */
      COMMAND_LINE_SYNC( cmd );
    }
  }

  /**
   * Private method that iniate a reconnection (i.e.: connection to another server if already
   * connected to one)
   * @param {string} placeName - optional, the place name (i.e. country, server, ...) to reconnect to
   * @method
   */
  _nordvpn_ch_connect(placeName=""){
    if(placeName.length!==0){
      /** setting the private attribute '_auto_connect_to' to signify that a reconnection
       *  will have to be made, to that place, after the disconnection.
       *  In practice, the reconnection will be handled by the "live monitoring" ( '_vpn_check()'
       *  private method); when the vpn disconnection is set, and if '_auto_connect_to', at that
       *  time, isn't empty, a reconnection to the place designated by this attribute should be
       *  handled */
      this._auto_connect_to= placeName;
      this._nordvpn_disconnect();
    }
    /** if no live monitoring, the synchronous (re)connection must be called once the disconnection
     *  has been made */
    if(!this.nvpn_monitor){
      this._nordvpn_quickconnect(placeName);
    }

  }

  /**
   * Private method called when the action button of the menu (connect/disconnect) is pressed
   * @method
   */
  _button_clicked(){
    // log('[nvpn] button clicked?');
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

      break;
    /** allows to connect when status is 'disconnected' */
    case NVPNMenu.STATUS.DISCONNECTED:

      let strPlace= this._submenu.LastSelectedPlaceName;
      if(strPlace.length===0){
        this. _nordvpn_quickconnect();
        // log('[nvpn] -> sh -c \"nordvpn c\"?');
      }

      break;
    /** allows to disconnect when status is 'connected' */
    case NVPNMenu.STATUS.CONNECTED:
      this._nordvpn_disconnect();
        // log('[nvpn] -> sh -c \"nordvpn d\"?');


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
    let tsm= this._submenu;

    /** foreach element in this list, it is added as an item to the submenu */
    country_list.forEach(function(elmt){
      /** using the 'PlacesMenu' object's method 'addPlace' to add this country name to
       *  this submenu */
      tsm.add_place(elmt);
    });
  }

  /**
   *  Private method that is used as the callback method when an item in the country connection submenu is
   *  clicked by the user.
   *  @method
   *  @param {string} placeName - the callback is supposed to give the name of the selected place as argument
   */
  _place_menu_new_selection(placeName){
    // log("[nvpn] Clicked on " + placeName + " s= "+this.currentStatus.toString());
    /** Connection to this placeName if the current status is 'Disconnected' */
    if(this.currentStatus===NVPNMenu.STATUS.DISCONNECTED){
      this._nordvpn_quickconnect(placeName);
    }
    else{
      /** if the current status is 'connected' */
      if((this.currentStatus===NVPNMenu.STATUS.CONNECTED)){
        /** and, if the placeName is not empty, a 'reconnection' has to be made, using the
         *  '_nordvpn_ch_connect' private method */
        if(placeName.length!==0){
          this._nordvpn_ch_connect(placeName);
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
    if(!this._vpn_lock){
      /** calls the '_vpn_check()' private method, that checks said potential changes, and makes
       *  update or connection calls if necessary */
      this._vpn_check();

      /** updating timeout ?  */
      if(this._vpn_timeout){
        Mainloop.source_remove(this._vpn_timeout);
        this._vpn_timeout= null;
      }
    }

    /** recall itself, creating a separate loop, in 2 second (=timeout) */
    this._vpn_timeout= Mainloop.timeout_add_seconds(2,this._vpn_survey.bind(this));
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

    /** local reconnection function for factoring purposes */
    let _this= this;
    let _reconnection= function(){
      if(_this._auto_connect_to.length!==0){
          _this._nordvpn_quickconnect(_this._auto_connect_to);
        }
    };

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
      change= ( COMMAND_LINE_SYNC("systemctl status nordvpnd 2> /dev/null | grep 'active (running)'").length!==0 );

      break;
    /** when the status is 'in transition', checks if this is still the case */
    case NVPNMenu.STATUS.TRANSITION:
      change= (!(this._is_in_transition()) && this._auto_connect_to.length===0);

      /** if, while in transition, a change is detected, and if the attribute
       *  _auto_connect_to is set, then it means that a reconnection to the
       *  place designated by this attribute is pending. */
      if(change && this._auto_connect_to.length!==0){
        _reconnection();

        /** if there is a reconnection, then we're still in transition.
         *  No change is status and visual feedback necessary */
        change= false;
      }

      break;
    /** when the status is 'disconnected', check if there's a connection to a vpn */
    case NVPNMenu.STATUS.DISCONNECTED:
      change= ( COMMAND_LINE_SYNC("ifconfig -a | grep tun0").length!==0 );

      break;
    /** when the status is 'connected', chech if there's still a connection to a vpn */
    case NVPNMenu.STATUS.CONNECTED:
      change= ( COMMAND_LINE_SYNC("ifconfig -a | grep tun0").length===0 );

      /** if a change is detected in this case, a particular disposition has to be made:
       *  the country selection submenu has to be clear of any selection,
       *  and if the application is in the process of reconnection (recognized by the fact that the private attribute
       *  '_auto_connect_to' is a non empty string list) then lauchnes a connection to the target country server (designated
       *  by the value of '_auto_connect_to') */
      if(change){
        this._submenu.unselect_no_cb();

        if(this._auto_connect_to.length!==0){
           _reconnection();

          /** if there is a reconnection, then we're still in transition.
           *  No change is status and visual feedback necessary */
          change= false;
        }
      }

      break;
    }

    /** if a change has been detected, a ui update is needed */
    if (change){
      log("[nvpn] Change detected from "+this.currentStatus.toString());
      this._update_status_and_ui();
    }
  }

  /**
   *  Method the enables/diables the 'live monitoring'
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


};


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
    /** creating main object and attaching it to the top pannel */
    _indicator= new NVPNMenu;
    Main.panel.addToStatusArea('nvpn-menu', _indicator);
}

/**
 * Called when extension is disabled
 * @function
 */
function disable() {
    /** destruction of the main object */
    _indicator.destroy();
}

