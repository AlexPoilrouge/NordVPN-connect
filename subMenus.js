
const Atk= imports.gi.Atk;
const St = imports.gi.St;

const PopupMenu = imports.ui.popupMenu;



class HiddenSubMenuMenuItemBase extends PopupMenu.PopupSubMenuMenuItem{
    constructor(){
      super("",false);
      this.actor.remove_child(this.label);
      this.actor.remove_child(this._triangleBin);
      this.actor.height= 0;
    }
  };


  /**
   * Class that implements an item to be inserted int the 'PlaceMenu' menu.
   */
  class PlaceItem extends PopupMenu.PopupBaseMenuItem{
    static get TYPE() {
      return {
        COUNTRY: 0,
        CITY: 1,
        GROUP: 2,
      };
    }
  
    /**
     * Constructor, also initializes the UI for the item
     */
    constructor(str_Place, type=PlaceItem.TYPE.COUNTRY){
      super ();
  
      this.placeName= str_Place;
      this.type= type;
  
      this.checkIcon = new St.Icon({  icon_name: 'network-vpn-symbolic',
                                  style_class: 'countries_submenu_label_item_selected_icon' });
      this.actor.add(this.checkIcon);
  
      let label_item= new St.Label({
        style_class: (this.type===PlaceItem.TYPE.GROUP)?
                        'groups-submenu-label-item'
                        :'countries_submenu_label_item',
        text: this.placeName.replace(/_/gi,' ')}
      );
      this.actor.add(label_item);
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
class PlacesMenu extends HiddenSubMenuMenuItemBase{
    /**
     * Initiate the attributes needed to maintain this menu
     * @method
     */
    constructor(){
      super();
  
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
  
      let separator= new PopupMenu.PopupSeparatorMenuItem();
      this.menu.addMenuItem(separator);
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
    add_place(str_Place, type=PlaceItem.TYPE.COUNTRY){
      /** creating the new item as an instance of 'PlaceItem' class */
      let item= new PlaceItem(str_Place, type);
      /** adding this item to the menu */
      this.menu.addMenuItem(item,
                (type===PlaceItem.TYPE.GROUP)?0:undefined
        );
  
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
      /** if there is an item currently selected (data), unselect it (ui) */
      if(this.cur_selected!=null){
        this.cur_selected.select(false);
      }
  
      /** if the item clicked is the one currently selected (data), then it is deselected (ui & data) */
      if(item===this.cur_selected){
        this.cur_selected= null;
        item.select(false);
      }
      /** otherwise, if the clicked is different from the one currently selected (data),
       *  make it the currently selected item (data) and select it (ui) */
      else{
        this.cur_selected= item;
        item.select(item.type!==PlaceItem.TYPE.GROUP);
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
}


class ServerSubMenu extends HiddenSubMenuMenuItemBase{
  constructor(){
    super();

    this._err=false;

    let hbox= new St.BoxLayout();

    this.servEntry = new St.Entry({
      style_class: 'search-entry',
      can_focus: true,
      hint_text: _('Enter server name (e.g.: us285, fr42, etc.)'),
      track_hover: true,}
    );

    this.servEntry.get_clutter_text().connect( 'activate',
      this._newServerEntry.bind(this)
    );

    this.servEntry.get_clutter_text().connect( 'text-changed',
      () => {
        if(this._err){
          this.servEntry.style_class='nvpn-serv-entry';
          this._err= false;
        }
      }
    );
    this.menu.connect('open-state-changed',
      () => {
        if(this._err){
          this.servEntry.style_class='nvpn-serv-entry';
          this._err= false;
        }
      }
    );

    hbox.add_child(this.servEntry);

    let item= new PopupMenu.PopupBaseMenuItem({
      reactive: false
    });

    item.actor.add(hbox, { expand: true, x_fill: false});
    this.menu.addMenuItem(item);

    this.servEntry.width= 150;
  }

  setSeverEntryText(txt){
    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    let arr= rgx.exec(txt);
    if((arr!==null) && (arr[1]!==undefined)){
      this.servEntry.set_text(arr[1]);
    }
  }

  newServerEntry_callback(func= null){
    this.newServer_cb= func;
  }

  _newServerEntry(){
    let serv= this._getServerFromText(this.servEntry.text);
    if(serv){
      if(this.newServer_cb){
        this.newServer_cb(this.servEntry.text);
      }

      this.menu.close(true);
    }
    else if(this.isEntryEmpty()){
      this.menu.close(true);
    }
    else{
      this.servEntry.style_class='nvpn-serv-entry-error';
      this._err= true;
    }
  }

  _getServerFromText(txt){
    let ltxt= txt.toLowerCase();

    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    let arr= rgx.exec(ltxt);
    if((arr!==null) && (arr[1]!==undefined)){
      return arr[1];
    }
    else return undefined;
  }

  isEntryEmpty(){
    return this.servEntry.text.length===0;
  }
}

class OptionsSubMenuSwitchItem extends PopupMenu.PopupBaseMenuItem{
  constructor(text){
    super();

    this.actor.reactive= false;

    this.label = new St.Label({ text: text, });
    this.actor.label_actor= this.label;
    this.actor.add_child(this.label);
    this.actor.accessible_role = Atk.Role.CHECK_MENU_ITEM;

    this._switch= new PopupMenu.Switch(true);
    this._switch.actor.reactive= true;
    this._switch.actor.can_focus= true;
    this._switch.actor.active= true;

    this._statusBin = new St.Bin({ x_align: St.Align.END });
    this.actor.add(this._statusBin, { expand: true, x_align: St.Align.END });
    this._statusBin.child= this._switch.actor;

    this._switch.actor.connect('button-press-event', this.toggle.bind(this));
  }

  toggle() {
      this._switch.toggle();
      this.emit('toggled', this._switch.state);
  }

  get state() {
      return this._switch.state;
  }

  setToggleState(state) {
    this._switch.setToggleState(state);
  }

  setValue(v){
    this.setToggleState(v);
  }
}

class OptionsSubMenuSwitcherButtonItem extends PopupMenu.PopupBaseMenuItem{
  constructor(text, options){
    super();

    let label= new St.Label({ text: text });
    this.actor.label_actor= label;
    this.actor.add_child(label);
    this.actor.reactive= false;

    this._options= options;
    this._iterator= 0;

    this._btnLabel= new St.Label({text: this._options[this._iterator],});

    this._button= new St.Button({
      child: this._btnLabel,
			reactive: true,
			can_focus: true,
      track_hover: true,
			style_class: 'system-menu-action opt-switcher-btn',
    });
    this._button.set_toggle_mode(true);

    this._statusBin = new St.Bin({ x_align: St.Align.END, });
    this.actor.add(this._statusBin, { expand: true, x_align: St.Align.END });
    this._statusBin.child= this._button;

    this._button.connect('clicked', this._toggleBtn.bind(this));
  }

  _nextOption(){
    let l= this._options.length;

    if(!(l)){
      return null;
    }

    this._iterator= (this._iterator+1)%l;
    
    return this._options[this._iterator];
  }

  _toggleBtn(){
    let txt= this._nextOption();

    this._btnLabel.set_text(txt);

    this.emit('toggled-option', txt);
  }

  currentOption(){
    return this._options[this._iterator];
  }

  setToOption(txt){
    let i= this._options.indexOf(txt);

    if(i>=0 && i<this._options.length){
      this._iterator= i;

      this._btnLabel.set_text(txt);

      return true;
    }
    
    return false;
  }

  changeOption(txt){
    if(this.setToOption(txt)){
      this.emit('toggled-option', txt);
    }
  }

  setValue(v){
    this.setToOption(v);
  }
}


class OptionsSubMenu extends HiddenSubMenuMenuItemBase{
  constructor(){
    super();

    this._toggSigs=[];

    let addSwitchItem= (text, cb) => {
      let item= new OptionsSubMenuSwitchItem(text);
      this.menu.addMenuItem(item);

      this._toggSigs.push([item,item.connect('toggled', cb)]);

      return item;
    }
    
    this['cybersec']= addSwitchItem("CyberSec", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('cybersec',state.toString());
    });
    this['killswitch']= addSwitchItem("Kill Switch", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('killswitch',state.toString());
    });
    this['obfuscate']= addSwitchItem("Obfuscate", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('obfuscate',state.toString());
    });
    this['autoconnect']= addSwitchItem("Auto-connect", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('autoconnect',state.toString());
    });
    /*addSwitchItem("DNS", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('protocol',state.toString());
    });*/
    this['notify']= addSwitchItem("Notify", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('notify',state.toString());
    });

    let item= new OptionsSubMenuSwitcherButtonItem("Protocol", ["udp","tcp"]);
    this.menu.addMenuItem(item);

    this._toggSigs.push([item, item.connect('toggled-option', (obj, txt)=>
                      {
                        if(this._optCh_cb) this._optCh_cb('protocol',txt);
                      }
                    )]
                  );
    this['protocol']= item;
  }

  destroy(){
    for(var i=0; i<this._toggSigs.length; ++i){
      var t= this._toggSigs[i];
      t[0].disconnect(t[1]);
    }
  }

  set_optionChangeCallBack(fn){
    this._optCh_cb= fn;
  }

  updateFromOpt(params){
    for(var option in params){
      if(this[option]){
        this[option].setValue(params[option]);
      }
    }
  }
}