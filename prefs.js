
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain('gnome-shell-extensions-nvpnconnect');
const _ = Gettext.gettext;


/** Iniating gSettings access */
let SETTINGS= Convenience.getSettings();

/** Class that encapsulates most of the 'NordVPN_Connect' extension's settings
 *  page.
 */
// class NVPN_Settings{
const NVPN_Settings= new GObject.Class({
    Name: "NVPN.Prefs.Widget",
    GTypeName: "NVPN_Settings",
    Extends: Gtk.Box,
    /**
     * Constructor.
     * 
     * Doesn't do much. Prepares fields and variables.
     */
    // constructor() {
    _init: function(params){
        this.parent(params);
        this.orientation = Gtk.Orientation.VERTICAL;
        this.spacing = 0;

        this._objects= {
            NVPN_Sett_Tabs: null,
            NVPN_Sett_Grid: null,
            NVPN_Sett_Toggle_Compact: null,
            NVPN_Sett_Label_Compact: null,
            NVPN_Sett_Toggle_Color: null,
            NVPN_Sett_Spin_Refresh: null,
            NVPN_Sett_Label_Refresh: null,
            NVPN_Sett_Toggle_Version: null,
            NVPN_Sett_Toggle_Option_Reconnect: null,
            NVPN_Sett_Spin_Recent_Cap: null,
            NVPN_Sett_TxtCombo_Target_Mode: null,
            NVPN_Sett_Toggle_Recent_Groups: null,

            NVPN_Sett_Switch_Cmd_Change: null,
            NVPN_Sett_Grid2: null,
            NVPN_Sett_ButBox_Change_Cmd_Confirm: null,
            NVPN_Sett_Entry_Command_Shell: null,
            NVPN_Sett_Entry_Available_Tool: null,
            NVPN_Sett_Entry_Connected_Check:null,
            NVPN_Sett_Entry_Transition_Check: null,
            NVPN_Sett_Entry_No_Daemon_Check: null,
            NVPN_Sett_Entry_Login_Check: null,
            NVPN_Sett_Entry_Server_Get: null,
            NVPN_Sett_Entry_Connect_To: null,
            NVPN_Sett_Entry_Disconnect: null,
            NVPN_Sett_Entry_Daemon_Online_Check: null,
            NVPN_Sett_Entry_VPN_Online: null,
            NVPN_Sett_Entry_Option_Set: null,
            NVPN_Sett_Entry_Get_Options: null,
            NVPN_Sett_Entry_Get_Version: null,
            NVPN_Sett_Entry_Get_Groups_Countries: null,
            NVPN_Sett_Button_Default: null,
            NVPN_Sett_Button_Reset: null,
            NVPN_Sett_Button_Apply: null,
        }

        this._id_compact_toggle= null;
        this._id_color_toggle= null;
        this._id_delay_change= null;
        this._id_version_check_toggle= null;
        this._id_server_option_reconnect= null;
        this._id_recent_capacity_change= null;
        this._id_distinguish_groups_recent= null;
        this._id_target_mode_select= null;

        this._id_cmd_change_triggering= null;

        /** Contained for signal connection IDs for later discard of the gSettings elements */
        this.SETT_SIGS=[];

        this.pref_ui_filename="prefs.ui"
        if (Gtk.get_major_version() >= "4") {
            this.pref_ui_filename="prefs40.ui"
            this.__addFn = this.append;
            this.__showFn = this.show;
        }
        else {
            this.__addFn = x => this.pack_start(x, true, true, 0);
            this.__showFn = this.show_all;
        }
        
        this.build()
    },

    /**
     * Destructor.
     * 
     * Discards connections.
     */
    destroy(){
        if(this._id_compact_toggle){
            this._objects.NVPN_Sett_Toggle_Compact.disconnect(this._id_compact_toggle);
            this._id_compact_toggle= null;
        }
        if(this._id_color_toggle){
            this._objects.NVPN_Sett_Toggle_Color.disconnect(this._id_color_toggle);
            this._id_color_toggle= null;
        }
        if(this._id_delay_change){
            this._objects.NVPN_Sett_Spin_Refresh.disconnect(this._id_delay_change);
            this._id_delay_change= null;
        }
        if(this._id_version_check_toggle){
            this._objects.NVPN_Sett_Toggle_Version.disconnect(this._id_version_check_toggle);
            this._id_version_check_toggle= null;
        }
        if(this._id_server_option_reconnect){
            this._objects.NVPN_Sett_Toggle_Option_Reconnect.disconnect(this._id_server_option_reconnect);
            this._id_server_option_reconnect= null;
        }
        if(this._id_recent_capacity_change){
            this._objects.NVPN_Sett_Spin_Recent_Cap.disconnect(this._id_recent_capacity_change);
            this._id_recent_capacity_change= null;
        }
        if(this._id_distinguish_groups_recent){
            this._objects.NVPN_Sett_Toggle_Recent_Groups.disconnect(this._id_distinguish_groups_recent);
            this._id_distinguish_groups_recent= null;
        }
        if(this._id_target_mode_select){
            this._objects.NVPN_Sett_TxtCombo_Target_Mode.disconnect(this._id_target_mode_select);
            this._id_target_mode_select= null;
        }
        if(_id_cmd_change_triggering){
            this._objects.NVPN_Sett_Switch_Cmd_Change.disconnect(this._id_cmd_change_triggering);
            this._id_cmd_change_triggering= null;
        }
        if(_id_default_cmd){
            this._objects.NVPN_Sett_Button_Default.disconnect(this._id_default_cmd);
            this._id_default_cmd= null;
        }
        if(_id_reset_cmd){
            this._objects.NVPN_Sett_Button_Reset.disconnect(this._id_reset_cmd);
            this._id_reset_cmd= null;
        }
        if(_id_apply_cmd){
            this._objects.NVPN_Sett_Button_Apply.disconnect(this._id_apply_cmd);
            this._id_apply_cmd= null;
        }

        for(var i= 0; i<SETT_SIGS.length; ++i){
            if(SETT_SIGS[i])
                SETTINGS.disconnect(SETT_SIGS[i]);
        }
    },

    /**
     * Builds the UI
     * 
     * @returns the main GTX widget to display in extension's 'settings' window
     */
    build(){
        /** This pages uses an UI file ('prefs.ui') generated with 'Glade'
         *  Here, we need an instance of the Gtk Builder that will load the file
         *  and build the UI from there.
         */
        this.builder= new Gtk.Builder();
        if (this.builder.add_from_file(Me.dir.get_child(this.pref_ui_filename).get_path())==0){
            log("[NVPN - Settings] failed to load ui file")
        }
        else{
            log("[NVPN - Settings] lesgo")
            /** Care was taken so that all the elements in the '_objects' dictionary field, 
             *  all have the same name has the relevant corresponding objects in the '.ui' file.
             *  This loop uses this to ensure that the fields in '_objects' are refering to the
             *  UI elements of correcponding names.
            */
            for (let o in this._objects) {
                log("[NVPN - Settings] o: "+o)
                this._objects[o] = this.builder.get_object(o);
            }

            this.__addFn(this.builder.get_object('main_container'))

            /** Calibrating the UI according to current gSettings state */
            this._initFromSettings();

            /** Connecting UI elements with appropriate callbacks */
            this._initConnections();

            /** Fill the UI 'Text entries' according to current gSettings state */
            this._preapreUI();
        }

        // return this._objects.main_container;
    },

    /**
     * Method that calibrates UI elements according to current gSettings state
     */
    _initFromSettings(){
        this._objects.NVPN_Sett_Toggle_Compact.set_state(SETTINGS.get_boolean('compact-icon'));
        this._objects.NVPN_Sett_Toggle_Color.set_state(SETTINGS.get_boolean('colored-status'));
        this._objects.NVPN_Sett_Spin_Refresh.set_value(SETTINGS.get_int('refresh-delay'));
        this._objects.NVPN_Sett_Toggle_Version.set_state(SETTINGS.get_boolean('version-check'));
        this._objects.NVPN_Sett_Toggle_Option_Reconnect.set_state(SETTINGS.get_boolean('settings-change-reconnect'));
        this._objects.NVPN_Sett_Spin_Recent_Cap.set_value(SETTINGS.get_int('recent-capacity'));
        this._objects.NVPN_Sett_Toggle_Recent_Groups.set_state(SETTINGS.get_boolean('recent-distinguish-groups'));
        this._objects.NVPN_Sett_TxtCombo_Target_Mode.set_active(SETTINGS.get_int('target-display-mode'));
    },

    /**
     * Method that connects UI elements signals to appropriate callbacks
     */
    _initConnections(){
        this._id_compact_toggle=
            this._objects.NVPN_Sett_Toggle_Compact.connect(
                "state-set",
                Lang.bind(this, this._sig_Compact_state_set)
            );
        this.SETT_SIGS[0]= SETTINGS.connect('changed::compact-icon', ()=>{
            this._objects.NVPN_Sett_Toggle_Compact.set_state(SETTINGS.get_boolean('compact-icon'));
        });

        this._id_color_toggle=
            this._objects.NVPN_Sett_Toggle_Color.connect(
                "state-set",
                Lang.bind(this, this._sig_Color_state_set)
            );
        this.SETT_SIGS[7]= SETTINGS.connect('changed::colored-status', ()=>{
            this._objects.NVPN_Sett_Toggle_Color.set_state(SETTINGS.get_boolean('colored-status'));
        });

        this._id_delay_change=
            this._objects.NVPN_Sett_Spin_Refresh.connect(
                "value-changed",
                Lang.bind(this, this._sig_Referesh_value_changed)
            );
        this.SETT_SIGS[1]= SETTINGS.connect('changed::refresh-delay', () =>{
            this._objects.NVPN_Sett_Spin_Refresh.set_value(SETTINGS.get_int('refresh-delay'));
        });

        this._id_version_check_toggle=
            this._objects.NVPN_Sett_Toggle_Version.connect(
                "state-set",
                Lang.bind(this, this._sig_Version_check_set)
            );
        this.SETT_SIGS[2]= SETTINGS.connect('changed::version-check', ()=>{
            this._objects.NVPN_Sett_Toggle_Version.set_state(SETTINGS.get_boolean('version-check'));
        });

        this._id_server_option_reconnect=
            this._objects.NVPN_Sett_Toggle_Option_Reconnect.connect(
                "state-set",
                Lang.bind(this, this._sig_Option_server_reconnect_set)
            );
        this.SETT_SIGS[3]= SETTINGS.connect('changed::settings-change-reconnect', ()=>{
            this._objects.NVPN_Sett_Toggle_Option_Reconnect.set_state(SETTINGS.get_boolean('settings-change-reconnect'));
        });

        this._id_recent_capacity_change=
            this._objects.NVPN_Sett_Spin_Recent_Cap.connect(
                "value-changed",
                Lang.bind(this, this._sig_Recent_capacity_value_changed)
            );
        this.SETT_SIGS[4]= SETTINGS.connect('changed::recent-capacity', () => {
            this._objects.NVPN_Sett_Spin_Recent_Cap.set_value(SETTINGS.get_int('recent-capacity'));
        });

        this._id_distinguish_groups_recent=
            this._objects.NVPN_Sett_Toggle_Recent_Groups.connect(
                "state-set",
                Lang.bind(this,this._sig_Distinguish_groups_recentmenu)
            );
        this.SETT_SIGS[5]= SETTINGS.connect('changed::recent-distinguish-groups', ()=>{
            this._objects.NVPN_Sett_Toggle_Recent_Groups.set_state(SETTINGS.get_boolean('recent-distinguish-groups'));
        });


        this._id_target_mode_select=
            this._objects.NVPN_Sett_TxtCombo_Target_Mode.connect(
                "changed",
                Lang.bind(this, this._sig_target_mode_changed)
            );
        this.SETT_SIGS[6]= SETTINGS.connect('changed::target-display-mode', () => {
            this._objects.NVPN_Sett_TxtCombo_Target_Mode.set_active(SETTINGS.get_int('target-display-mode'));
        });


        this._id_cmd_change_triggering=
            this._objects.NVPN_Sett_Switch_Cmd_Change.connect(
                "state-set",
                Lang.bind(this, this._sig_Cmd_change_triggering)
            );

        this._id_default_cmd=
            this._objects.NVPN_Sett_Button_Default.connect(
                "clicked",
                Lang.bind(this, this._sig_Cmd_change_default)
            );

        this._id_reset_cmd=
            this._objects.NVPN_Sett_Button_Reset.connect(
                "clicked",
                Lang.bind(this, this._sig_Cmd_change_reset)
            );

        this._id_apply_cmd=
            this._objects.NVPN_Sett_Button_Apply.connect(
                "clicked",
                Lang.bind(this, this._sig_Cmd_change_apply)
            );
    },

    /**
     * Method that fills the 'Text Entries' elements according to current gSettings state'
     */
    _preapreUI(){
        let fillEntries= (gEntry, gsKey) => {
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        }
        
        fillEntries(this._objects.NVPN_Sett_Entry_Command_Shell, 'cmd-shell');
        fillEntries(this._objects.NVPN_Sett_Entry_Available_Tool, 'cmd-tool-available');
        fillEntries(this._objects.NVPN_Sett_Entry_Connected_Check, 'cmd-tool-connected-check');
        fillEntries(this._objects.NVPN_Sett_Entry_Transition_Check, 'cmd-tool-transition-check');
        fillEntries(this._objects.NVPN_Sett_Entry_No_Daemon_Check, 'cmd-daemon-unreachable-check');
        fillEntries(this._objects.NVPN_Sett_Entry_Login_Check, 'cmd-tool-logged-check');
        fillEntries(this._objects.NVPN_Sett_Entry_Server_Get, 'cmd-current-server-get');
        fillEntries(this._objects.NVPN_Sett_Entry_Connect_To, 'cmd-server-place-connect');
        fillEntries(this._objects.NVPN_Sett_Entry_Disconnect, 'cmd-server-disconnect');
        fillEntries(this._objects.NVPN_Sett_Entry_Daemon_Online_Check, 'cmd-daemon-online-check');
        fillEntries(this._objects.NVPN_Sett_Entry_VPN_Online, 'cmd-vpn-online-check');
        fillEntries(this._objects.NVPN_Sett_Entry_Option_Set, 'cmd-option-set');
        fillEntries(this._objects.NVPN_Sett_Entry_Get_Options, 'cmd-get-options');
        fillEntries(this._objects.NVPN_Sett_Entry_Get_Version, 'cmd-get-version');
        fillEntries(this._objects.NVPN_Sett_Entry_Get_Groups_Countries, 'cmd-get-groups-countries');

        let s= this._objects.NVPN_Sett_Switch_Cmd_Change.get_state();
        this._objects.NVPN_Sett_ButBox_Change_Cmd_Confirm.set_sensitive(s);
        this._objects.NVPN_Sett_Grid2.set_sensitive(s);
    },


    _sig_Compact_state_set(item, state, user_data){
        SETTINGS.set_boolean('compact-icon', state);
    },

    _sig_Color_state_set(item, state, user_data){
        SETTINGS.set_boolean('colored-status', state);
    },

    _sig_Version_check_set(item, state, user_data){
        SETTINGS.set_boolean('version-check', state);
    },

    _sig_Option_server_reconnect_set(item, state, user_data){
        SETTINGS.set_boolean('settings-change-reconnect', state);
    },
    
    _sig_Referesh_value_changed(item, user_data){
        if(item){
            SETTINGS.set_int('refresh-delay', item.get_value());
        }
    },

    _sig_Recent_capacity_value_changed(item, user_data){
        if(item){
            SETTINGS.set_int('recent-capacity', item.get_value());
        }
    },

    _sig_Distinguish_groups_recentmenu(item, state, user_data){
        if(item){
            SETTINGS.set_boolean('recent-distinguish-groups', state);
        }
    },

    _sig_target_mode_changed(item, user_data){
        if(item){
            SETTINGS.set_int('target-display-mode', item.get_active());
        }
    },

    _sig_Cmd_change_triggering(item, state, user_data){
        this._objects.NVPN_Sett_Grid2.set_sensitive(state);
        this._objects.NVPN_Sett_ButBox_Change_Cmd_Confirm.set_sensitive(state);
    },

    _sig_Cmd_change_default(){
        let chToDef= (gEntry, gsKey) => {
            SETTINGS.reset(gsKey);
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        }

        chToDef(this._objects.NVPN_Sett_Entry_Command_Shell, 'cmd-shell');
        chToDef(this._objects.NVPN_Sett_Entry_Available_Tool, 'cmd-tool-available');
        chToDef(this._objects.NVPN_Sett_Entry_Connected_Check, 'cmd-tool-connected-check');
        chToDef(this._objects.NVPN_Sett_Entry_Transition_Check, 'cmd-tool-transition-check');
        chToDef(this._objects.NVPN_Sett_Entry_No_Daemon_Check, 'cmd-daemon-unreachable-check');
        chToDef(this._objects.NVPN_Sett_Entry_Login_Check, 'cmd-tool-logged-check');
        chToDef(this._objects.NVPN_Sett_Entry_Server_Get, 'cmd-current-server-get');
        chToDef(this._objects.NVPN_Sett_Entry_Connect_To, 'cmd-server-place-connect');
        chToDef(this._objects.NVPN_Sett_Entry_Disconnect, 'cmd-server-disconnect');
        chToDef(this._objects.NVPN_Sett_Entry_Daemon_Online_Check, 'cmd-daemon-online-check');
        chToDef(this._objects.NVPN_Sett_Entry_VPN_Online, 'cmd-vpn-online-check');
        chToDef(this._objects.NVPN_Sett_Entry_Option_Set, 'cmd-option-set');
        chToDef(this._objects.NVPN_Sett_Entry_Get_Options, 'cmd-get-options');
        chToDef(this._objects.NVPN_Sett_Entry_Get_Version, 'cmd-get-version');
        chToDef(this._objects.NVPN_Sett_Entry_Get_Groups_Countries, 'cmd-get-groups-countries');

        this._objects.NVPN_Sett_Switch_Cmd_Change.set_state(false);
    },

    _sig_Cmd_change_reset(){
        let chToRst= (gEntry, gsKey) => {
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        };

        chToRst(this._objects.NVPN_Sett_Entry_Command_Shell, 'cmd-shell');
        chToRst(this._objects.NVPN_Sett_Entry_Available_Tool, 'cmd-tool-available');
        chToRst(this._objects.NVPN_Sett_Entry_Connected_Check, 'cmd-tool-connected-check');
        chToRst(this._objects.NVPN_Sett_Entry_Transition_Check, 'cmd-tool-transition-check');
        chToRst(this._objects.NVPN_Sett_Entry_No_Daemon_Check, 'cmd-daemon-unreachable-check');
        chToRst(this._objects.NVPN_Sett_Entry_Login_Check, 'cmd-tool-logged-check');
        chToRst(this._objects.NVPN_Sett_Entry_Server_Get, 'cmd-current-server-get');
        chToRst(this._objects.NVPN_Sett_Entry_Connect_To, 'cmd-server-place-connect');
        chToRst(this._objects.NVPN_Sett_Entry_Disconnect, 'cmd-server-disconnect');
        chToRst(this._objects.NVPN_Sett_Entry_Daemon_Online_Check, 'cmd-daemon-online-check');
        chToRst(this._objects.NVPN_Sett_Entry_VPN_Online, 'cmd-vpn-online-check');
        chToRst(this._objects.NVPN_Sett_Entry_Option_Set, 'cmd-option-set');
        chToRst(this._objects.NVPN_Sett_Entry_Get_Options, 'cmd-get-options');
        chToRst(this._objects.NVPN_Sett_Entry_Get_Version, 'cmd-get-version');
        chToRst(this._objects.NVPN_Sett_Entry_Get_Groups_Countries, 'cmd-get-groups-countries');
    },

    _sig_Cmd_change_apply(){
        let applyCh= (gEntry, gsKey) => {
            SETTINGS.set_string(gsKey, gEntry.get_text());
        };

        applyCh(this._objects.NVPN_Sett_Entry_Command_Shell, 'cmd-shell');
        applyCh(this._objects.NVPN_Sett_Entry_Available_Tool, 'cmd-tool-available');
        applyCh(this._objects.NVPN_Sett_Entry_Connected_Check, 'cmd-tool-connected-check');
        applyCh(this._objects.NVPN_Sett_Entry_Transition_Check, 'cmd-tool-transition-check');
        applyCh(this._objects.NVPN_Sett_Entry_No_Daemon_Check, 'cmd-daemon-unreachable-check');
        applyCh(this._objects.NVPN_Sett_Entry_Login_Check, 'cmd-tool-logged-check');
        applyCh(this._objects.NVPN_Sett_Entry_Server_Get, 'cmd-current-server-get');
        applyCh(this._objects.NVPN_Sett_Entry_Connect_To, 'cmd-server-place-connect');
        applyCh(this._objects.NVPN_Sett_Entry_Disconnect, 'cmd-server-disconnect');
        applyCh(this._objects.NVPN_Sett_Entry_Daemon_Online_Check, 'cmd-daemon-online-check');
        applyCh(this._objects.NVPN_Sett_Entry_VPN_Online, 'cmd-vpn-online-check');
        applyCh(this._objects.NVPN_Sett_Entry_Option_Set, 'cmd-option-set');
        applyCh(this._objects.NVPN_Sett_Entry_Get_Options, 'cmd-get-options');
        applyCh(this._objects.NVPN_Sett_Entry_Get_Version, 'cmd-get-version');
        applyCh(this._objects.NVPN_Sett_Entry_Get_Groups_Countries, 'cmd-get-groups-countries');

        this._objects.NVPN_Sett_Switch_Cmd_Change.set_state(false);
    },
}
);

let ui;

function init() {
	// Convenience.initTranslations();
    // ui = new NVPN_Settings();
}

function buildPrefsWidget() {
    // return ui.build();
    let ui= new NVPN_Settings()
    ui.__showFn()
    return ui
}
