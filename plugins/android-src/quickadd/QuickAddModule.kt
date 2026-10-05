package com.tabsy.app.quickadd

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class QuickAddModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "QuickAddModule"

    @ReactMethod
    fun startQuickAddService(promise: Promise) {
        try {
            QuickAddService.startService(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopQuickAddService(promise: Promise) {
        try {
            QuickAddService.stopService(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(QuickAddService.isRunning)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(reactContext)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(false)
                return
            }
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun hasNotificationPermission(promise: Promise) {
        val granted = NotificationManagerCompat.from(reactContext).areNotificationsEnabled()
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openOverlay(mode: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, QuickAddOverlayActivity::class.java).apply {
                putExtra("mode", mode)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_OVERLAY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateOverlayState(amount: String, category: String) {
        val intent = Intent("com.tabsy.app.quickadd.UPDATE_STATE").apply {
            putExtra("amount", amount)
            putExtra("category", category)
        }
        reactContext.sendBroadcast(intent)
    }

    @ReactMethod
    fun syncAuthSession(token: String, apiUrl: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit()
                .putString("auth_token", token)
                .putString("api_url", apiUrl)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SYNC_AUTH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearAuthSession(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit()
                .remove("auth_token")
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_AUTH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getPendingExpenses(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            val pendingJson = prefs.getString("pending_expenses", "[]") ?: "[]"
            promise.resolve(pendingJson)
        } catch (e: Exception) {
            promise.reject("GET_PENDING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearPendingExpenses(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().remove("pending_expenses").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLEAR_PENDING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun syncTheme(themeJson: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().putString("theme_config", themeJson).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SYNC_THEME_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun syncCategories(categoriesJson: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(QuickAddService.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            prefs.edit().putString("user_categories", categoriesJson).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SYNC_CATEGORIES_ERROR", e.message, e)
        }
    }
}

