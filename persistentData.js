const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const ByteArray = imports.byteArray;

/**
 * Class that implements a data manager for the persistent data
 * the extension uses.
 * Stores, add, removes, write reads said data
 */
class PersistentDataHandler{
    /**
     * Constructor
     * 
     * @param {string} path the path of the json file that stores the  data
     */
    constructor(path){
        this._filePath= path;

        this._dataObj={ fav: {}, recent: {pin: [], regular: []} };
    }

    /**https://www.roojs.org/seed/gir-1.2-gtk-3.0/seed/GLib.html#expand
     * https://rockon999.pages.gitlab.gnome.org/gjs-guide/tutorials/gjs-basic-file-operations.html#getting-a-gio-file-instance
     * 
     * Method that loads the data from the json fav file
     * Also ensures coherence with the expected format, and cleans
     * of any unexpected and useless data
     */
    load(){
        let file= Gio.file_new_for_path(this._filePath);
    
        /** checks if containing directory exists, if not, creates it */
        if(!file.get_parent().query_exists(null)){
          file.get_parent().make_directory_with_parents(null);
        }
    
        /** checks if fav json file exists, if not, creates it */
        if(!file.query_exists(null)){
          file.create(Gio.FileCreateFlags.NONE, null);
        }
    
        /** loads file content */
        let [res, cont]= file.load_contents(null);
    
        /** if success parses the JSON data into an Object */
        if(res){
          let json= (Object.entries(cont).length === 0)?
                      { fav: {}, recent: {pin: [], regular: []} }
                    : JSON.parse(ByteArray.toString(cont));
          if(json){
            this._dataObj= json;
          }
        }


        /** Checking if data corresponds to expected format,
         * formatting it if necessary
         */
        let attrArrayExists= (attr =>{
            return (Boolean(attr) && Array.isArray(attr));
        });

        if(Boolean(this._dataObj)){
            if(!Boolean(this._dataObj.fav)){
                this._dataObj['fav']= {};
            }

            if(Boolean(this._dataObj.recent)){
                if(!attrArrayExists(this._dataObj.recent.pin)){
                    this._dataObj.recent['pin']= [];
                }
                if(!attrArrayExists(this._dataObj.recent.regular)){
                    this._dataObj.recent['regular']= [];
                }
            }
            else{
                this._dataObj['recent']= {pin: [], regular: []};
            }
        }
        else{
            this._dataObj= { fav: {}, recent: {pin: [], regular: []} };
        }


        /** cleaning the data object of any unwanted attributes */
        
        let deleteButAttributes= (obj, attrNames) => {
            for(var k in obj){
              if(!attrNames.includes(k)){
                  delete(obj[k]);
              }
            }
        }

        deleteButAttributes(this._dataObj.recent, ['pin', 'regular']);
        
        /** compatibility with older 'fav' format */
        for(var k in this._dataObj){
          var str= this._dataObj[k];
          if(!['fav','recent'].includes(k)){
            if(typeof(str)==="string"){
              this._dataObj.fav[k]= str;
            }

            delete(this._dataObj[k]);
          }
        }

    }

    /**
     * Method that saves the current state of the data
     * on disk, into JSON form
     */
    save(){
        var dataStream= "{ fav: {}, recent: {pin: [], regular: []} }";

        if(this._dataObj){
            dataStream= JSON.stringify(this._dataObj, null, '\t');
        }
    
        if(GLib.file_test(this._filePath, GLib.FileTest.EXISTS)){
            GLib.file_set_contents(this._filePath, dataStream);
        }
    }

    get dataObject(){
        return this._dataObj;
    }

    /**
     * Method to check if loaded data is ready to be used as exected
     */
    isReady(){
        return (Boolean(this._dataObj) &&
                Boolean(this._dataObj.fav) &&
                Boolean(this._dataObj.recent) &&
                Boolean(this._dataObj.recent.pin) && Array.isArray(this._dataObj.recent.pin) &&
                Boolean(this._dataObj.recent.regular) && Array.isArray(this._dataObj.recent.regular));
    }
};


/**
 * Class that implements managements of favourite servers.
 * Stores, adds, removes and writes & reads favs on disk
 * through an existing and loaded instance of PersistentDataHandler.
 */
class FavHandler{
    /**
     * Constructor
     * 
     * @param {PersistentDataHandler} persistentDataHandler instance of persitence data handler
     *                  that handles the data (associated with the wanted file)
     */
    constructor(persistentDataHandler){
        this._pdh= persistentDataHandler;

        this._iterator= 0;

        this._favObj= (Boolean(this._pdh) && this._pdh.isReady())?
                            this._pdh._dataObj.fav
                        :   null;
    }

    /**
     * Saves the current 'server fav' configuration on disk
     * through the object's associated persistentDataHandler
     */
    save(){
        if(Boolean(this._pdh)) this._pdh.save();
    }



    /**
     * Adds a new server to the favs
     * 
     * @param {string} server the server name 
     * @param {string} country the country of the server
     * @param {string} city the city of the server
     */
    add(server, country, city){
        if(this._favObj){
            this._favObj[server]= country+", "+city;
        }
    }

    /**
     * Removes a server from the favs
     * 
     * @param {string} server the name of the faved server to remove 
     */
    remove(server){
      if(this._favObj){
        delete this._favObj[server];
      }
    }

    /**
     * Checks if a servers is already faved
     * 
     * @param {string} server name of the tested server
     * 
     * @returns {boolean} whether of not the server is already faved 
     */
    isFaved(server){
      return ((this._favObj) && (Boolean(this._favObj[server])));
    }

    /**
     * How many faved servers?
     * 
     * @returns {integer} the number of currently faved servers
     */
    getNumber(){
        return (this._favObj)? Object.keys(this._favObj).length : 0;
    }

    /**
     * Method for iterating purpous.
     * 
     * Gets the first iteration within the fav list
     * (the internalt iterator is pointing at the begining)
     * 
     * @returns {array} a couple [k, i] with k the server name, and i its info
     *    returns undefined if nothing / empty
     */
    first(){
      if(!this._favObj) return undefined;
  
      this._iterator= 0;
      if(this.getNumber()>0){
        let k= Object.keys(this._favObj)[0];
        return [k,this._favObj[k]];
      }
      else{
        return undefined;
      }
    }

    /**
     * Method for itterating purpous
     * 
     * Advance to the next iteration within the fav list
     * (the internal iterator is incremented)
     * 
     * @returns {array} a couple [k, i] with k the server name, and i its info
     *    return undefined if nothing (i.e. the previous iteration was the last one)
     */
    next(){
      if(!this._favObj) return undefined;
  
      if(this.getNumber()>(++this._iterator)){
        let k= Object.keys(this._favObj)[this._iterator];
        return [k,this._favObj[k]];
      }
      else{
        return undefined;
      }
    }
};

/**
 * Class that implements managements 'recent connections' stack.
 * Stores, adds, removes and writes & reads favs on disk
 * through an existing and loaded instance of PersistentDataHandler.
 */
class RecentLocationHandler{
  /**
   * Constructor
   * 
   * @param {PersistentDataHandler} persistentDataHandler instance of persitence data handler
   *                  that handles the data (associated with the wanted file)
   * @param {integer} capacity the maximum number of 'recent connection' that can be stored by
   *                  this instance of the object
   * 
   * Important: If the capacity of the instance doesn't match the count of item stored in the
   *              recent location stack, locations will be erazed to match the capacity, and
   *              this change will be saved
   */
  constructor(persistentDataHandler, capacity= 4){
    this._pdh= persistentDataHandler;

    this._capacity= (capacity>0)? capacity : 1;

    this._iterator= 0;

    this._recentObj= (Boolean(this._pdh) && this._pdh.isReady())?
                        this._pdh._dataObj.recent
                    :   null;

    var c= this.count;
    var c_diff= c-this.capacity;
    if(Boolean(this._recentObj) && c_diff>0){
      var rl_diff= c_diff - this._recentObj.regular.length;
      if(rl_diff >= 0){
        this._recentObj.regular= [];

        this._recentObj.pin.splice(-rl_diff, rl_diff);
      }
      else{
        this._recentObj.regular.splice(-c_diff, c_diff);
      }

      this.save();
    }
  }

  /**
   * Saves the current 'server fav' configuration on disk
   * through the object's associated persistentDataHandler
   */
  save(){
      if(Boolean(this._pdh)) this._pdh.save();
  }

  /** 
   * Capacity: how many locations can be stored simultaneously in the
   *  stack.
   */
  get capacity(){
    return (Boolean(this._recentObj))? this._capacity : 0;
  }

  /**
   * Count: how many locations are currently stored in the stack
   */
  get count(){
    return (Boolean(this._recentObj))? this._recentObj.pin.length + this._recentObj.regular.length : 0;
  }

  /**
   * Setter that makes the property 'capacity' writable, while making
   * internant changes accordingly to the new capacity value.
   * 
   * @param {integer} c the new capacity ( must be > 0 otherwise no
   *                      no change will occur, and the capacity will
   *                      remain unchanged )
   * 
   * Important: if the new capacity is lower than the number of locations
   *    already stored, locations will be discarded from the stack, including
   *    the 'pinned' locations if need be, starting from the last to most recent.
   */
  set capacity(c){
    if(c>0){
      var old_c= this._capacity;
      this._capacity= c;

      if((this._capacity < old_c) && (this.count > this._capacity)){
        var diff= this.count - this._capacity;

        var rl= this._recentObj.regular.length;
        if(diff >= rl){
          this._recentObj.regular= [];

          diff-= rl;

          this._recentObj.pin.splice(-diff, diff);
        }
        else{
          this._recentObj.regular.splice(-diff, diff)
        }
      }
    }
  }

  /**
   * Method to test wheter or not a location is among the 'pinned connection'
   * 
   * @param {string} location the name of the location
   * 
   * @returns {boolean} wheter or not this location is pinned
   *          (also returns false even if included but non pinned)
   */
  isPinned(location){
    return (Boolean(this._pdh) && this._recentObj.pin.includes(location))
  }

  /**
   * Method that adds a 'recent location' to the stack.
   *  If said location was already present in the stack, 
   *  it will be discarded from it and then put back in 
   *  first position.
   * If stack is at full capacity, the last 'non pinned'
   *  location is discarded from the stack.
   * However, if all other locations in the stack are 'pinned'
   *  a new location can't be added, and this method will do
   *  nothing.
   * 
   * @param {string} location the name of location
   * 
   * @returns {string} return the name of the location that was discarded from the stack
   *                  in order to add he one given as argument. If it was already present
   *                  in the stack and simply put back in front, it therefore should return
   *                  the same location name as given as argument. An empty string is returned
   *                  if no location was discarded from the stack (happens when previous capacity
   *                  didn't match full capactity of this instance, or location was already among
   *                  the pinned location)
   */
  add(location){
    var r= "";
    if(Boolean(this._recentObj)){
      var index= -1;
      if( !this._recentObj.pin.includes(location)){
        if( (index=this._recentObj.regular.indexOf(location)) >= 0 ){
          r= this._recentObj.regular.splice(index,1)[0];          
        }
        else if( (this.count >= this.capacity) ){
          r= this._recentObj.regular.splice(-1,1)[0];
        }
        
        if(this._recentObj.pin.length < this.capacity){
          this._recentObj.regular.splice(0, 0, location);
        }
      }
    }

    return r;
  }

  /**
   * Pins a location within the stack
   * 
   * A 'pinned' location isn't removed when a new location
   * is added while it's at the end of the queue when the
   * stack is at full capacity. Unless all other locations
   * are pinned as well.
   * 
   * @param {string} location the name of location
   */
  pin(location){
    if(Boolean(this._recentObj)){
      var index= -1;
      if( (index=this._recentObj.regular.indexOf(location))>=0 ){
        this._recentObj.regular.splice(index,1);

        this._recentObj.pin.splice(0,0, location);
      }
      else if(!this._recentObj.pin.includes(location)){
        if(this.count >= this.capacity ){
          if(this._recentObj.regular.length>0){
            this._recentObj.regular.splice(-1,1);
          }
          else{
            this._recentObj.pin.splice(-1,1);
          }
        }

        this._recentObj.pin.splice(0,0, location);
      }
    }
  }

  /**
   * Unpins a location (if it was present has a pinned location
   *  in the stack).
   * Once unpinned, the location should be re-added as a regular
   *  location.
   * 
   * @param {string} location the name of location
   * 
   * @returns {boolean} whether of not the location was added back into
   *            the stack
   */
  unpin(location){
    if(Boolean(this._recentObj)){
      var index= -1;
      if( (index=this._recentObj.pin.indexOf(location)) >= 0 ){
        this._recentObj.pin.splice(index, 1);

        if( this.count < this.capacity ){
          this.add(location);
          
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Method for iterating purpous.
   * 
   * Gets the first iteration within the location stack
   * (starting with pinned location, if there are some, then the rest)
   * (the internalt iterator is pointing at the begining)
   * 
   * @returns {array} a couple [k, b] with k the location name,
   *    and b a boolean whether or not it is a 'pinned' location.
   *    returns undefined if nothing / empty
   */
  first(){
    if(!this._recentObj) return undefined;

    this._iterator= 0;
    
    if(this.count>0){
      return (this._recentObj.pin.length > 0)?
                [ this._recentObj.pin[0], true ]
              : [ this._recentObj.regular[0], false ];
    }
    return undefined;
  }

  /**
   * Method for iterating purpous
   * 
   * Advance to the next iteration within the location stack
   * (starting with pinned location, if there are some, then the rest)
   * (the internal iterator is incremented)
   * 
   * @returns {array} a couple [k, b] with k the location name,
   *    and b a boolean whether or not it is a 'pinned' location.
   *    returns undefined if nothing / empty /
   *      if there was nothing following previous iteration
   */
  next(){
    if(!this._recentObj) return undefined;

    if(this.count > (++this._iterator)){
      if(this._iterator < this._recentObj.pin.length){
        return [ this._recentObj.pin[this._iterator], true ];
      }
      else{
        var i= this._iterator - this._recentObj.pin.length;
        return [ this._recentObj.regular[i], false ];
      }
    }

    return undefined;
  }

  /**
   * Method to change the location of an item (without changin the item itself)
   * @param {integer} index the index (regardless of pinned or not) of the item to modify 
   * @param {*} placename the new location
   */
  modify(index, placename){
    if(index>0 && index<this.count){
      let l= this._recentObj.pin.length;
      if(index<l){
        this._recentObj.pin[index]= placename;
      }
      else{
        this._recentObj.regular[index-l]= placename;
      }
    }
  }

  

  /**
   * Method to change the location of an item (without changin the item itself)
   * @param {string} oldName the name of the old location to change
   * @param {string} placename the new location
   * @param {boolean} first optional - only change the first occurence if true
   */
  modifyName(oldName, placename, first=false){
    let l= this._recentObj.pin.length;
    for(var i=0; i<this.count;++i){
      if(i<l){
        if(this._recentObj.pin[i]===oldName){
          this._recentObj.pin[i]= placename;
          if(first) break;
        }
      }
      else if(this._recentObj.regular[i-l]===oldName){
        this._recentObj.regular[i-l]= placename;
        if(first) break;
      }
    }
  }

  /**
   * Method that suppress multiple occurence of a location within the stack
   * according to a given regular expression.
   * 
   * @param {RegExp} match regular expression to detect several occurence
   * @param {boolean} first if true, only deletes the first reoccurence met before terminating
   * 
   * @return {object} returns an object containing two fields 'remain' et 'deleted'
   *              which respectively corresponds the remaining occurence (string) and
   *              the deleted ones (string array)
   */
  unique(match, first=false){
    var r= {remain: null, deleted: []};
    var c=0;
    let l= this._recentObj.pin.length;
    var i= 0;
    while(i<this.count){     
      let b_pin= (i<l); 
      var i_l= (b_pin)? this._recentObj.pin[i] : this._recentObj.regular[i-l];
      if( i_l.match(match) ){
        ++c;
        if(c>1){          
          if(b_pin){
            this._recentObj.pin.splice(i, 1)
            --l;
          }
          else{
            this._recentObj.regular.splice(i-l, 1);
          }
          r.deleted.push(i_l);

          if(first) break;
        }
        else{
          r.remain= i_l;
          ++i;
        };
      }
      else ++i;
    }

    return r;
  }
};
