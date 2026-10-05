package com.tabsy.app.quickadd

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class QuickAddService : Service() {

    companion object {
        const val CHANNEL_ID = "tabsy_quick_add_channel"
        const val NOTIFICATION_ID = 9021
        const val ACTION_START = "com.tabsy.app.quickadd.ACTION_START"
        const val ACTION_STOP = "com.tabsy.app.quickadd.ACTION_STOP"
        const val PREFS_NAME = "tabsy_quick_add_prefs"
        const val KEY_SERVICE_ENABLED = "service_enabled"

        @Volatile
        var isRunning: Boolean = false
            private set

        fun startService(context: Context) {
            val intent = Intent(context, QuickAddService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, QuickAddService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_STOP) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        startForegroundNotification()
        isRunning = true
        setServicePersisted(true)
        return START_STICKY
    }

    private fun startForegroundNotification() {
        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ requires FOREGROUND_SERVICE_SPECIAL_USE permission (declared in manifest)
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            // Android 13 and below: no foreground service type needed
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun stopForegroundService() {
        isRunning = false
        setServicePersisted(false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun buildNotification(): Notification {
        // Voice action pending intent - route through our invisible Activity
        val voiceIntent = Intent(this, QuickAddOverlayActivity::class.java).apply {
            putExtra("mode", "voice")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val voicePendingIntent = PendingIntent.getActivity(
            this,
            101,
            voiceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Type action pending intent
        val typeIntent = Intent(this, QuickAddOverlayActivity::class.java).apply {
            putExtra("mode", "text")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val typePendingIntent = PendingIntent.getActivity(
            this,
            102,
            typeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Stop action pending intent
        val stopIntent = Intent(this, QuickAddService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            103,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Main content tap intent
        val contentIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tabsy://quick-add")).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            this,
            100,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val iconRes = resources.getIdentifier("ic_notification", "drawable", packageName).takeIf { it != 0 }
            ?: android.R.drawable.ic_input_add
            
        val micIcon = resources.getIdentifier("ic_mic", "drawable", packageName).takeIf { it != 0 } ?: 0
        val kbIcon = resources.getIdentifier("ic_keyboard", "drawable", packageName).takeIf { it != 0 } ?: 0
        val closeIcon = resources.getIdentifier("ic_close", "drawable", packageName).takeIf { it != 0 } ?: 0

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle("Tabsy Quick Add")
            .setContentText("Tap 🎤 to speak or ⌨️ to type an expense")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setColor(android.graphics.Color.parseColor("#3C6E47"))
            .setContentIntent(contentPendingIntent)
            .addAction(micIcon, "Voice", voicePendingIntent)
            .addAction(kbIcon, "Type", typePendingIntent)
            .addAction(closeIcon, "Stop", stopPendingIntent)
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("Tap 🎤 to speak or ⌨️ to type an expense"))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Tabsy Quick Add",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent notification for quick voice and text expense entry"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun setServicePersisted(enabled: Boolean) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_SERVICE_ENABLED, enabled).apply()
    }

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }
}
