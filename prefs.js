
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

//let NVPN_Settings = GObject.registerClass(

class NVPN_Settings{
    constructor() {
        this._objects= {
            NVPN_Sett_Tabs: null,
            NVPN_Sett_Grid: null,
            NVPN_Sett_Toggle_Compact: null,
            NVPN_Sett_Label_Compact: null,
            NVPN_Sett_Spin_Refresh: null,
            NVPN_Sett_Label_Refresh: null,
        }

        this._id_compact_toggle= null;
        this._id_delay_change= null;

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

        for(var i= 0; i<SETT_SIGS.length; ++i){
            if(SETT_SIGS[i])
                SETTINGS.disconnect(SETT_SIGS[i]);
        }
    }

    build(){
        this.builder= new Gtk.Builder();
        this.builder.add_from_file(
            Me.dir.get_child("prefs.ui").get_path());

        for (let o in this._objects) {
            this._objects[o] = this.builder.get_object(o);
        }

        this._initFromSettings();

        this._initConnections();

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
    }


    _sig_Compact_state_set(item, state, user_data){
        log("lol state at "+state);
        SETTINGS.set_boolean('compact-icon', state);
    }
    
    _sig_Referesh_value_changed(item, user_data){
        if(item){
            log("rofl");
            SETTINGS.set_int('refresh-delay', item.get_value());
        }
    }


}

//);

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
