package co.za.outsec.chatr;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSIONS_REQUEST_CODE = 100;

    private static final String[] REQUIRED_PERMISSIONS = {
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.MODIFY_AUDIO_SETTINGS
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestMediaPermissionsIfNeeded();
        refineSystemBarHeights();
    }

    /**
     * Reads the real status-bar height from Android dimension resources and
     * injects it as a CSS custom property to refine the JS-side default (28px).
     *
     * IMPORTANT: we only override if the measured value is > 0.
     * The JS default (28px) is our safety net — we must never reset it to 0.
     */
    private void refineSystemBarHeights() {
        float density = getResources().getDisplayMetrics().density;
        final int topDp    = Math.round(getStatusBarHeightPx() / density);
        final int bottomDp = Math.round(getNavBarHeightPx()    / density);

        // Guard: only inject values we actually trust
        final String js =
            "(function(){" +
            "  var t=" + topDp + ", b=" + bottomDp + ";" +
            "  if(t>0) document.documentElement.style.setProperty('--status-bar-top',    t+'px');" +
            "  if(b>0) document.documentElement.style.setProperty('--android-bottom', b+'px');" +
            "})();";

        android.webkit.WebView wv = getBridge().getWebView();
        wv.postDelayed(() -> wv.evaluateJavascript(js, null), 600);
        wv.postDelayed(() -> wv.evaluateJavascript(js, null), 1600);
    }

    private int getStatusBarHeightPx() {
        int rid = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (rid > 0) return getResources().getDimensionPixelSize(rid);
        return Math.round(28 * getResources().getDisplayMetrics().density);
    }

    private int getNavBarHeightPx() {
        int rid = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        if (rid > 0) return getResources().getDimensionPixelSize(rid);
        return 0;
    }

    private void requestMediaPermissionsIfNeeded() {
        boolean allGranted = true;
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                break;
            }
        }
        if (!allGranted) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSIONS_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}
