
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

application.start({
  moduleName: "main-page"
});
