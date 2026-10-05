package com.tabsy.app.quickadd

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

class QuickAddOverlayActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Wake screen / show when locked so user can quick-add from lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window?.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        val mode = intent?.getStringExtra("mode") ?: "text"

        try {
            // Forward to the main application via deep link to QuickAddModal
            val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tabsy://quick-add?mode=$mode")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(launchIntent)
        } catch (e: Exception) {
            // Safe fallback: Launch main activity with mode extra
            try {
                packageManager?.getLaunchIntentForPackage(packageName)?.let { fallbackIntent ->
                    fallbackIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    fallbackIntent.putExtra("mode", mode)
                    startActivity(fallbackIntent)
                }
            } catch (fallbackError: Exception) {
                // Ignore fallback error
            }
        } finally {
            finish()
        }
    }
}
