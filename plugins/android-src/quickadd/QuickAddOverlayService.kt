package com.tabsy.app.quickadd

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class QuickAddOverlayService : Service(), RecognitionListener {

    private lateinit var windowManager: WindowManager
    private lateinit var overlayView: View
    private lateinit var speechRecognizer: SpeechRecognizer
    
    private lateinit var tvTranscript: TextView
    private lateinit var tvStatus: TextView
    private lateinit var pulseRing: View
    private lateinit var actionContainer: View
    
    private var isListening = false

    override fun onBind(intent: Intent?): IBinder? = null

    // --- Broadcast Receiver to get updates from RN ---
    private val rnUpdateReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                "com.tabsy.app.quickadd.UPDATE_STATE" -> {
                    val amount = intent.getStringExtra("amount")
                    val category = intent.getStringExtra("category")
                    
                    if (amount != null) {
                        tvStatus.text = "✅ Parsed: $amount — $category"
                        tvStatus.setTextColor(android.graphics.Color.parseColor("#3C6E47"))
                        actionContainer.visibility = View.VISIBLE
                        pulseRing.visibility = View.INVISIBLE
                        isListening = false
                        if (::speechRecognizer.isInitialized) {
                            speechRecognizer.stopListening()
                        }
                    }
                }
                "com.tabsy.app.quickadd.DISMISS_OVERLAY" -> {
                    stopSelf()
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        
        val filter = android.content.IntentFilter().apply {
            addAction("com.tabsy.app.quickadd.UPDATE_STATE")
            addAction("com.tabsy.app.quickadd.DISMISS_OVERLAY")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(rnUpdateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(rnUpdateReceiver, filter)
        }
        
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        
        val layoutInflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
        val resId = resources.getIdentifier("overlay_quick_add", "layout", packageName)
        if (resId == 0) {
            stopSelf()
            return
        }
        overlayView = layoutInflater.inflate(resId, null)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_DIM_BEHIND or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            dimAmount = 0.65f
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                blurBehindRadius = 25
            }
        }

        windowManager.addView(overlayView, params)
        
        // Setup Views
        tvTranscript = overlayView.findViewById(resources.getIdentifier("tvTranscript", "id", packageName))
        tvStatus = overlayView.findViewById(resources.getIdentifier("tvStatus", "id", packageName))
        pulseRing = overlayView.findViewById(resources.getIdentifier("pulseRing", "id", packageName))
        actionContainer = overlayView.findViewById(resources.getIdentifier("actionContainer", "id", packageName))
        
        val btnClose = overlayView.findViewById<ImageView>(resources.getIdentifier("btnClose", "id", packageName))
        val btnMic = overlayView.findViewById<ImageView>(resources.getIdentifier("btnMic", "id", packageName))
        val btnCancel = overlayView.findViewById<Button>(resources.getIdentifier("btnCancel", "id", packageName))
        val btnConfirm = overlayView.findViewById<Button>(resources.getIdentifier("btnConfirm", "id", packageName))

        btnClose.setOnClickListener { stopSelf() }
        btnCancel.setOnClickListener { stopSelf() }
        
        btnConfirm.setOnClickListener {
            // Confirm button tapped -> notify React Native
            sendEventToReactNative("onOverlayConfirm", Arguments.createMap())
            tvStatus.text = "Saved!"
            tvStatus.setTextColor(android.graphics.Color.parseColor("#3C6E47"))
            overlayView.postDelayed({ stopSelf() }, 1500)
        }
        
        btnMic.setOnClickListener {
            if (isListening) {
                stopListening()
            } else {
                startListening()
            }
        }

        // Initialize Speech Recognizer
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer.setRecognitionListener(this)
        
        // Start immediately
        startListening()
    }

    private fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        speechRecognizer.startListening(intent)
        isListening = true
        tvTranscript.text = "Listening..."
        tvStatus.text = "Speak your expense"
        pulseRing.visibility = View.VISIBLE
        actionContainer.visibility = View.GONE
    }

    private fun stopListening() {
        speechRecognizer.stopListening()
        isListening = false
        pulseRing.visibility = View.INVISIBLE
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(rnUpdateReceiver)
        } catch (e: Exception) {}
        if (::speechRecognizer.isInitialized) {
            speechRecognizer.destroy()
        }
        if (::windowManager.isInitialized && ::overlayView.isInitialized) {
            windowManager.removeView(overlayView)
        }
        sendEventToReactNative("onOverlayDismissed", Arguments.createMap())
    }

    // --- SpeechRecognizer Callbacks ---
    override fun onReadyForSpeech(params: Bundle?) {}
    
    override fun onBeginningOfSpeech() {
        tvTranscript.text = ""
    }
    
    override fun onRmsChanged(rmsdB: Float) {
        // Could animate pulse ring based on RMS
        val scale = 1f + (rmsdB / 10f).coerceIn(0f, 0.5f)
        pulseRing.scaleX = scale
        pulseRing.scaleY = scale
    }
    
    override fun onBufferReceived(buffer: ByteArray?) {}
    
    override fun onEndOfSpeech() {
        stopListening()
        tvStatus.text = "Processing..."
    }
    
    override fun onError(error: Int) {
        isListening = false
        pulseRing.visibility = View.INVISIBLE
        val errorMsg = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No match"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy"
            SpeechRecognizer.ERROR_SERVER -> "Error from server"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
            else -> "Didn't understand, please try again."
        }
        tvStatus.text = errorMsg
        
        // Automatically switch to text input mode if failed?
        // Let's just allow them to tap mic again.
    }
    
    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            val text = matches[0]
            tvTranscript.text = "\"$text\""
            
            // Send text to React Native for processing
            val map = Arguments.createMap().apply {
                putString("text", text)
            }
            sendEventToReactNative("onOverlayVoiceResult", map)
            
            tvStatus.text = "Analyzing..."
        }
    }
    
    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            tvTranscript.text = "\"${matches[0]}\""
        }
    }
    
    override fun onEvent(eventType: Int, params: Bundle?) {}

    // --- Helper to send events to RN ---
    private fun sendEventToReactNative(eventName: String, params: WritableMap) {
        val reactContext = (application as? ReactApplication)
            ?.reactNativeHost
            ?.reactInstanceManager
            ?.currentReactContext
            
        reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(eventName, params)
    }
}
