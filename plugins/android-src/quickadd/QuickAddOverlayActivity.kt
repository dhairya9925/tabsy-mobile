package com.tabsy.app.quickadd

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.tabsy.app.R
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import java.util.regex.Pattern

/**
 * QuickAddOverlayActivity
 *
 * True native translucent floating card overlay over other apps (e.g. WhatsApp, Google Pay).
 * Because this is an Activity (not a background Service), Android grants it full foreground status:
 * - Direct microphone access without SecurityException
 * - Native speech recognition via Android SpeechRecognizer
 * - Immediate keyboard input for typing mode
 * - Communicates with Tabsy backend or saves to offline queue
 * - Calls finish() when done or dismissed, seamlessly returning to whatever app was active
 */
class QuickAddOverlayActivity : Activity() {

    companion object {
        private const val TAG = "QuickAddOverlayActivity"
        private const val REQUEST_RECORD_AUDIO = 2001
    }

    data class ParsedExpenseData(
        val amount: Double,
        val category: String,
        val note: String,
        val expenseDate: String
    )

    private lateinit var rootContainer: FrameLayout
    private lateinit var cardContainer: LinearLayout
    private lateinit var btnClose: ImageView
    private lateinit var tabBar: LinearLayout
    private lateinit var btnTabVoice: TextView
    private lateinit var btnTabType: TextView
    private lateinit var voiceSection: LinearLayout
    private lateinit var pulseRing: View
    private lateinit var btnMic: ImageView
    private lateinit var tvTranscript: TextView
    private lateinit var tvVoiceStatus: TextView
    private lateinit var textSection: LinearLayout
    private lateinit var etExpenseInput: EditText
    private lateinit var btnSendText: Button
    private lateinit var progressSection: LinearLayout
    private lateinit var tvProgressMessage: TextView
    private lateinit var confirmationSection: LinearLayout
    private lateinit var tvParsedAmount: TextView
    private lateinit var tvParsedCategory: TextView
    private lateinit var tvParsedNote: TextView
    private lateinit var tvParsedDate: TextView
    private lateinit var btnCancel: Button
    private lateinit var btnConfirm: Button
    private lateinit var tvSuccessBanner: TextView

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private var pulseAnimator: ObjectAnimator? = null
    private var currentMode: String = "voice"
    private var pendingExpense: ParsedExpenseData? = null

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            // Wake screen / show when locked if user invokes from lockscreen
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            } else {
                @Suppress("DEPRECATION")
                window.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                )
            }

            // Translucent dim configuration
            window.setBackgroundDrawableResource(android.R.color.transparent)
            window.setDimAmount(0.60f)

            setContentView(R.layout.activity_quick_add_overlay)

            initViews()
            setupClickListeners()

            val requestedMode = intent?.getStringExtra("mode") ?: "voice"
            switchMode(requestedMode)
        } catch (e: Exception) {
            Log.e(TAG, "Fatal error initializing QuickAddOverlayActivity", e)
            finish()
        }
    }

    private fun initViews() {
        rootContainer = findViewById(R.id.rootContainer)
        cardContainer = findViewById(R.id.cardContainer)
        btnClose = findViewById(R.id.btnClose)
        tabBar = findViewById(R.id.tabBar)
        btnTabVoice = findViewById(R.id.btnTabVoice)
        btnTabType = findViewById(R.id.btnTabType)
        voiceSection = findViewById(R.id.voiceSection)
        pulseRing = findViewById(R.id.pulseRing)
        btnMic = findViewById(R.id.btnMic)
        tvTranscript = findViewById(R.id.tvTranscript)
        tvVoiceStatus = findViewById(R.id.tvVoiceStatus)
        textSection = findViewById(R.id.textSection)
        etExpenseInput = findViewById(R.id.etExpenseInput)
        btnSendText = findViewById(R.id.btnSendText)
        progressSection = findViewById(R.id.progressSection)
        tvProgressMessage = findViewById(R.id.tvProgressMessage)
        confirmationSection = findViewById(R.id.confirmationSection)
        tvParsedAmount = findViewById(R.id.tvParsedAmount)
        tvParsedCategory = findViewById(R.id.tvParsedCategory)
        tvParsedNote = findViewById(R.id.tvParsedNote)
        tvParsedDate = findViewById(R.id.tvParsedDate)
        btnCancel = findViewById(R.id.btnCancel)
        btnConfirm = findViewById(R.id.btnConfirm)
        tvSuccessBanner = findViewById(R.id.tvSuccessBanner)
    }

    private fun setupClickListeners() {
        // Tapping background outside the card dismisses overlay
        rootContainer.setOnClickListener {
            finish()
        }

        // Tapping the card itself does not dismiss
        cardContainer.setOnClickListener {
            // Consume click
        }

        btnClose.setOnClickListener {
            finish()
        }

        btnTabVoice.setOnClickListener {
            if (currentMode != "voice") {
                switchMode("voice")
            }
        }

        btnTabType.setOnClickListener {
            if (currentMode != "text") {
                switchMode("text")
            }
        }

        btnMic.setOnClickListener {
            if (isListening) {
                stopVoiceRecognition()
                tvVoiceStatus.text = "Listening stopped. Tap mic to speak again."
            } else {
                startVoiceRecognition()
            }
        }

        btnSendText.setOnClickListener {
            submitTextInput()
        }

        etExpenseInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND || actionId == EditorInfo.IME_ACTION_DONE) {
                submitTextInput()
                true
            } else {
                false
            }
        }

        btnCancel.setOnClickListener {
            confirmationSection.visibility = View.GONE
            tabBar.visibility = View.VISIBLE
            switchMode(currentMode)
        }

        btnConfirm.setOnClickListener {
            pendingExpense?.let { expense ->
                saveExpense(expense)
            }
        }
    }

    private fun switchMode(mode: String) {
        currentMode = mode
        try {
            if (mode == "text") {
                stopVoiceRecognition()
                voiceSection.visibility = View.GONE
                textSection.visibility = View.VISIBLE
                btnTabVoice.setBackgroundResource(R.drawable.tab_inactive_bg)
                btnTabVoice.setTextColor(Color.parseColor("#6B7280"))
                btnTabType.setBackgroundResource(R.drawable.tab_active_bg)
                btnTabType.setTextColor(Color.parseColor("#3C6E47"))

                etExpenseInput.requestFocus()
                etExpenseInput.postDelayed({
                    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
                    imm?.showSoftInput(etExpenseInput, InputMethodManager.SHOW_IMPLICIT)
                }, 100)
            } else {
                hideKeyboard()
                textSection.visibility = View.GONE
                voiceSection.visibility = View.VISIBLE
                btnTabType.setBackgroundResource(R.drawable.tab_inactive_bg)
                btnTabType.setTextColor(Color.parseColor("#6B7280"))
                btnTabVoice.setBackgroundResource(R.drawable.tab_active_bg)
                btnTabVoice.setTextColor(Color.parseColor("#3C6E47"))

                startVoiceRecognition()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error switching mode to $mode", e)
        }
    }

    private fun hideKeyboard() {
        try {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            currentFocus?.let { view ->
                imm?.hideSoftInputFromWindow(view.windowToken, 0)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error hiding keyboard", e)
        }
    }

    private fun submitTextInput() {
        val text = etExpenseInput.text?.toString()?.trim() ?: ""
        if (text.isNotEmpty()) {
            parseExpenseWithAI(text)
        } else {
            Toast.makeText(this, "Please enter an expense note or amount", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startPulseAnimation() {
        try {
            stopPulseAnimation()
            pulseRing.visibility = View.VISIBLE
            pulseRing.scaleX = 1.0f
            pulseRing.scaleY = 1.0f
            pulseRing.alpha = 0.8f

            val scaleX = PropertyValuesHolder.ofFloat(View.SCALE_X, 1.0f, 1.35f)
            val scaleY = PropertyValuesHolder.ofFloat(View.SCALE_Y, 1.0f, 1.35f)
            val alpha = PropertyValuesHolder.ofFloat(View.ALPHA, 0.8f, 0.0f)

            pulseAnimator = ObjectAnimator.ofPropertyValuesHolder(pulseRing, scaleX, scaleY, alpha).apply {
                duration = 1000
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.RESTART
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting pulse animation", e)
        }
    }

    private fun stopPulseAnimation() {
        try {
            pulseAnimator?.cancel()
            pulseAnimator = null
            pulseRing.visibility = View.INVISIBLE
            pulseRing.scaleX = 1.0f
            pulseRing.scaleY = 1.0f
            pulseRing.alpha = 0.0f
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping pulse animation", e)
        }
    }

    private fun startVoiceRecognition() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                REQUEST_RECORD_AUDIO
            )
            return
        }

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            tvVoiceStatus.text = "Voice recognition not available"
            Toast.makeText(this, "Speech recognition unavailable. Switched to type mode.", Toast.LENGTH_SHORT).show()
            switchMode("text")
            return
        }

        try {
            stopVoiceRecognition()

            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        isListening = true
                        tvTranscript.text = "Listening..."
                        tvVoiceStatus.text = "Speak your expense (e.g. Spent 250 on lunch)"
                        startPulseAnimation()
                    }

                    override fun onBeginningOfSpeech() {
                        tvVoiceStatus.text = "Hearing you..."
                    }

                    override fun onRmsChanged(rmsdB: Float) {}

                    override fun onBufferReceived(buffer: ByteArray?) {}

                    override fun onEndOfSpeech() {
                        isListening = false
                        stopPulseAnimation()
                        tvVoiceStatus.text = "Processing speech..."
                    }

                    override fun onError(error: Int) {
                        isListening = false
                        stopPulseAnimation()
                        val (title, hint) = when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH ->
                                "Didn't catch that" to "Tap mic to try again or switch to Type mode"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                                "No speech detected" to "Tap mic to speak or type below"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                                "Microphone permission required" to "Please allow mic access or type below"
                            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                                "Network issue" to "Tap mic to retry or type below"
                            else ->
                                "Tap mic to speak" to "Tap mic to retry or type below"
                        }
                        tvTranscript.text = title
                        tvVoiceStatus.text = hint
                    }

                    override fun onResults(results: Bundle?) {
                        isListening = false
                        stopPulseAnimation()
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val spokenText = matches?.firstOrNull()?.trim()
                        if (!spokenText.isNullOrEmpty()) {
                            tvTranscript.text = "\"$spokenText\""
                            tvVoiceStatus.text = "Processing..."
                            parseExpenseWithAI(spokenText)
                        } else {
                            tvTranscript.text = "Didn't catch that"
                            tvVoiceStatus.text = "Tap mic to retry or type below"
                        }
                    }

                    override fun onPartialResults(partialResults: Bundle?) {
                        val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                        if (!partial.isNullOrEmpty()) {
                            tvTranscript.text = "\"$partial\""
                        }
                    }

                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }

            val recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
            }

            speechRecognizer?.startListening(recognizerIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting voice recognition", e)
            isListening = false
            stopPulseAnimation()
            tvVoiceStatus.text = "Error starting mic. Tap mic to retry."
        }
    }

    private fun stopVoiceRecognition() {
        try {
            if (isListening) {
                speechRecognizer?.stopListening()
            }
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
            speechRecognizer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping speech recognition", e)
        } finally {
            isListening = false
            stopPulseAnimation()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_RECORD_AUDIO) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startVoiceRecognition()
            } else {
                Toast.makeText(this, "Microphone permission denied. Switched to type mode.", Toast.LENGTH_SHORT).show()
                switchMode("text")
            }
        }
    }

    private fun parseExpenseWithAI(userText: String) {
        hideKeyboard()
        voiceSection.visibility = View.GONE
        textSection.visibility = View.GONE
        tabBar.visibility = View.GONE
        confirmationSection.visibility = View.GONE
        tvSuccessBanner.visibility = View.GONE
        progressSection.visibility = View.VISIBLE
        tvProgressMessage.text = "Analyzing expense with AI..."

        executor.execute {
            try {
                val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
                val token = prefs.getString("auth_token", null)
                val rawApiUrl = prefs.getString("api_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"
                val baseUrl = rawApiUrl.trimEnd('/')

                var parsedResult: ParsedExpenseData? = null

                try {
                    val url = URL("$baseUrl/api/v1/ai/parse-expense")
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = 7000
                        readTimeout = 7000
                        setRequestProperty("Content-Type", "application/json")
                        if (!token.isNullOrEmpty()) {
                            setRequestProperty("Authorization", "Bearer $token")
                        }
                        doOutput = true
                    }

                    val payload = JSONObject().apply {
                        put("text", userText)
                    }

                    conn.outputStream.use { os ->
                        os.write(payload.toString().toByteArray(Charsets.UTF_8))
                    }

                    val code = conn.responseCode
                    if (code in 200..299) {
                        val resp = conn.inputStream.bufferedReader().use { it.readText() }
                        val json = JSONObject(resp)
                        val data = if (json.has("data")) json.getJSONObject("data") else json
                        val amt = if (data.has("amount") && !data.isNull("amount")) data.getDouble("amount") else parseLocally(userText).amount
                        val cat = data.optString("category", "General").replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }
                        val note = data.optString("note", userText).ifEmpty { userText }
                        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                        val date = data.optString("expense_date", today).ifEmpty { today }
                        parsedResult = ParsedExpenseData(amt, cat, note, date)
                    }
                } catch (netErr: Exception) {
                    Log.w(TAG, "Network parse failed, using local parser", netErr)
                }

                val finalParsed = parsedResult ?: parseLocally(userText)

                mainHandler.post {
                    showConfirmation(finalParsed)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in parseExpenseWithAI", e)
                val fallback = parseLocally(userText)
                mainHandler.post {
                    showConfirmation(fallback)
                }
            }
        }
    }

    private fun formatCategoryWithEmoji(cat: String): String {
        val lower = cat.lowercase(Locale.ROOT)
        return when {
            lower.contains("grocer") -> "🛒 Groceries"
            lower.contains("food") || lower.contains("din") || lower.contains("drink") || lower.contains("beverage") -> "🍵 Food & Dining"
            lower.contains("transport") || lower.contains("travel") || lower.contains("petrol") || lower.contains("fuel") -> "🚗 Transport"
            lower.contains("entertain") || lower.contains("movie") -> "🎬 Entertainment"
            lower.contains("shop") || lower.contains("cloth") -> "🛍️ Shopping"
            lower.contains("health") || lower.contains("med") -> "💊 Health"
            lower.contains("bill") || lower.contains("util") || lower.contains("rent") -> "⚡ Bills"
            else -> "✨ $cat"
        }
    }

    private fun parseLocally(text: String): ParsedExpenseData {
        val lower = text.lowercase(Locale.ROOT)

        var amount = 0.0
        val amountMatcher = Pattern.compile("(?:₹|rs\\.?|inr)?\\s*(\\d+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE).matcher(text)
        if (amountMatcher.find()) {
            amount = amountMatcher.group(1)?.toDoubleOrNull() ?: 0.0
        }

        val category = when {
            lower.contains("grocer") || lower.contains("vegetable") || lower.contains("milk") || lower.contains("fruit") || lower.contains("supermarket") -> "Groceries"
            lower.contains("food") || lower.contains("lunch") || lower.contains("dinner") || lower.contains("breakfast") || lower.contains("chai") || lower.contains("coffee") || lower.contains("burger") || lower.contains("pizza") || lower.contains("restaurant") || lower.contains("cafe") || lower.contains("chaas") || lower.contains("lassi") || lower.contains("tea") || lower.contains("drink") || lower.contains("snack") || lower.contains("biryani") || lower.contains("dosa") || lower.contains("roti") || lower.contains("thali") || lower.contains("juice") -> "Food & Dining"
            lower.contains("petrol") || lower.contains("diesel") || lower.contains("fuel") || lower.contains("cab") || lower.contains("uber") || lower.contains("ola") || lower.contains("auto") || lower.contains("metro") || lower.contains("taxi") || lower.contains("bus") -> "Transportation"
            lower.contains("movie") || lower.contains("cinema") || lower.contains("netflix") || lower.contains("spotify") || lower.contains("game") -> "Entertainment"
            lower.contains("cloth") || lower.contains("shirt") || lower.contains("shoes") || lower.contains("amazon") || lower.contains("flipkart") || lower.contains("myntra") -> "Shopping"
            lower.contains("med") || lower.contains("pharmacy") || lower.contains("doctor") || lower.contains("hospital") -> "Health"
            lower.contains("rent") || lower.contains("recharge") || lower.contains("wifi") || lower.contains("bill") || lower.contains("electricity") || lower.contains("water") -> "Bills & Utilities"
            else -> "General"
        }

        val cleanedNote = text
            .replace(Regex("(?i)^(?:add|spent|paid|log|record|put)\\s+\\d+(?:\\.\\d+)?\\s+(?:to|for|on|in)\\s+"), "")
            .replace(Regex("(?i)^(?:add|spent|paid|log|record|put)\\s+"), "")
            .trim()
            .ifEmpty { text }
            .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        return ParsedExpenseData(
            amount = amount,
            category = category,
            note = cleanedNote,
            expenseDate = today
        )
    }

    private fun showConfirmation(parsed: ParsedExpenseData) {
        pendingExpense = parsed
        progressSection.visibility = View.GONE
        confirmationSection.visibility = View.VISIBLE

        tvParsedAmount.text = "₹${String.format(Locale.US, "%.2f", parsed.amount)}"
        tvParsedCategory.text = formatCategoryWithEmoji(parsed.category)
        tvParsedNote.text = parsed.note

        val displayDate = try {
            val inputDf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val dateObj = inputDf.parse(parsed.expenseDate)
            val todayStr = inputDf.format(Date())
            if (parsed.expenseDate == todayStr) {
                "Today, " + SimpleDateFormat("d MMM", Locale.US).format(Date())
            } else {
                SimpleDateFormat("EEE, d MMM", Locale.US).format(dateObj ?: Date())
            }
        } catch (e: Exception) {
            "Today"
        }
        tvParsedDate.text = displayDate
    }

    private fun saveExpense(expense: ParsedExpenseData) {
        confirmationSection.visibility = View.GONE
        progressSection.visibility = View.VISIBLE
        tvProgressMessage.text = "Saving expense..."

        executor.execute {
            var savedOnline = false
            try {
                val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
                val token = prefs.getString("auth_token", null)
                val rawApiUrl = prefs.getString("api_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"
                val baseUrl = rawApiUrl.trimEnd('/')

                if (!token.isNullOrEmpty()) {
                    val url = URL("$baseUrl/api/v1/expenses/personal")
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = 7000
                        readTimeout = 7000
                        setRequestProperty("Content-Type", "application/json")
                        setRequestProperty("Authorization", "Bearer $token")
                        doOutput = true
                    }

                    val payload = JSONObject().apply {
                        put("amount", expense.amount)
                        put("category", expense.category.lowercase(Locale.ROOT))
                        put("note", expense.note)
                        put("expense_date", expense.expenseDate)
                    }

                    conn.outputStream.use { os ->
                        os.write(payload.toString().toByteArray(Charsets.UTF_8))
                    }

                    if (conn.responseCode in 200..299) {
                        savedOnline = true
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Online save failed, enqueuing offline", e)
            }

            if (!savedOnline) {
                saveToOfflineQueue(expense)
            }

            mainHandler.post {
                val message = if (savedOnline) "✅ Expense Saved!" else "Saved offline ✅"
                showSuccessAndDismiss(message)
            }
        }
    }

    private fun saveToOfflineQueue(expense: ParsedExpenseData) {
        try {
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getString("pending_expenses", "[]") ?: "[]"
            val array = try { JSONArray(existing) } catch (e: Exception) { JSONArray() }
            val item = JSONObject().apply {
                put("amount", expense.amount)
                put("category", expense.category)
                put("note", expense.note)
                put("expense_date", expense.expenseDate)
                put("created_at", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date()))
            }
            array.put(item)
            prefs.edit().putString("pending_expenses", array.toString()).apply()
            Log.i(TAG, "Expense saved to offline queue, total pending: ${array.length()}")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving to offline queue", e)
        }
    }

    private fun showSuccessAndDismiss(message: String) {
        try {
            progressSection.visibility = View.GONE
            confirmationSection.visibility = View.GONE
            tvSuccessBanner.text = message
            tvSuccessBanner.visibility = View.VISIBLE

            // Subtle haptic feedback
            try {
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(80)
                }
            } catch (ignored: Exception) {}

            mainHandler.postDelayed({
                finish()
            }, 1200)
        } catch (e: Exception) {
            Log.e(TAG, "Error showing success banner", e)
            finish()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (confirmationSection.visibility == View.VISIBLE) {
            confirmationSection.visibility = View.GONE
            tabBar.visibility = View.VISIBLE
            switchMode(currentMode)
        } else {
            super.onBackPressed()
        }
    }

    override fun onPause() {
        super.onPause()
        if (isListening) {
            stopVoiceRecognition()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            stopVoiceRecognition()
            executor.shutdownNow()
            mainHandler.removeCallbacksAndMessages(null)
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy", e)
        }
    }
}
