var application = require("application");

var _debug = false

function debug(text){
    if(_debug)
        console.log("DEBUG Facebook say: " + text)
}

var Facebook = function(){

    var default_permissions = ["public_profile", "email"]
    var default_fileds = "id,name,email"

    Facebook.setDebug = function(debug){
        _debug = debug
    }

    Facebook.logInWithPublishPermissions = function(permissions) {
        if (this._isInit) {

            var self = this
            application.android.on("activityResult", function(eventData) {
                
                if(com.facebook.FacebookSdk.isFacebookRequestCode(eventData.requestCode))
                    self.mCallbackManager.onActivityResult(eventData.requestCode, eventData.resultCode, eventData.intent);
                else
                    debug("request code not is facebook request code: " + eventData.requestCode)
            })

            var javaPermissions = java.util.Arrays.asList(permissions || default_permissions);
            this.loginManager.logInWithPublishPermissions(this._act, javaPermissions);
        }

        
    }

    Facebook.logInWithReadPermissions = function(permissions){
        if (this._isInit) {

            var self = this

            application.android.on("activityResult", function(eventData) {
                if(com.facebook.FacebookSdk.isFacebookRequestCode(eventData.requestCode))
                    self.mCallbackManager.onActivityResult(eventData.requestCode, eventData.resultCode, eventData.intent);
                else
                    debug("request code not is facebook request code: " + eventData.requestCode)
            })

            var javaPermissions = java.util.Arrays.asList(permissions || default_permissions);
            this.loginManager.logInWithReadPermissions(application.android.currentContext, javaPermissions);
        }
    }

    Facebook.getAcessToken = function() {
        return com.facebook.AccessToken.getCurrentAccessToken();
    }

    Facebook.isLoggedIn = function() {
        return this.getAcessToken() != null
    }


    Facebook.logout = function() {
        if(this._isInit){
            this.loginManager.logOut();
        }
    }

    Facebook.initSdk = function(loginBehavior) {

        if(this._isInit)
            return true

        try {
            com.facebook.FacebookSdk.sdkInitialize(application.android.context.getApplicationContext());
        }catch (error) {
            debug("nativescript-facebook-login: The plugin could not find the android library, try to clean the android platform. " + error);
        }

        this.mCallbackManager = com.facebook.CallbackManager.Factory.create();
        this.loginManager = com.facebook.login.LoginManager.getInstance();

        if (loginBehavior)
            this.loginManager = this.loginManager.setLoginBehavior(loginBehavior);


        if (this.mCallbackManager && this.loginManager) {
            this._isInit = true;
            return true;
        }else {
            return false;
        }
    }

    Facebook.registerCallback = function(successCallback, cancelCallback, failCallback){
        this._failCallback  = failCallback
        this._successCallback  = successCallback
        this._cancelCallback = cancelCallback

        if (this._isInit) {
            var self = this
            this._act = application.android.foregroundActivity || application.android.startActivity;
            this.loginManager.registerCallback(this.mCallbackManager, new com.facebook.FacebookCallback({
                onSuccess: function (result) {
                    debug("###### FACEBOOK SUCCESS")
                    self._successCallback(result);
                },
                onCancel: function () {
                    debug("###### FACEBOOK CANCEL")
                    self._cancelCallback();
                },
                onError: function (e) {
                    debug("###### FACEBOOK ERROR: " + e)
                    self._failCallback(e);
                }
            }));

        }
    }

    // args = { fields, callback}
    Facebook.requestUserProfile = function(args) {

        args.fields = args.fields || default_fileds

        var bundle = new android.os.Bundle();
        bundle.putString("fields", args.fields);

        var accessToken = this.getAcessToken()

        this.doMeRequest({
            accessToken: accessToken, 
            bundle: bundle, 
            callback: function(fbUser){
                var json = toJson(fbUser)
                json.token = accessToken.getToken()
                args.callback(json)
            }            
        })
    }

    Facebook.requestBooks = function(args) {

        var fields = args.fields
        var callback = args.callback

        var graphPath = "/me/books.reads"
        var accessToken = this.getAcessToken()

        this.doGraphPathRequest({
          accessToken: accessToken,
          graphPath: graphPath,
          callback: function(graphResponse)  {
              var json = graphResponse.getJSONObject()
              var array = json.getJSONArray('data')
              var results = toJsonrray(array)
              callback(results)
          }
        })

    }

    Facebook.requestFriends = function(args) {

        var userId = args.userId
        var callback = args.callback
        var fields = args.fields

        if(!userId || userId.trim().length == 0){
          this._failCallback("facebook user id cannot be null to this request")
          return
        }

        var bundle = new android.os.Bundle();
        bundle.putString("fields", fields);

        var graphPath = "/" + userId + "/friends"
        var accessToken = this.getAcessToken()

        this.doGraphPathRequest({
          accessToken: accessToken,
          graphPath: graphPath,
          bundle: bundle,
          callback: function(graphResponse) {
              var json = graphResponse.getJSONObject()
              var array = json.getJSONArray('data')
              var results = toJsonrray(array)
              callback(results)
          }
        })


    }

    //url, title, content, imageUrl
    Facebook.share = function(params){
        try{
            
            var builder = new com.facebook.share.model.ShareLinkContent.Builder()

            if(params.url)
                builder.setContentUrl(android.net.Uri.parse(params.url))

            if(params.title)
                builder.setContentTitle(params.title)

            if(params.imageUrl)
                builder.setImageUrl(android.net.Uri.parse(params.imageUrl))

            if(params.content)
                builder.setContentDescription(params.content)

            var content = builder.build();

            this.shareContent(application.android.context, params)

        }catch(error){
            console.log(error)
            this._failCallback(error)
        }
    }

    // imagePath, content, imageUrl
    Facebook.sharePhoto = function(params){
        try{

            var builder = new com.facebook.share.model.SharePhotoContent.Builder()
            var photo = this.createPhotoShare(params)
            var content = builder.addPhoto(photo).build();

            this.shareContent(content, params)

        }catch(error){
            console.log(error)
            this._failCallback(error)
        }
    }

    Facebook.shareContent = function(content, params) {

        var self = this
        var activity = application.android.foregroundActivity || application.android.startActivity;

        application.android.on("activityResult", function(eventData) {
            
            if(com.facebook.FacebookSdk.isFacebookRequestCode(eventData.requestCode))
                self.mCallbackManager.onActivityResult(eventData.requestCode, eventData.resultCode, eventData.intent);
            else
                debug("request code not is facebook request code: " + eventData.requestCode)
        })

        var shareDialog = new com.facebook.share.widget.ShareDialog(activity);

        var shareCallback = new com.facebook.FacebookCallback({
            onSuccess: function (result) {
                debug("###### FACEBOOK DIALOG SUCCESS")
                if(params && params.success)
                    params.success()
            },
            onCancel: function () {
                debug("###### FACEBOOK DIALOG CANCEL")
                if(params && params.cancel)
                    params.cancel()
            },
            onError: function (e) {
                debug("###### FACEBOOK DIALOG ERROR: " + e)
                if(params && params.error)
                    params.error(e)
            }
        })

        shareDialog.registerCallback(this.mCallbackManager, shareCallback);
        shareDialog.show(content)        
    }

    // list of {imagePath, content, imageUrl}
    Facebook.sharePhotos = function(params){
        try{

            var builder = new com.facebook.share.model.SharePhotoContent.Builder()
            var photos = []

            for(var i in params.list){
                photos.push(this.createPhotoShare(params.list[i]))
            }

            for(var i in photos)
                builder.addPhoto(photos[i])

            var content = builder.build();

            this.shareContent(content, params)
            
        }catch(error){
            console.log(error)
            this._failCallback(error)
        }
    }

    Facebook.createPhotoShare = function(params){
        var builder = new com.facebook.share.model.SharePhoto.Builder();
        var bmOptions = new android.graphics.BitmapFactory.Options();
        var bitmap

        if(params.imagePath)
            bitmap = android.graphics.BitmapFactory.decodeFile(params.imagePath, bmOptions);

        if(bitmap)
            builder.setBitmap(bitmap);

        if(params.content)
            builder.setCaption(params.content);

        if(params.content)
            builder.setCaption(params.content);

        if(params.imageUrl)
            builder.setImageUrl(android.net.Uri.parse(params.imageUrl))

        builder.setUserGenerated(true);

        return builder.build();
    }

    Facebook.doMeRequest = function(args){

        var accessToken = args.accessToken
        var bundle = args.bundle
        var callback = args.callback

        try{

            var self = this
            var request = com.facebook.GraphRequest.newMeRequest(accessToken, new com.facebook.GraphRequest.GraphJSONObjectCallback({
                onCompleted: function(entity, graphResponse) {

                    if(graphResponse.getError()){
                        self.handlerError(graphResponse.getError())
                    }else{
                        callback(entity)
                    }
                }
            }))

            if(bundle)
                request.setParameters(bundle);

            request.executeAsync()
        }catch(error){
            console.log(error)
            this._failCallback(error)
        }
    }

    Facebook.doGraphPathRequest = function(args){

      var accessToken = args.accessToken
      var graphPath = args.graphPath
      var bundle = args.bundle
      var callback = args.callback

        try{

            var self = this
            var request = com.facebook.GraphRequest.newGraphPathRequest(accessToken, graphPath, new com.facebook.GraphRequest.Callback({
                onCompleted: function(graphResponse){

                    if(graphResponse.getError()){
                        self.handlerError(graphResponse.getError())
                    }else{
                        callback(graphResponse)
                    }
                }
            }))

            if(bundle)
                request.setParameters(bundle);

            request.executeAsync()


        }catch(error){
            console.log(error)
            this._failCallback(error)
        }
    }


    Facebook.handlerError = function(error){

        var errorString = "Message: " + error.getErrorMessage()
        errorString += ", Type: " + error.getErrorType()
        errorString += ", Code: " + error.getErrorCode()

        if(this._failCallback)
            this._failCallback(errorString)

    }

    Facebook.invite = function(args){

        if (com.facebook.share.widget.AppInviteDialog.canShow()) {
            var content = new com.facebook.share.model.AppInviteContent.Builder()
                        .setApplinkUrl(args.appLinkUrl)
                        .setPreviewImageUrl(args.previewImageUrl)
                        .build();
            com.facebook.share.widget.AppInviteDialog.show(application.android.currentContext, content);
            return true
        }else{
            return false
        }        
    }

    Facebook.canInvite = function(){
        return com.facebook.share.widget.AppInviteDialog.canShow()       
    }    

    Facebook.isInstalled = function(){
        return isPackageExisted("com.facebook.orca") || isPackageExisted("com.facebook.katana") || isPackageExisted("com.facebook.android")
    }    

    function isPackageExisted(targetPackage) {

        packageManager = application.android.currentContext.getPackageManager()
        
        try {
            var info = packageManager.getPackageInfo(targetPackage, android.content.pm.PackageManager.GET_META_DATA);
        } catch (e) {
            debug("error on get installed packege " + targetPackage + ": " + e)
            return false
        }

        return true
    }    
    
    return Facebook
}

function toJson(entity)  {

    var keys = entity.keys()
    var json = {}

    while(keys.hasNext()){

        var key = keys.next()
        var jobject = entity.optJSONObject(key)
        var jarray = entity.optJSONArray(key)

        if(jobject){
            json[key] = toJson(jobject)
        } else if(jarray){
            json[key] = toJsonrray(jarray)
        } else {
            json[key] = entity.get(key).toString()
        }
    }

    return json
}

function toJsonrray(entities) {

    var jsonArray = []

    for(var j = 0; j < entities.length(); j++){

        var entity = entities.get(j)
        var json = toJson(entity)
        jsonArray.push(json)
    }

    return jsonArray
}

exports.Facebook = Facebook
