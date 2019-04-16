
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gettext = imports.gettext.domain('gnome-shell-extensions-nvpnconnect');
const _ = Gettext.gettext;


let SETTINGS= Convenience.getSettings();

class NVPN_Settings{
    constructor() {
        this._objects= {
            NVPN_Sett_Tabs: null,
            NVPN_Sett_Grid: null,
            NVPN_Sett_Toggle_Compact: null,
            NVPN_Sett_Label_Compact: null,
            NVPN_Sett_Spin_Refresh: null,
            NVPN_Sett_Label_Refresh: null,

            NVPN_Sett_Switch_Cmd_Change: null,
            NVPN_Sett_Grid2: null,
            NVPN_Sett_ButBox_Change_Cmd_Confirm: null,
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
            NVPN_Sett_Button_Default: null,
            NVPN_Sett_Button_Reset: null,
            NVPN_Sett_Button_Apply: null,
        }

        this._id_compact_toggle= null;
        this._id_delay_change= null;

        this._id_cmd_change_triggering= null;

        this.SETT_SIGS=[];
    }

    destroy(){
        if(this._id_compact_toggle){
            this._objects.NVPN_Sett_Toggle_Compact.disconnect(this._id_compact_toggle);
            this._id_compact_toggle= null;
        }
        if(this._id_delay_change){
            this._objects.NVPN_Sett_Spin_Refresh.disconnect(this._id_delay_change);
            this._id_delay_change= null;
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
    }

    build(){
        this.builder= new Gtk.Builder();
        this.builder.add_from_file(
            Me.dir.get_child("prefs.ui").get_path()
        );

        for (let o in this._objects) {
            this._objects[o] = this.builder.get_object(o);
        }

        this._initFromSettings();

        this._initConnections();

        this._preapreUI();

        return this._objects.NVPN_Sett_Tabs;
    }

    _initFromSettings(){
        this._objects.NVPN_Sett_Toggle_Compact.set_state(SETTINGS.get_boolean('compact-icon'));
        this._objects.NVPN_Sett_Spin_Refresh.set_value(SETTINGS.get_int('refresh-delay'));
    }

    _initConnections(){
        this._id_compact_toggle=
            this._objects.NVPN_Sett_Toggle_Compact.connect(
                "state-set",
                Lang.bind(this, this._sig_Compact_state_set)
            );
        this.SETT_SIGS[0]= SETTINGS.connect('changed::compact-icon', ()=>{
            this._objects.NVPN_Sett_Toggle_Compact.set_state(SETTINGS.get_boolean('compact-icon'));
        });

        this._id_delay_change=
            this._objects.NVPN_Sett_Spin_Refresh.connect(
                "value-changed",
                Lang.bind(this, this._sig_Referesh_value_changed)
            );
        this.SETT_SIGS[1]= SETTINGS.connect('changed::refresh-delay', () =>{
            this._objects.NVPN_Sett_Spin_Refresh.set_value(SETTINGS.get_int('refresh-delay'));
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
    }

    _preapreUI(){
        let fillEntries= (gEntry, gsKey) => {
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        }
        
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

        let s= this._objects.NVPN_Sett_Switch_Cmd_Change.get_state();
        this._objects.NVPN_Sett_ButBox_Change_Cmd_Confirm.set_sensitive(s);
        this._objects.NVPN_Sett_Grid2.set_sensitive(s);
    }


    _sig_Compact_state_set(item, state, user_data){
        SETTINGS.set_boolean('compact-icon', state);
    }
    
    _sig_Referesh_value_changed(item, user_data){
        if(item){
            SETTINGS.set_int('refresh-delay', item.get_value());
        }
    }

    _sig_Cmd_change_triggering(item, state, user_data){
        this._objects.NVPN_Sett_Grid2.set_sensitive(state);
        this._objects.NVPN_Sett_ButBox_Change_Cmd_Confirm.set_sensitive(state);
    }

    _sig_Cmd_change_default(){
        let chToDef= (gEntry, gsKey) => {
            SETTINGS.reset(gsKey);
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        }

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

        this._objects.NVPN_Sett_Switch_Cmd_Change.set_state(false);
    }

    _sig_Cmd_change_reset(){
        let chToRst= (gEntry, gsKey) => {
            gEntry.set_text(
                SETTINGS.get_string(gsKey)
            );
        };

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
    }

    _sig_Cmd_change_apply(){
        let applyCh= (gEntry, gsKey) => {
            SETTINGS.set_string(gsKey, gEntry.get_text());
        };

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

        this._objects.NVPN_Sett_Switch_Cmd_Change.set_state(false);
    }


}

let ui;

function init() {
	Convenience.initTranslations();
    ui = new NVPN_Settings();
}

function buildPrefsWidget() {
    return ui.build();
}

function reset_settings(b) {
    SETTINGS.reset('compact-icon');
}
