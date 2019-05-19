
const Atk= imports.gi.Atk;
const St = imports.gi.St;

const PopupMenu = imports.ui.popupMenu;



/**
 * Class that implements the generic class for 'invisible' submenus.
 * 
 * The menu are meant to be unseeable (no title or space), and only become
 * visible when their content unfolds.
 * Meant to be a generic class to extend from.
 */
class HiddenSubMenuMenuItemBase extends PopupMenu.PopupSubMenuMenuItem{
    constructor(){
      super("",false);
      /** no title… */
      this.actor.remove_child(this.label);
      this.actor.remove_child(this._triangleBin);
      /** … with no allocated space (no height) */
      this.actor.height= 0;
    }

    /** Destructor
     *  @method
     */
    destroy(){
        super.destroy();
    }
  };


  /**
   * Class that implements an item to be inserted int the 'PlaceMenu' menu.
   */
  class PlaceItem extends PopupMenu.PopupBaseMenuItem{
    /** Enumerator for the possible type of item insertable in this 'PlaceMenu':
     *  Either a 'country', a 'city' or a 'group'
     *  (according to the possibilities offered by the NordVPN CLI Tool)
     *  @readonly
     *  @enum {number}
     */
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
  
      /** the actual place name stored by this item
       *    i.e.: the actual string to be used when calling the 'connect' command of the CLI Tool 
       */
      this.placeName= str_Place;
      /** type of item */
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
        if( (item instanceof PlaceItem) && (item!==undefined) ){
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
        if( (item!==undefined) &&
            (item instanceof PlaceItem) && (item.PlaceName===placeName) )
        {
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

/**
 * Class that implements the submenu from which the user can type in directly
 *  a server name
 */
class ServerSubMenu extends HiddenSubMenuMenuItemBase{
    /**
     * Initiate the attributes needed to maintain this menu
     * @method
     */
    constructor(){
        super();

        /** field to know if there's currently en entry error
         *  (i.e.: not fitting the expected format)
         */
        this._err=false;

        let hbox= new St.BoxLayout();

        this.servEntry = new St.Entry({
        style_class: 'search-entry',
        can_focus: true,
        hint_text: _('Enter server name'),
        track_hover: true,}
        );

        this.SIGS_ID= [];
        this.SIGS_ID[0]= this.servEntry.get_clutter_text().connect( 'activate',
        this._newServerEntry.bind(this)
        );

        this.SIGS_ID[1]= this.servEntry.get_clutter_text().connect( 'text-changed',
        () => {
            if(this._err){
            this.servEntry.style_class='nvpn-serv-entry';
            this._err= false;
            }
        }
        );
        this.SIGS_ID[2]= this.menu.connect('open-state-changed',
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
  
  /** Destructor
   *    @method
   */
  destroy(){
    this.servEntry.get_clutter_text().disconnect(this.SIGS_ID[0]);
    this.servEntry.get_clutter_text().disconnect(this.SIGS_ID[1]);
    this.menu.disconnect(this.SIGS_ID[2]);

    super.destroy();
  }

  /** Method to call to fill the content of the server text entry */
  setSeverEntryText(txt){
    /** checks the format before filling the entry */
    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    let arr= rgx.exec(txt);
    if((arr!==null) && (arr[1]!==undefined)){
      this.servEntry.set_text(arr[1]);
    }
  }

  /** Method to set wich function will be the callback when a new server
   *    name will be entered (when the entry is finalized when 'enter' is pressed)
  */
  newServerEntry_callback(func= null){
    this.newServer_cb= func;
  }

  /** Private method that is called before the callback function,
   *    when a new servername is entered.
   *    Allows to check the validity (format-wise) of the entered text
   *    a raise the error flag (without callback) if need be.
   */
  _newServerEntry(){
    /** if entered text checks the format requirement */
    let serv= this._getServerFromText(this.servEntry.text);
    if(serv){
        /** callback (if function set) */
        if(this.newServer_cb){
        this.newServer_cb(this.servEntry.text);
        }

        /** menu closes */
        this.menu.close(true);
    }
    /** if the entry is empty no chage is to be made; menu closes */
    else if(this.isEntryEmpty()){
        this.menu.close(true);
    }
    /** else (if invalid entry (format-wise)) */
    else{
        /** text printed in error-style, and flag is raised */
        this.servEntry.style_class='nvpn-serv-entry-error';
        this._err= true;
    }
  }

  /** Private method that extracts the server name from given text
   *    @method
   *    @param {string} txt - the text from which extract the server name.
   *        Server name must match format (e.g: ccXX[.nordvpn.com])
   *    @return {string} the server name (e.g.: ccXX) if parameted matched format,
   *        undefined otherwise
  */
  _getServerFromText(txt){
    let ltxt= txt.toLowerCase();

    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    let arr= rgx.exec(ltxt);
    if((arr!==null) && (arr[1]!==undefined)){
        return arr[1];
    }
    else return undefined;
  }

  /** Method that checks if the text entry is empty or not
   *    @method
   *    @return {boolean} whether or not the server name text entry is empty
  */
  isEntryEmpty(){
    return this.servEntry.text.length===0;
  }
}

/** Class that implements the 'switch' ui component that allows to alternate
 *  between true/false (on/off, enabled/disabled) options
 *  ( rewrote this bit, becase the default component proposed by default
 *      closes the parent menu when toggled, which is an undesired behavior
 *  here )
 */
class OptionsSubMenuSwitchItem extends PopupMenu.PopupBaseMenuItem{
    /** Intiates the item
     *  @method
     *  @param {string} text - the (displayed) name of the item
     */
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

        this._c_id= this._switch.actor.connect('button-press-event', this.toggle.bind(this));
    }

  
  /** Destructor
   *    @method
   */
    destroy(){
        this._switch.actor.disconnect(this._c_id);
    }

    /** Method that that 'toggles' or 'switch' the current state of the item
     *  @method
     *  Emits the signal 'toggled'
     */
    toggle() {
        this._switch.toggle();
        this.emit('toggled', this._switch.state);
    }

    /** Accessor to the item's current state
     *  @method
     */
    get state() {
        return this._switch.state;
    }

    /** Method that changes the current state of the item
     *  @method
     *  @param {boolean} state - the new state
     */
    setToggleState(state) {
        this._switch.setToggleState(state);
    }

    /** Generic method to change state
     *  @method
     *  @param {boolean} v - the value of the state
     *  ( equivalent to a call setToggleState(), this method only exists
     *    for genericity purpose)
     */
    setValue(v){
        this.setToggleState(v);
    }
}

/** Class that implements the 'switch button' ui component that allows to alternate
 *  between predefined states successively
 *  ( the previous 'switcher' componsent wasn't quite adapted since it was
 *      required to display exclusive settings but that are not corresponding
 *  to the true/false idiom )
 */
class OptionsSubMenuSwitcherButtonItem extends PopupMenu.PopupBaseMenuItem{
    /** Initates the item
     *  @method
     *  @param {string} text  - the (displayed) name of the item
     *  @param {Array} options  - the array containing all the possible values for this item
    */
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

        this._idC= this._button.connect('clicked', this._toggleBtn.bind(this));
    }

    /** Destructor
     *  @method
     */
    destroy(){
        this._button.disconnect(this._idC);

        super.destroy();
    }

    /** Private method that switch the current value of item to the following one
     *  @method
     *  @returns {object} the value of the new state
     *  (no signal emitted)
     */
    _nextOption(){
        let l= this._options.length;

        if(!(l)){
            return null;
        }

        this._iterator= (this._iterator+1)%l;
        
        return this._options[this._iterator];
    }

    /** Private method that simulate a click on the item
     *  @method
     *  (equivalent to a call to _nextOption(), but with any returned value
     *  and no signal emitted)
     */
    _toggleBtn(){
        let txt= this._nextOption();

        /** The item only changes value and emits a signal if next value is valid */
        if(txt!==null){
            this._btnLabel.set_text(txt);

            this.emit('toggled-option', txt);
        }
    }

    /** Method that returns the current value of this item state
     *  @method
    */
    currentOption(){
        return this._options[this._iterator];
    }

    /** Method that changes the value of the item to the one specified
     *  @method
     *  @param {object} txt - the state to which switch the item (must be a
     *                        actually provided by this item)
     *  @returns {boolean} whether of not the switch succeded (fails if given
     *                      option not provided by this item)
    */
    setToOption(txt){
        let i= this._options.indexOf(txt);

        if(i>=0 && i<this._options.length){
        this._iterator= i;

        this._btnLabel.set_text(txt);

        return true;
        }
        
        return false;
    }

    /** Method that changes the value of the item to the one specified with signal emission
     *  @method
     *  @param {object} txt - the state to which switch the item (must be a
     *                        actually provided by this item)
     *  ( equivalent to a call to setOption(), but with any value return a
     *    a 'toggled-option' signal emission)
     */
    changeOption(txt){
      if(this.setToOption(txt)){
        this.emit('toggled-option', txt);
      }
    }

    /** Generic method to change state
     *  @method
     *  @param {boolean} v - the value of the state
     *  ( equivalent to a call setToOption(), this method only exists
     *    for genericity purpose)
     */
    setValue(v){
        this.setToOption(v);
    }
}

/** Class that implements  the submenu where appears the toggle for the
 *  different options offered by the CLI tool.
 */
class OptionsSubMenu extends HiddenSubMenuMenuItemBase{
  /** Constructor
   *  @method
   */
  constructor(){
    super();

    this._toggSigs=[];

    /** anonymous function for factoring.
     *  add a switch toggle item with a specified entry name a specified function
     *  as callback when interacted with */
    let addSwitchItem= (text, cb) => {
      let item= new OptionsSubMenuSwitchItem(text);
      this.menu.addMenuItem(item);

      this._toggSigs.push([item,item.connect('toggled', cb)]);

      return item;
    }
    
    /** adding the following toggle item corresponding to similary named fucntion
     *  the given callbacks themselves are callback to the _optCh_cb this object's
     *  specified callback via method set_optionChangeCallBack()
    */
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
    this['notify']= addSwitchItem("Notify", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('notify',state.toString());
    });

    /** Adding a value switch item that allows to knowingly swich between
     *  the 'udp' and 'tcp' protocols for corresponding option
     */
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

  /** Destructor
   *  @method
   */
  destroy(){
    for(var i=0; i<this._toggSigs.length; ++i){
      var t= this._toggSigs[i];
      t[0].disconnect(t[1]);
    }
    this['cybersec'].destroy();
    this['killswitch'].destroy();
    this['obfuscate'].destroy();
    this['autoconnect'].destroy();
    this['notify'].destroy();
    this['protocol'].destroy();
  }

  /** Method that allows to specified a given function as a given callback when
   *  one of the item is interacted with
   *  @method
   *  @param {function} - the callback function that that has 2 parameters:
   *                      a string that is the exact name of the option handled
   *                      and the current value of this option resulting of the interaction
   */
  set_optionChangeCallBack(fn){
    this._optCh_cb= fn;
  }

  /** Method that modify the display of all the items given a configuration
   *  @method
   *  @param {object} params - the configuration: an object where
     *                      each field, named same as the associated option name,
     *                      has a string that represents this option setting as value.
   */
  updateFromOpt(params){
    for(var option in params){
      if(this[option]){
        this[option].setValue(params[option]);
      }
    }
  }
}

/** Class that implements the menu item that shows a message when
 *  expected given version doesn't match actual given version
 */
class VersionChecker extends PopupMenu.PopupBaseMenuItem{
  /** Enumerator for the possible result of versions comparison
   *  @readonly
   *  @enum {number}
   */
  static get COMP() {
    return {
      LT: -1, /** actual is older/inferior than expected */
      EQ: 0,  /** equal versions */
      GT: 1,  /** actual is newer/superior thant expected */
    };
  }

  /** Constructor
   *  @method
   *  @param {string} expectedVer - the expected version (format X.X.…)
   *  @param {string} actualVer - the actual version (format X.X.…)
   */
  constructor(expectedVer, actualVer){
    super(""); 

    this.actor.reactive= false;

    this._expectedVersion= expectedVer;
    this._actualVersion= actualVer;

    let hbox= new St.BoxLayout({});
    let label1= new St.Label({});
    
    /** sets the display message according to comparision result */
    this._res= this._compare();
    let txt= '';
    switch(this._res){
    case VersionChecker.COMP.LT:
    {
      txt= "⚠ The version of the NordVPN CLI tool installed ("
        + this._actualVersion
        + ") is older than the expected version ("
        + this._expectedVersion+") …";
    }
      break;
    case VersionChecker.COMP.GT:
    {
      txt= "⚠ The version of the NordVPN CLI tool installed ("
        + this._actualVersion
        + ") is more recent than the expected version ("
        + this._expectedVersion+") …";
    }
      break;
    case VersionChecker.COMP.EQ:
    {
      txt= "Expected and installed CLI tool versions match."
        + "This message shouldn't be displayed …";
    }
      break;
    default:
    {
      txt= "Can't detect NordVPN CLI Tool version …";
    }
    }


    label1.text= txt;


    label1.get_clutter_text().set_line_wrap(true);

    this._button= new St.Button({child:label1, 
                                style_class: 'nordvpn-version-warn'});

    hbox.add_child(this._button);

    this.actor.add(hbox, { expand: true });

    /** message disapears when clicked */
    this._idc= this._button.connect('clicked', () => {this.actor.hide();});

    /** if actual version newer of older, no message displayed */
    if( !this._res || this._res>=0){
      this.actor.hide();  
    }

  }

  /** Destructor
   *  @method
   */
  destroy(){
    this.disconnect(this._idc);

    super.destroy();
  }

  /** Private methods that compute the comparison between expected and actual
   *  versions
   *  @method
   *  @returns {enum} COMP enumeration according to result - undefined if
   *                  versions not correctly formated
   */
  _compare(){
    /** check format match*/
    let arr1= (/(([0-9]+\.)*[0-9]+)/g).exec(this._expectedVersion)[1];
    let arr2= (/(([0-9]+\.)*[0-9]+)/g).exec(this._actualVersion)[1];

    if(arr1 && arr2 && arr1.length && arr2.length){
      /** storing numbers into arrays */
      let expV= arr1.split('.');
      let actV= arr2.split('.');

      /** parsing 'l' first numbers, where 'l' is the minimum length between
       *  the two arrays */
      let l= Math.min(expV.length,actV.length);

      var b= true;
      for(var i=0; (i<l && b); ++i){
        b= b && (parseInt(expV[i])===parseInt(actV[i]));

        /** if a number of the expected version doesn't match its actual
         *  version counter-part (staring from left side) then result is
         *  decided */
        if(!b){
          return (parseInt(expV[i])>parseInt(actV[i]))?
                        VersionChecker.COMP.LT
                        : VersionChecker.COMP.GT;
        }
      }

      /** anonymous function that determines if an array of string numbers
       *  is only made of zero
       *  (useful when a version string is longer than other and both were
       *    equal until then) */
      let _isNonZero= (t) => {
        for(var i=0; i<t.length; ++i){
          if(t[i]!=='0') return true;
        }

        return false;
      }

      /** Number comparison done, since it didn't find difference,
       *  if length of both versions array are equal, the version were.
       *  If not, we take the remaining part of the longest string,
       *  if this part isn't all zero, it means the longest version
       *  was the most recent.
       */
      return (expV.length===actV.length)? VersionChecker.COMP.EQ
            : (expV.length>actV.length)? 
              ( (_isNonZero(expV.slice(l)))? VersionChecker.COMP.LT : VersionChecker.COMP.EQ )
              : ( (_isNonZero(actV.slice(l)))? VersionChecker.COMP.GT : VersionChecker.COMP.EQ );
    }
    
    return undefined;

  }

  /** Method as a getter for the result of the lastest version
   *  difference computation
   *  @method
   *  @returns {enum} COMP enumeration according to result - undefined if
   *                  versions not correctly formated
   */
  compareResult(){
    return this._res;
  }

}