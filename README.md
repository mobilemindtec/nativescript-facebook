# nativescript-facebook

## IOS

Change Info.plist - appid is your app app id in facebook apps

```
<key>CFBundleURLTypes</key>
<array>
  <dict>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>fb{appid}</string>
  </array>
  </dict>
</array>
<key>FacebookAppID</key>
<string>{appid}</string>
<key>FacebookDisplayName</key>
<string>App Name</string>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fbapi</string>
  <string>fb-messenger-api</string>
  <string>fbauth2</string>
  <string>fbshareextension</string>
  <string>fbapi20150629</string>çç
</array>
```

app.ios.js

```
var application = require("application");
var MyDelegate = (function (_super) {
    __extends(MyDelegate, _super);
    function MyDelegate() {
        _super.apply(this, arguments);
    }
    MyDelegate.prototype.applicationDidFinishLaunchingWithOptions = function (application, launchOptions) {
        return FBSDKApplicationDelegate.sharedInstance().applicationDidFinishLaunchingWithOptions(application, launchOptions);
    };
    MyDelegate.prototype.applicationOpenURLSourceApplicationAnnotation = function (application, url, sourceApplication, annotation) {
        return FBSDKApplicationDelegate.sharedInstance().applicationOpenURLSourceApplicationAnnotation(application, url, sourceApplication, annotation);
    };
    MyDelegate.prototype.applicationDidBecomeActive = function (application) {
        FBSDKAppEvents.activateApp();
    };
    MyDelegate.prototype.applicationWillTerminate = function (application) {
        //Do something you want here
    };
    MyDelegate.prototype.applicationDidEnterBackground = function (application) {
        //Do something you want here
    };
    MyDelegate.ObjCProtocols = [UIApplicationDelegate];
    return MyDelegate;
}(UIResponder));
application.ios.delegate = MyDelegate;
application.start({ moduleName: "main-page" });
```
## Android

Add AndroidManifest.xml

* add xmlns:tools="http://schemas.android.com/tools" in manifest tag

```  
<activity         
    android:name="com.facebook.FacebookActivity"
    android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
    android:theme="@android:style/Theme.Translucent.NoTitleBar"
    android:label="@string/app_name" />

<meta-data android:name="com.facebook.sdk.ApplicationId" 
  android:value="@string/facebook_app_id"/>
```

strings.xml

```
<string name='facebook_app_id'>{appid}</string>
```

### Using

example in demo folder
```
var Facebook = require("nativescript-facebook").Facebook

var facebookHandler
var facebookApi

var FacebookHandler = function(){

	var permissions = ["public_profile", "email", "user_friends", "user_birthday"]
	var fields = "id,name,email,birthday,gender,cover,picture"
	var userId

	FacebookHandler.init = function(){
		if(!facebookApi){
			facebookApi = new Facebook()
			facebookApi.initSdk()
			facebookApi.registerCallback(this.loginSuccessCallback, this.loginCancelCallback, this.loginFailCallback)
		}
	}

	FacebookHandler.login = function(){	
		facebookApi.logInWithReadPermissions(permissions)
	}

	FacebookHandler.loginSuccessCallback = function(){

		var fields = "id,name,email"

		facebookApi.requestUserProfile({
			fields: fields,
			callback: function(fbUser){

				viewModel.set("message", "Login success: " + JSON.stringify(fbUser))
				userId = fbUser.id
			}
		})

	}
	
	FacebookHandler.onFriends = function () {
		
		facebookApi.requestFriends({
			fields: fields,
			userId: userId,
			callback: function(friends){

				viewModel.set("message", "Friends list: " + JSON.stringify(friends))

			}
		})
	}	

	FacebookHandler.share = function(){
		if(facebookApi.isLoggedIn()){

			Facebook.share({
				content: "Nativescript facebook plugin!",
				url: "http://www.mobilemind.com.br",				
			})
		}else{
			viewModel.set("message", "app is not logged in")
		}
	}

	FacebookHandler.sharePhoto = function(){
		if(facebookApi.isLoggedIn()){

			var documents = fs.knownFolders.currentApp();
			var path = fs.path.join(documents.path, "res/icon.png")

			facebookApi.sharePhoto({
				generalContent: "Nativescript facebook plugin! http://www.mobilemind.com.br",				
				content: "Nativescript",
				imagePath: path
			})
		}else{
			viewModel.set("message", "you not is loggedin")
		}
	}	

	FacebookHandler.loginCancelCallback = function(){
		viewModel.set("message", "action canceled by user")
	}

	FacebookHandler.loginFailCallback = function(error){
		viewModel.set("message",  "error: " + error)
	}


	return FacebookHandler
}

facebookHandler = new FacebookHandler()
facebookHandler.init()
```
