
const Atk= imports.gi.Atk;
const St = imports.gi.St;

const PopupMenu = imports.ui.popupMenu;
const Pango = imports.gi.Pango;

const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const ByteArray = imports.byteArray;


const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const PersistentData = Me.imports.persistentData;

const Convenience = Me.imports.convenience;



/** Object that will be the access holder to this extension's gSettings */
var SETTINGS;

function init(){
  /** Iniating the gSettings access */
  SETTINGS = Convenience.getSettings();
}

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

    unselect_current(){
      if(this.cur_selected!=null){
        this.cur_selected.select(false);
      }
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
      this.unselect_current();
  
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


let StackerBase = GObject.registerClass(
{
},
/**
 * Base class to implement 'stackers'.
 * 
 * Used to keep coherent a set of static items, followed
 * by some dynamic items.
 * To use inside a submenu.
 * 
 * To use as a class parent.
 */
class StackerBase extends GObject.Object{
  /**
   * Initialization method
   * 
   * @param {string} title the title of the stacker; will be
   *              displayed as a static label 
   * @param {PopupMenu.PopupSubMenuMenuItem} submenu the parent submenu
   * @param {integer} startPos positive integer that indicates the position
   *                    within the submenu where to insert the stacker
   */
  _init(title, submenu, startPos= undefined){
    super._init();
    
    this._parentMenu= submenu;

    this.ITEM_SIGS= [];

    var b= Boolean(startPos);
    this._startPos= (b)? startPos
                      : this._parentMenu.menu._getMenuItems().length;

    let label= new St.Label({text: "----- "+title+" -----",});
    let hbox= new St.BoxLayout();
    this._startItem= new PopupMenu.PopupBaseMenuItem({reactive: false});
    hbox.add(label);
    this._startItem.actor.add(hbox, { expand: true, x_fill: false});

    if(b){
      this._parentMenu.menu.addMenuItem(this._startItem);
    }
    else{
      this._parentMenu.menu.addMenuItem(this._startItem, startPos);
    }

    this.ITEM_SIGS.push([this._startItem, this._startItem.connect('destroy', () => {
      --this._sl;

      if(this._sl>0){
        this._startItem= this._parentMenu.menu._getMenuItems()[this._startPos+1];
      }
      else{
        this._startItem= null;
      }
    })]);

    this._sl= 1;
  }

  /**
   * Called on destruction
   */
  _onDestroy(){
    for(var i= 0; i<this.ITEM_SIGS.length; ++i){
      let t= this.ITEM_SIGS[i];

      if(t && t[0] && t[1]){
        t[0].disconnect(t[1]);
      }
    }

    super.destroy();
  }

  /**
   * Private method that recomputes the index of the first item of the stacker
   *  relatively to the parent submenu
   */
  _computeStartPos(){
    if(Boolean(this._startItem)){
      var tmp= this._parentMenu.menu._getMenuItems().indexOf(this._startItem);
      if(tmp>=0){
        this._startPos= tmp;
      }
    }
  }

  /** 
   * Getter property to access the current (after acutalization) index of the stacker
   *  within th eparent submenu
   */
  get actualizedStartPos(){
    this._computeStartPos();
    return this._startPos;
  }

  /**
   * Add a static item to the stacker
   * 
   * @param {PopupSubMenuItem} item an item to add as the static part of the stacker
   */
  addNonDynamicFrontItem(item){
    if(Boolean(item)){
      this._parentMenu.menu.addMenuItem(item, this._startPos+this._sl);

      ++this._sl;

      this.ITEM_SIGS.push([item, item.connect('destroy', () => {
        --this._sl;
      })]);
    }
  }


  /** 
   * Getter property to access the current (after acutalization) index of the first
   *  dynamic item within the stacker
   */
  get acutalizedDynamicItemStartPos(){ return (this.actualizedStartPos+this._sl)}
});

/**
 * Class that implements faved server as a GUI menu item
 */
class FavedServerItem extends PopupMenu.PopupBaseMenuItem{
  /**
   * Constructor
   * 
   * @param {string} servName the faved server name
   * @param {string} infos infos about server
   */
  constructor(servName, infos){
    super({style_class: 'server-fav',});
    this.tLabel= new St.Label({text: servName+" - "+infos.slice(0,13)+((infos.length>13)?'…':'')});
    this.actor.add(this.tLabel, {expand: true, x_fill: false});

    this._servName= servName;
    this._infos= infos;
    
    let btnIcon = new St.Icon({ icon_name: 'edit-delete-symbolic',
                               style_class: 'system-status-icon' });

    this._button= new St.Button({
          child: btnIcon,
          reactive: true,
          can_focus: true,
          track_hover: true,
          style_class: 'system-menu-action fav-delete-btn',
    });

    this._statusBin = new St.Bin({ x_align: St.Align.END, });
    this.actor.add(this._statusBin, { expand: true, x_align: St.Align.END });
    this._statusBin.child= this._button;

    /** signal 'delete-fav' is emmited when the delete button is clicked */
    this._idc1= this._button.connect('clicked', () => {
      this.emit('delete-fav', this._servName);
    })
  }

  /**
   * destructor
   */
  destroy(){
    this._button.disconnect(this._idc1);

    super.destroy();
  }

  get key(){
    return this._servName;
  }

  get infos(){
    return this._infos;
  }

  set infos(infos){
    this._infos= infos;
    this.tLabel.text= this._servName+" - "+this._infos;
  }
}


/** Regisering this item as a GObject in order
 *  to use signals via the 'emit' method
 */
let FavoriteStacker = GObject.registerClass(
{
  Signals: {
    'server-fav-connect': {
      flags: GObject.SignalFlags.RUN_FIRST,
      param_types: [ GObject.TYPE_STRING ]
    }
  }
},
/**
 * Class that implements the part of the gui menu
 * where the faved servers are displayed
 */
class FavoriteStacker extends StackerBase{
  /**
   * 
   * @param {object} submenu the parent submenu
   * @param {string} persistentDataHandler the object that implement the handling of
   *                                  persitent data.
   * 
   * Note that the data within persistentDataHandler should be loaded prior to this
   * object creation
   */
  _init(submenu, persistentDataHandler){
    super._init("Favorite servers",submenu);

    this.FAV_SIGS= [];

    this._currentServInfo= {server: "", city: "", country: ""};

    /** button to add current server as favourite */
    let btnLabel= new St.Label({text: "Fav' current server",});

    this._button= new St.Button({
                      child: btnLabel,
                      reactive: true,
                      can_focus: true,
                      track_hover: true,
                      style_class: 'system-menu-action add-fav-button',
    });
    this._button.set_toggle_mode(true);
    /** hidden by default */
    this._button.hide();

    let btnItem= new PopupMenu.PopupBaseMenuItem({reactive: false});
    btnItem.actor.add(this._button, { expand: true, x_fill: false});

    this.addNonDynamicFrontItem(btnItem);

    /** loading from disk and handling the favs */
    this._favHandler= new PersistentData.FavHandler(persistentDataHandler);
    //this._favHandler.load();

    /** fill menu with existing favs */
    this._generateItemList();


    /** when 'add favourite' button is clicked,
     * add the server (with its infos) as a fav
     */
    this._idc1= this._button.connect('clicked', () => {
      let serv= this._currentServInfo;
      if(serv && serv.server){
        if(!this._favHandler.isFaved(serv.server)){
          this._favHandler.add(serv.server, serv.city, serv.country);
          this._favHandler.save();
          this._addFavItem(serv.server, serv.city+", "+serv.country);

          /** only to update the display state of the button
           *  (if the current serv is added, it should diseappear)*/
          this.currentServer= serv;
        }
        else{
          let r= this._parentMenu.menu._getMenuItems().find((item)=>{
            if(item instanceof FavedServerItem){
              return (item instanceof FavedServerItem) &&
                      item.key===serv.server;
            }
          });

          if(r){
            r.infos= "????, ????";
          }
        }
      }
    });
  }

  /**
   * Called on destruction
   * 
   * cleans signals
   */
  _onDestroy(){
    for(var i= 0; i<this.FAV_SIGS.length; ++i){
      let t= this.FAV_SIGS[i];

      if(t && t[0] && t[1]){
        t[0].disconnect(t[1]);
      }
    }

    if(this._idc1){
      this._button.disconnect(this._idc1);
      this._idc1= 0;
    }

    super._onDestroy();
  }

  /**
   * Private method that adds all loaded & stored faved servers as gui items
   */
  _generateItemList(){
    if(this._favHandler){
      for(var t=this._favHandler.first(); t!==undefined; t=this._favHandler.next()){
        this._addFavItem(t[0], t[1]);
      }
    }
  }

  /** 
   * Private method that adds a faved server as a gui item
   * 
   * @param {string} serv the server name
   * @param {string} info the server infos
  */
  _addFavItem(serv, info){
    let favItem= new FavedServerItem(serv, info);

    var disp= this.acutalizedDynamicItemStartPos;
    this._parentMenu.menu.addMenuItem(favItem, disp);

    /** whenever a fav server's menu item is clicked,
     * the signal 'server-fav-connect' is emitted
     */
    this.FAV_SIGS.push([favItem, favItem.connect('activate', () => {
      this.emit('server-fav-connect', favItem.key);
    })]);

    /** whenever a fav server's menu item's delete button is clicked,
     * it is removed from the fav data handler (changes written on disk)
     * the menu item is removed and its signal disconnected
     */
    this.FAV_SIGS.push([favItem, favItem.connect('delete-fav', (item, servName) => {
      this._favHandler.remove(servName);
      this._favHandler.save();

      var i= -1;
      do{
        i= this.FAV_SIGS.findIndex((e) => {
          return e[0]==item;
        });
        if(i>=0){
          let elmt= this.FAV_SIGS[i];
          if(elmt && elmt[0] && elmt[1]){
            elmt[0].disconnect(elmt[1]);
          }
          this.FAV_SIGS[i]= undefined;
          this.FAV_SIGS= this.FAV_SIGS.slice(0,i).concat(
                          (this.FAV_SIGS.length>(i+1))?
                            this.FAV_SIGS.slice((i+1))
                            : []
          );
        }
      }
      while(i>=0);
      
      item.destroy();

      /** only to update the display state of the button
       *  (if the current serv was fav, and has been delstyle_classete, it should reappear)*/
      this.currentServer= this._currentServInfo;
    })]);
  }

  /**
   * accessor (write) to change the current server.
   * if this server is already faved, we hide the 'add as favourite' button
   * that becomes, de facto, redundant
   * 
   * @param {object} serverInfo object that contains a 'server' field, for the server name
   *    (and a 'infos' field)
   */
  set currentServer(serverInfo){
    if(this._favHandler.isFaved(serverInfo.server) || !this._currentServInfo){
      this._button.hide();
    }
    else{
      this._button.show();
    }
    this._currentServInfo= serverInfo;
  }

  get currentServer(){
    return this._currentServInfo;
  }
}
);

/**
 * Class that implements a recent location as a GUI menu item
 */
class RecentLocationItem extends PopupMenu.PopupBaseMenuItem{
  /**
   * Constructor
   * 
   * @param {string} location the location 
   * @param {boolean} isPin whether or not the location is 'pinned' 
   */
  constructor(location, isPin){
    super({style_class: 'recent-location'});
    this.tLabel= new St.Label({
      style_class: 'recent-location-label' +((isPin)?' pinned':''),
      text: location.replace(/_/gi,' ')
    });
    this.actor.add(this.tLabel, {expand: true, x_fill: false});

    this._location= location;
    this._pin= isPin;
    
    let btnIcon = new St.Icon({ icon_name: (isPin)?'zoom-out-symbolic':'view-pin-symbolic',
                               style_class: 'system-status-icon' });

    this._button= new St.Button({
          child: btnIcon,
          reactive: true,
          can_focus: true,
          track_hover: true,
          style_class: 'system-menu-action pin-btn',
    });

    this._statusBin = new St.Bin({ x_align: St.Align.MIDDLE, });
    this.actor.add(this._statusBin, { expand: true, x_align: St.Align.MIDDLE });
    this._statusBin.child= this._button;

    /** signal 'unpin'/'pin' is emmited when the pin button is clicked */
    this._idc1= this._button.connect('clicked', () => {
      this.emit(((isPin)?'unpin':'pin'), location);
    })
  }

  get isPin(){ return this._pin;}
  get location(){ return this._location;}
}

let RecentLocationStacker = GObject.registerClass(
{
  Signals: {
    'location-connect': {
      flags: GObject.SignalFlags.RUN_FIRST,
      param_types: [ GObject.TYPE_STRING ]
    }
  }
},
/**
 * Class that implements the part of the gui menu
 * where the faved servers are displayed
 */
class RecentLocationStacker extends StackerBase{
  /**
   * 
   * @param {PopupMenu.PopupSubMenuMenuItem} submenu the parent submenu
   * @param {PersistentDataHandler} persistentDataHandler the instance of the
   *       persistentdatahandler that handles the data storage 
   * @param {integer} capacity positive integer that represents how many locations
   *        can be stacked
   */
  _init(submenu, persistentDataHandler, capacity=3){
    super._init("Recent Connections", submenu);

    this._capacity= capacity;

    this.RLOC_SIGS= [];

    this._length= 0;

    this._rlocHandler= new PersistentData.RecentLocationHandler(persistentDataHandler, this._capacity);

    this._generateItemList();
  }

  /**
   * Called on destruction
   * 
   * cleans signals
   */
  _onDestroy(){
    for(var i= 0; i<this.RLOC_SIGS.length; ++i){
      let t= this.RLOC_SIGS[i];

      if(t && t[0] && t[1]){
        t[0].disconnect(t[1]);
      }
    }

    super._onDestroy();
  }

  /**
   * Private method to fillthe stacked according to the current state of the stored
   *  locations data.
   */
  _generateItemList(){
    if(this._rlocHandler){
      var i= 0;
      for(var t= this._rlocHandler.first(); t!==undefined; t= this._rlocHandler.next()){
        this._addRLocItem(t[0], i, t[1]);
        ++i;
      }
    }
  }

  /**
   * Private method that deletes an item from the stacker
   * 
   * @param {PopupMenu.PopupSubMenuMenuItem} item 
   */
  __deleteInnerItem(item){
    item.destroy();
    --this._length;
  }

  /**
   * Private method that deletes a given location from the stacker
   * 
   * @param {string} location the location 
   */
  _deleteItem(location){
    let p_items= this._parentMenu.menu._getMenuItems();

    var disp= this.acutalizedDynamicItemStartPos;
    for(var i= disp; i<p_items.length; ++i){
      var i_item= p_items[i];
      if( Boolean(i_item) && (i_item instanceof RecentLocationItem)
          && i_item.location===location){
        this.__deleteInnerItem(i_item);
      }
    }
  }

  /**
   * Private method that adds a dynamic item to the submenu.
   * 
   * @param {PopupMenu.PopupSubMenuMenuItem} item the item to add
   * @param {integer} i the position (relatively to the other dynamic item)
   *          where to add this item. If not specified (of undefined) the item
   *          is added as last. 
   */
  __addInnerItem(item, i=undefined){
    var disp= this.acutalizedDynamicItemStartPos;

    var pos= (i===undefined || i<0)?this._length:i;

    this._parentMenu.menu.addMenuItem(item, disp+pos);
    ++this._length;
  }

  /**
   * Private method to add a location ('pinned' or not) within the stack.
   * 
   * @param {string} location the location
   * @param {integer} pos the position (relatively to other locations/dynamic items)
   * @param {boolean} isPin is the location pinned ?
   */
  _addRLocItem(location, pos= 0, isPin= false){
    let rlocItem= new RecentLocationItem(location, isPin);

    var disp= this.acutalizedDynamicItemStartPos;
    this.__addInnerItem(rlocItem, pos)

    this.RLOC_SIGS.push([rlocItem, rlocItem.connect('activate',() => {
      this.emit('location-connect', location);
    })]);

    if(isPin){
      this.RLOC_SIGS.push([rlocItem, rlocItem.connect('unpin', (item, loc) =>{
        var b= this._rlocHandler.unpin(loc);
        this._rlocHandler.save();

        this.__deleteInnerItem(item);
        if(b) this.addRecentLocation(loc, false);
      })])
    }
    else{
      this.RLOC_SIGS.push([rlocItem, rlocItem.connect('pin', (item, loc) =>{
        this._rlocHandler.pin(loc);
        this._rlocHandler.save();

        this.addRecentLocation(loc, true);
      })])
    }
  }

  /**
   * Adds a location to the stacker
   * 
   * @param {string} location the location name 
   * @param {boolean} pin is the location pinned ?
   */
  addRecentLocation(location, pin= false){
    var b_wasPinned= this._rlocHandler.isPinned(location);
    if(pin){
      this._deleteItem(location);
      this._rlocHandler.pin(location);
    }
    else{
      var rmvLoc= this._rlocHandler.add(location);
      if(Boolean(rmvLoc)){
        this._deleteItem(rmvLoc);
      }
    }

    this._rlocHandler.save();

    var i=0;
    for(var t= this._rlocHandler.first(); t!==undefined; t=this._rlocHandler.next()){
      if(t[0]===location){
        if( (pin && b_wasPinned) || (!pin && !b_wasPinned) ){
          this._addRLocItem(location, i, pin);
        }

        break;
      }

      ++i;
    }
  }

  /**
   * Changer the capacity of the stacker, i.e.: how many location can be
   *  stacked simultaneously
   * 
   * @param {integer} c a >0 number that represents the capacity 
   * 
   * Note: if the the call to this method reduces the capacity, it will delete
   *  locations (including 'pinned' ones), starting from the bottom.
   */
  setCapacity(c){
    var oldCap= this._capacity;
    if(c>0 && c!==oldCap){
      this._rlocHandler.capacity= c;
      this._capacity= c;

      this._rlocHandler.save();

      var diff= c-oldCap;

      if(diff<0 && this._length>c){
        let children= this._parentMenu.menu._getMenuItems();

        var p= this._startPos + 1 + this._length + diff;
        
        for(var i=0; i<(-diff); ++i){
          this.__deleteInnerItem(children[p]);
        }
      }
    }
  }
}
);

/**
 * Class that implements the submenu from which the user can type in directly
 *  a server name, fav servers, a see / pin recent connections
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


        let separator= new PopupMenu.PopupSeparatorMenuItem();
        this.menu.addMenuItem(separator);

        //peparing the handling of persistent data (favs, recents loc …)
        this.persistentDataHandler= new PersistentData.PersistentDataHandler(
          ".config/nordvpn/nordvpn_connect/fav.json"
        );
        this.persistentDataHandler.load();


        var rlocCapactiy= SETTINGS.get_int('recent-capacity');        
        this.recent= new RecentLocationStacker(this, this.persistentDataHandler, rlocCapactiy);
        this.SIGS_ID[3]= this.recent.connect('location-connect', (item, location)=>{
          this.emit('location-connect', location);
        });
        this._sett_sig1= SETTINGS.connect('changed::recent-capacity', () => {
          this.recent.setCapacity(SETTINGS.get_int('recent-capacity'));
        });

        this.fav= new FavoriteStacker(this, this.persistentDataHandler);
        this.SIGS_ID[4]= this.fav.connect('server-fav-connect', (item, servName)=>{
          this.emit('server-fav-connect', servName);
        });
    }
  
  /** Destructor
   *    @method
   */
  destroy(){
    this.servEntry.get_clutter_text().disconnect(this.SIGS_ID[0]);
    this.servEntry.get_clutter_text().disconnect(this.SIGS_ID[1]);
    this.menu.disconnect(this.SIGS_ID[2]);
    this.fav.disconnect(this.SIGS_ID[3]);

    SETTINGS.disconnect(this._sett_sig1);

    super.destroy();
  }

  /** Method to call to fill the content of the server text entry */
  setSeverEntryText(serverName, city=undefined, country=undefined){
    /** checks the format before filling the entry */
    let rgx= /^([a-z]{2}(\-[a-z]*)?[0-9]+)(\.nordvpn\.com)?$/g;
    let arr= rgx.exec(serverName);
    if((arr!==null) && (arr[1]!==undefined)){
      this.servEntry.set_text(arr[1]);

      //this.fav.currentServer= arr[1];
      this.fav.currentServer= {server: arr[1], city: (city?city:""), country: (country?country:"")};
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

  notifyRecentConnection(location){
    if(this.recent){
      this.recent.addRecentLocation(location);
    }
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

        super.destroy();
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


/** Class that implements a DNS text entry line as a submenu item */
class OptionsSubDNSItem extends PopupMenu.PopupBaseMenuItem {
  /** Constructor
   *  @method
   *  @param {string} text - the displayed name of the item
   */
  constructor(text){
    super();

    this.actor.reactive= false;

    this.label = new St.Label({ text: text, });
    this.actor.label_actor= this.label;
    this.actor.add_child(this.label);

    /** this attribute allows to save the previous entered text,
     *  so that, if the user types something indalid, the text can
     *  immediately be reverted. This allows to mainain a constant
     *  valid entry */
    this._oldText="..."
    this._validated= false;
    this._auto= false;

    this.entry= new St.Entry({
      can_focus: true,
      text: this._oldText,
      track_hover: true,
    });
    this._statusBin = new St.Bin({x_fill: true, x_align: St.Align.END });
    this.actor.add(this._statusBin, { expand: true, x_align: St.Align.END });
    this._statusBin.child= this.entry;

    /** When ever the user enter's new text… */
    this._idc1= this.entry.get_clutter_text().connect('text-changed', (txt) =>
      {
        /** the current text is processed and enforce valid format */
        let r= this._processText(txt.text);

        /** if it's valid, this new text is the new displayed entry*/
        if(r){
          this.entry.set_text(r);
          this._oldText= r;
        }
        /** if invalid, the entry text reverts to previous state */
        else{
          this.entry.set_text(this._oldText);
        }
        
        /** if the 'new text change', was done by human intervention,
         *  then if text doesn't matche an entire DNS adress,
         *  make necessar display adjustments*/
        if(!this._auto){
          this.entry.style_class= (this.DNSTextCheck(this.entry.get_text()))?
                                    ''
                                  : 'dns-entry-error';
        }
        this._auto= false;

        /** newly entered text means no validation has been made on it */
        this._validated= false;
      }
    );

    /** When enter is pressed withing the entry line input… */
    this._idc2= this.entry.get_clutter_text().connect('activate', () =>
      {
        /** the current entry text is checked */
        let txt= this.entry.get_text();
        let check= this.DNSTextCheck(txt);

        /** if the text matchtes an entire valid dns adress format,
         *  visual adjustments are made */
        this.entry.style_class= (check)? 'dns-entry-validated' : 'dns-entry-error';

        /** and if so, approriate signal is emitted, and
         *  entry is marked as validated */
        this._validated= check;
        if(check){
          this.emit('validated-dns-text', txt)
        }
        /** otherwise, the entry is cleared of any inputed text*/
        else{
          this._clearText();
        }
      }
    );

    /** When text is deleted… */
    this._idc3= this.entry.get_clutter_text().connect('delete-text', () => 
      {
        /** if this text has previously been validated,
         *  the entry inputed text is cleared*/
        if(this._validated){
          this._clearText();
        }
      }
    );
  }

  /** Destructor
   *  @method
   */
  destroy(){
    if(this._idc1)
      this.entry.get_clutter_text().disconnect(this._idc1);
    if(this._idc2)
      this.entry.get_clutter_text().disconnect(this._idc2);
    if(this._idc3)
      this.entry.get_clutter_text().disconnect(this._idc3);

    super.destroy();
  }

  /** Method that determines if given text match DNS adress format
   *  @method
   * 
   *  DNS adress format:
   *    'N1.N2.N3.N4'
   *  where Nk is an integer within the [0,255] range
   * 
   *  @param {string} txt - the text to match
   *  @return {boolean} wheter or not the text matches DNS adress format
   */
  DNSTextCheck(txt){
    return (
      ((/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)
        .exec(this.entry.get_text())
      ) !== null
    );
  }

  /** Private method process a given partial DNS address to enforce formating
   *  @method
   *  @param {string} newText - the text to process
   *  @return {string} - the reformated (if needed) text if given text was valid,
   *                    an empty string if invalid (not matching parial DNS address format)
   */
  _processText(newText){
    if(newText===this._oldText) return newText;

    let r= (/^([0-9]{1,3})?\.([0-9]{1,3})?\.([0-9]{1,3})?\.([0-9]{1,3})?/g)
              .exec(newText);
    

    /** if not match or not all field were either matched correctly or 
     *  empty, returns the old state*/
    if(r===null || r.length<5) return this._oldText;

    /** reformat text by ensuring all numbers are within
     *  the [0,255] range
     */
    let txt= "";
    for(var i= 1; i<5; ++i){
      if(r[i]){
        let t= parseInt(r[i]);
        txt+= (t<0)? "0" : (t>255)? "255" : t.toString();
      }

      if(i<4) txt+= '.';
    }

    return txt;
  }

  /** Private method that clears all the inputed text within the entry.
   *  @method
   * 
   *  emits the 'dns-text-cleared' signal
   */
  _clearText(){
    /** default text is '...', _oldText is also reset*/
    this._oldText= "...";
    this.entry.set_text("...");

    /** mark as unvalidated with  no decoration */
    this._validated= false;
    this.entry.style_class= '';


    this.emit('dns-text-cleared');
  }

  /** Method to programatically change the content of the dns entry
   *  text.
   *  @method
   *  @param {string} txt - the new text to put into the entry
   */
  setTxt(txt){
    /** mark has not entered manually */
    this._auto= true;
    if(txt){
      this.entry.set_text(txt);
      /** a valid entered text via this method is marked as validated */
      this._validated= true;
    }
    else{
      this.entry.set_text('...');
    }
  }
};

/** Regisering this item as a GObject in order
 *  to use signals via the 'emit' method
 */
let OptionsSubDNSItemContainer = GObject.registerClass(
{
  Signals: {
    'new-DNS-config': {
      flags: GObject.SignalFlags.RUN_FIRST,
      param_types: [ GObject.TYPE_STRING ]
    }
  }
},
/** Class that implements the container of the several (3) DNS entires needed */
class OptionsSubDNSItemContainer extends GObject.Object{
  /** Constructor
   *  @method
   *  @param {string} name - the genric name of the items
   *  @param {object} optionSubMenu - the submenu in which to add the dns entries
   *  @param {integer} num - default value: 3 ; the number of entries to create*/
  _init(name, optionSubMenu, num= 3){
    super._init();
    this.menu= optionSubMenu;

    this._entries= [];
    this._DNSAdresses= [];
    this._entry_SIGS= [];

    /** Anonymous funciton to add entry items to the menu and connect signals */
    let dnsItemAdd= (num, it=-1) => {
      let r= new OptionsSubDNSItem(name + " " +num);
      this.menu.addMenuItem(r);

      this._entries.push(r);

      /** Whenever a new valid DNS entry is entered or cleared,
       *  the new dns config must be generated and emitted (_newDNSCofig())*/
      this._entry_SIGS.push([r, r.connect('validated-dns-text', (item, dnsTxt) => {
        this._DNSAdresses[num+it]= dnsTxt;

        this._newDNSConfig();
      })]);

      this._entry_SIGS.push([r, r.connect('dns-text-cleared', () => {
        delete this._DNSAdresses[num+it];

        this._newDNSConfig();
      })]);

      return r;
    }

    for(var i=1; i<=num; ++i){
      dnsItemAdd(i);
    }
  }

  /** Destructor
   *  @method
   */
  _onDestroy(){
    for(var i= 0; i<this._entry_SIGS.length; ++i){
      let t= this._entry_SIGS[i];
      if(t && t[0] && t[1]){
        t[0].disconnect(t[1])
      }
    }
    for(var i=0; i<this._entries.length; ++i){
      let t= this._entries[i];
      if(t){
        t.destroy();
      }
    }

    super.destroy();
  }

  /** Private method that generated and emit the current
   *  DNS confiruration
   */
  _newDNSConfig(){
    let txt= "";

    for(var i= 0; i<this._DNSAdresses.length; ++i){
      let t= this._DNSAdresses[i];
      if(t){
        txt+= t + " ";
      }
    }

    txt= (txt.split(/\w+/).length>1)? txt : 'disabled';

    this.emit('new-DNS-config', txt);
  }


  /** Generic method to change dns configuration
   *  @method
   *  @param {string} v - the value of the dns configuration
   *  
   * A DNS configuration is a string object containing 1 to 3 DNS
   * address correctli formated, sperated by a space character
   */
  /**TODO
   * WARNING!!
   * v.replace(/(\r\n|\n|\r)/gm, ""); crashes when whitelist exists
   */
  setValue(v){
    let _v= v.replace(/(\r\n|\n|\r)/gm, "");
    /** if value is 'disabled', means that there is not dns set,
     *  all entries texts are disarded
     */
    if(_v==='disabled'){
      for(var i= 0; i<this._entries.length; ++i){
        let item= this._entries[i];
        if(item){
          item.setTxt('');
        }
      }
    }
    /** otherwise… */
    else{
      /** dns address are isolated*/
      let values= _v.split(/,\s*/);
      let l= values.length;

      /** each of them fills an entry */
      for(var i= 0; i<l; ++i){
        let t= values[i];
        if(t){
          let item= this._entries[i];
          if(item){
            item.setTxt(t);
          }
        }
      }

      /** and the remaining entries texts (if existing) are discarded */
      let L= this._entries.length;
      if(l<L){
        for(var i= 0; i<(L-l); ++i){
          let item= this._entries[l+i];
          if(item){
            item.setTxt('');
          }
        }
      }
    }
  }
}
);

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

      let dns= this['dns'];
      if(dns && state){
        dns.setValue('disabled');
      }
    });
    this['killswitch']= addSwitchItem("Kill Switch", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('killswitch',state.toString());
    });
    this['autoconnect']= addSwitchItem("Auto-connect", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('autoconnect',state.toString());
    });
    this['notify']= addSwitchItem("Notify", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('notify',state.toString());
    });


    /** Adding a value switch item that allows to knowingly swich between
     *  the 'OpenVPN' and 'NordLynx' technologies for corresponding option
     */
    let itemTech= new OptionsSubMenuSwitcherButtonItem("Technology", ["OpenVPN","NordLynx"]);
    this.menu.addMenuItem(itemTech);

    this._toggSigs.push([itemTech, itemTech.connect('toggled-option', (obj, txt)=>
                      {
                        if(this._optCh_cb) this._optCh_cb('technology',txt);

                        /** make appropriate changes to submenu
                         *  according to value of 'technlogy' */ 
                        this._notifyTechChanged();
                      }
                    )]
                  );
    this['technology']= itemTech;


    this['obfuscate']= addSwitchItem("Obfuscate", (obj,state) => {
      if(this._optCh_cb) this._optCh_cb('obfuscate',state.toString());
    });


    /** Adding a value switch item that allows to knowingly swich between
     *  the 'udp' and 'tcp' protocols for corresponding option
     */
    let itemProto= new OptionsSubMenuSwitcherButtonItem("Protocol", ["udp","tcp"]);
    this.menu.addMenuItem(itemProto);

    this._toggSigs.push([itemProto, itemProto.connect('toggled-option', (obj, txt)=>
                      {
                        if(this._optCh_cb) this._optCh_cb('protocol',txt);
                      }
                    )]
                  );
    this['protocol']= itemProto;


  
    /** speartor in the submenu */
    let separator= new PopupMenu.PopupSeparatorMenuItem();
    this.menu.addMenuItem(separator);

    /** Adding the 3 DNS entries */
    let dns= new OptionsSubDNSItemContainer("DNS", this.menu);
    /** What to do when a new (and valid) DNS configuration has been entered */
    this._toggSigs.push([dns, dns.connect( 'new-DNS-config', (obj, txt)=>
                    {
                      if(this._optCh_cb) this._optCh_cb('dns', txt);

                      /** Enabling DNS, disables the CyberSec option
                       * (has specified by the CLI app itself)*/
                      let cs= this['cybersec'];
                      if(txt!=="disabled" && cs){
                        cs.setValue(false);
                      }
                    }
                  )]
                );
    this['dns']= dns;


    /** Adding a text message that warns about the DNS-CyberSec
     *  exclusions */
    let txtItem=  new PopupMenu.PopupBaseMenuItem({reactive: false,});
    
    this._panel_hbox= new St.BoxLayout();
    let label1= new St.Label({style_class:'dns-cybersec-warning',});
    label1.text= "Note: Setting DNS disables CyberSec and vice versa.";
    label1.get_clutter_text().set_line_wrap(true);

    this._panel_hbox.add_child(label1);
    txtItem.actor.add_child(this._panel_hbox);

    this.menu.addMenuItem(txtItem);
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
    this['technology'].destroy();
    this['dns']._onDestroy();
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

    this._notifyTechChanged();
  }

  /** Private method
   *  Makes the changes to menu according to value of the 'technology' field
   */
  _notifyTechChanged(){
    if(Boolean(this['technology']) && this['technology'].currentOption()==="NordLynx"){
      this['protocol'].actor.hide();
      this['obfuscate'].actor.hide();
    }
    else{
      this['protocol'].actor.show();
      this['obfuscate'].actor.show();
    }
  }

}


/** class that implements a inforative message as a gui
 * menu item
 */
class MessageItem extends PopupMenu.PopupBaseMenuItem{
  /**
   * constructor
   * 
   * @param {string} txt message to display
   */
  constructor(txt){
    super("");

    this.actor.reactive= false;

    let hbox= new St.BoxLayout({});
    this.label1= new St.Label({});

    this.label1.text= txt;


    this.label1.get_clutter_text().set_line_wrap(true);

    this._button= new St.Button({child:this.label1, 
                                style_class: 'nordvpn-version-warn'});

    hbox.add_child(this._button);

    this.actor.add(hbox, { expand: true });

    /** message disapears when clicked */
    this._idc= this._button.connect('clicked', () => {this.actor.hide();}); 
  }

  /** Destructor
   *  @method
   */
  destroy(){
    this.disconnect(this._idc);

    super.destroy();
  }

  hide(){
    this.actor.hide();
  }

  show(){
    this.actor.show();
  }

  setText(txt){
    this.label1.text= txt;
  }
}

/** Class that implements the menu item that shows a message when
 *  expected given version doesn't match actual given version
 */
class VersionChecker extends MessageItem{
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

    this._expectedVersion= expectedVer;
    this._actualVersion= actualVer;

    
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


    this.setText(txt);

    /** if actual version newer of older, no message displayed */
    if( !this._res || this._res>=0){
      this.actor.hide();  
    }

  }

  /** Destructor
   *  @method
   */
  destroy(){
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
