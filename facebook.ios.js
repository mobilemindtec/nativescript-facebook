var application = require('application')

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

    Facebook.logInWithPublishPermissions = function(permissions){
        if(this._isInit){
            this.loginManager.logInWithPermissionsFromViewControllerHandler(permissions || default_permissions, application.ios.rootController, this._callbackManager);
        }
    }

    Facebook.logInWithReadPermissions = function(permissions){
        if (this._isInit) {
            this.loginManager.logInWithPermissionsFromViewControllerHandler(permissions || default_permissions, application.ios.rootController, this._callbackManager);
        }
    }

    Facebook.getAccessToken = function(){
        var accessToken = FBSDKAccessToken.currentAccessToken
        return accessToken
    }

    Facebook.isLoggedIn = function(){
        return this.getAccessToken() != null
    }

    Facebook.logout = function(){
        this.loginManager.logOut();
    }

    Facebook.initSdk = function(loginBehavior){
        this.loginManager = FBSDKLoginManager.alloc().init();
        if (this.loginManager) {

            console.dir(this.loginManager)

            //this.loginManager.logOut();
            if (loginBehavior) {
                this.loginManager.loginBehavior = loginBehavior;
            }else{
                this.loginManager.loginBehavior = FBSDKLoginBehavior.Browser
            }
            this._isInit = true;
            return true;
        }
        else {
            return false;
        }
    }

    Facebook.registerCallback = function(successCallback, cancelCallback, failCallback){

        this._successCallback = successCallback
        this._cancelCallback = cancelCallback
        this._failCallback = failCallback
        var self = this
        if (this._isInit) {
            this._callbackManager = function (result, error) {
                if (error) {
                    self.handlerError(error)
                    return;
                }
                if (!result) {
                    self._failCallback("Null error");
                    return;
                }

                //console.log("## result=" + result)

                if (result.isCancelled) {
                    self._cancelCallback();
                    return;
                }
                if (result.token) {
                    self._successCallback(result);
                }
                else {
                    self._failCallback("Could not acquire an access token");
                    return;
                }
            };
        }
    }

    // args = {fields , callback }
    Facebook.requestUserProfile = function(args){

        args = args || { fields: default_fileds }

        var that = this

        this.doMeRequest({
            bundle: {
                fields: args.fields || { fields: default_fileds }
            },
            callback: function(result){
                var json = toJson(result)
                var accessToken = that.getAccessToken()
                
                if(accessToken){
                    json.token = accessToken.tokenString
                }

                args.callback(json)
            }
        })
    }

    Facebook.requestBooks = function(args){

        var fields = args.fields
        var callback = args.callback

        var args = {
          graphPath: "/me/books.reads",
          bundle: {
            fields: fields
          },
          callback: function(graphResponse){
            var json = toJson(result)
            callback(json.data)
          }
        }
        this.doGraphPathRequest(args)
    }

    Facebook.requestFriends = function(args){

        var userId = args.userId
        var callback = args.callback
        var fields = args.fields

        if(!userId || userId.trim().length == 0){
          this._failCallback("facebook user id cannot be null to this request")
          return
        }

        var args = {
            graphPath: "/" + userId + "/friends",
            bundle: {
              fields: fields
            },
            callback: function(result){
                var json = toJson(result)
                callback(json.data)
            }
        }

        this.doGraphPathRequest(args)
    }

    // url, title, content, imageUrl
    Facebook.share = function(params){

        try{
            var content = FBSDKShareLinkContent.alloc().init()

           if(params.url)
                content.contentURL = NSURL.URLWithString(params.url)

            if(params.title)
                content.contentTitle = params.title

            if(params.content)
                content.contentDescription = params.content

            if(params.imageUrl){
                content.imageURL = NSURL.URLWithString(params.imageUrl)
            }

            var view = application.ios.rootController

            var mydelegate = this.createSharingDelegate(params)

            FBSDKShareDialog.showFromViewControllerWithContentDelegate(view, content, mydelegate);
        }catch(error){
            console.log("## error=" + error)
            this._failCallback(error)
        }
    }

    // imagePath, content, imageUrl
    Facebook.sharePhoto = function(args){
        try{

            if(!this.isInstalled()){
                this._failCallback("facebook app not installed")
                return
            }

            var content = FBSDKSharePhotoContent.alloc().init()

            var photo = this.createPhotoShare(args)
            content.photos = [photo];
            var view = application.ios.rootController


            var mydelegate = this.createSharingDelegate(args)

            FBSDKShareDialog.showFromViewControllerWithContentDelegate(view, content, mydelegate);

        }catch(error){
            console.log("## error=" + error)
            this._failCallback(error)
        }
    }

    // args = list of {imagePath, content, imageUrl}
    Facebook.sharePhotos = function(args){

        try{

            if(!this.isInstalled()){
                this._failCallback("facebook app not installed")
                return
            }

          var content = FBSDKSharePhotoContent.alloc().init()
          var photos = []

          for(var i in args.list){
            photos.push(this.createPhotoShare(args.list[i]))
          }

          content.photos = photos;


          var view = application.ios.rootController

          var mydelegate = this.createSharingDelegate(args)
          FBSDKShareDialog.showFromViewControllerWithContentDelegate(view, content, mydelegate);

        }catch(error){
            console.log("## error=" + error)
            this._failCallback(error)
        }
    }

    Facebook.isInstalled = function(){
        var nsUrl = NSURL.URLWithString("fbapi://")
        var isInstalled = canOpenURL(nsUrl)
        return isInstalled
    }

    Facebook.createPhotoShare = function(args){

        var photoShare = FBSDKSharePhoto.alloc().init()

        if(args.imagePath)
            photoShare.image = UIImage.imageWithContentsOfFile(args.imagePath);

        if(args.imageUrl)
            photoShare.imageURL = NSURL.URLWithString(args.imageUrl)

        if(args.content)
            photoShare.caption = args.content

        photoShare.userGenerated = true;

        return photoShare
    }

    Facebook.doMeRequest = function(args){
        args.graphPath = "me"
        this.doGraphPathRequest(args)
    }

    Facebook.doGraphPathRequest = function(args){
        var self = this

        args.bundle = args.bundle || {}

        console.log("## doGraphPathRequest path=" + args.graphPath + ", args.bundle=" + JSON.stringify(args.bundle))

        try{
            if(this.isLoggedIn()){
                var request = FBSDKGraphRequest.alloc().initWithGraphPathParameters(args.graphPath, args.bundle);
                request.startWithCompletionHandler(function(connection, result, error){

                    if(error){
                        self.handlerError(error)
                        return
                    }

                    if(!result){
                        self._failCallback("Null error")
                        return
                    }

                    args.callback(result)

                })
            }else{
                self._failCallback("app is not logged")
            }
        }catch(error){
            console.log("## error=" + error)
            this._failCallback(error)
        }
    }

    Facebook.handlerError = function(error){
        console.log("login error: " + error)
        // https://developers.facebook.com/docs/ios/errors
        var message = error.userInfo.objectForKey(FBSDKErrorDeveloperMessageKey)
        this._failCallback(message);
    }

    Facebook.createSharingDelegate = function(params){
        var self = this
        var MySharingDelegate = (function (_super) {
            __extends(MySharingDelegate, _super);
            
            function MySharingDelegate() {
                _super.apply(this, arguments);
            }

            MySharingDelegate.prototype.sharerDidCompleteWithResults = function (sharer, results) {
                
                debug("###### FACEBOOK DIALOG SUCCESS")
                if(params && params.success)
                    params.success()


            };

            MySharingDelegate.prototype.sharerDidFailWithError = function (sharer, error) {

                debug("###### FACEBOOK DIALOG ERROR: " + e)
                if(params && params.error)
                    params.error(e)

            };

            MySharingDelegate.prototype.sharerDidCancel = function (sharer) {

                debug("###### FACEBOOK DIALOG CANCEL")
                if(params && params.cancel)
                    params.cancel()

            };

            MySharingDelegate.ObjCProtocols = [FBSDKSharingDelegate];

            return MySharingDelegate;

        }(UIResponder));

        return new MySharingDelegate()
    }
    
    Facebook.invite = function(args) {
        
        var content = FBSDKAppInviteContent.alloc().init();
        content.appLinkURL = NSURL.URLWithString(NSString.stringWithString(args.appLinkUrl));

        content.appInvitePreviewImageURL = NSURL.URLWithString(NSString.stringWithString(args.previewImageUrl));

        var view = application.ios.rootController;

        var mydelegate = this.createInviteDelegate();

        FBSDKAppInviteDialog.showFromViewControllerWithContentDelegate(view, content, mydelegate);

    };

    Facebook.canInvite = function(){
        return FBSDKAppInviteDialog.canShow()       
    }    

    Facebook.createInviteDelegate = function() {
        var self = this
        var MyInviteDelegate = UIResponder.extend({
          appInviteDialogDidCompleteWithResults: function(appInviteDialog, results) {
            console.log("## delegate sharerDidCompleteWithResults");
          },
          appInviteDialogDidFailWithError: function(appInviteDialog, error) {
            console.log("## delegate sharerDidFailWithError " + error);

            if (self._failCallback)
                self._failCallback(error)
          }
        }, {
          name: "MyInviteDelegate",
          protocols: [FBSDKAppInviteDialogDelegate]
        });
        return new MyInviteDelegate();
    };
    
    return Facebook

}

function openURL(url) {
  if(typeof UIApplication.sharedApplication === 'function'){
      UIApplication.sharedApplication().openURL(url)
  } else {
    UIApplication.sharedApplication.openURL(url)
  }
}

function canOpenURL(url) {
  if(typeof UIApplication.sharedApplication === 'function'){
      return UIApplication.sharedApplication().canOpenURL(url)
  } else {
    return UIApplication.sharedApplication.canOpenURL(url)
  }
}

function toJson(entity){

  var json = {}

  for(var i = 0; i <  entity.allKeys.count; i++){
    var key = entity.allKeys.objectAtIndex(i)
    var value = entity.objectForKey(key)

    if(value.allKeys)
      json[key] = toJson(value)
    else if(value.count != undefined)
      json[key] = toJsonrray(value)
    else if(value)
      json[key] = value
  }

  return json
}

function toJsonrray(items){

    var array = []

    for(var j = 0; j < items.count; j++){
        var entity = items.objectAtIndex(j)
        var json = toJson(entity)
        array.push(json)
    }

    return array
}

exports.Facebook = Facebook
