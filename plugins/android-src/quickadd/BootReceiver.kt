package com.tabsy.app.quickadd

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = context.getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val isEnabled = prefs.getBoolean(QuickAddService.KEY_SERVICE_ENABLED, false)
            if (isEnabled) {
                QuickAddService.startService(context)
            }
        }
    }
}
