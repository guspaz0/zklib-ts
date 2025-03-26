export class Finger {
    constructor(uid, fid, valid, size, template){
        this._uid = uid;
        this._fid = fid;
        this._valid = valid;
        this._size = size
        this._template = template;
    }
    set uid(value) {
        this._uid = value 
    }
    set fid(value){ 
        this._fid = value 
    }
    set valid(value){ 
        this._valid = value
    }
    set size(value) {
        this._size = value
    }
    set template(value){
        this._template = value 
    }

    get uid(){
        return this._uid;
    }
    get fid(){
        return this._fid
    }
    get valid() {
        return this._valid
    }
    get size(){
        return this._size
    }
    get template(){
        return this._template
    }

}