package com.tabsy.app.quickadd

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager

class QuickAddOverlayActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val mode = intent?.getStringExtra("mode") ?: "text"

        if (mode == "voice" && Settings.canDrawOverlays(this)) {
            // Launch Native Overlay Service for Voice
            val serviceIntent = Intent(this, QuickAddOverlayService::class.java)
            startService(serviceIntent)
            finish()
        } else {
            // Fallback: Forward to the main application via deep link
            val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tabsy://quick-add?mode=$mode")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(launchIntent)
            finish()
        }
    }
}
