package com.tabsy.app.quickadd

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager

class QuickAddOverlayActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set floating window layout flags
        window?.let { win ->
            win.setGravity(Gravity.CENTER)
            win.setLayout(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT
            )
            win.addFlags(
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            } else {
                @Suppress("DEPRECATION")
                win.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                )
            }
        }

        val mode = intent?.getStringExtra("mode") ?: "text"

        // Forward to the main application via deep link
        val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tabsy://quick-add?mode=$mode")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(launchIntent)
        finish()
    }
}
