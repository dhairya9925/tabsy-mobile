package com.tabsy.app.quickadd

import android.Manifest
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.app.Activity
import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
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
import java.util.Calendar
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
 * - Dynamically inherits active Tabsy palette / dark mode theme (e.g. Sprout Night)
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
        val expenseDate: String,
        val expenseType: String = "personal",
        val groupId: String? = null,
        val groupName: String? = null,
        val friendId: String? = null,
        val friendName: String? = null,
        val paidBy: String = "self",
        val splitType: String = "equal"
    )

    data class ThemeColors(
        val isDark: Boolean,
        val cardBg: String,
        val innerCardBg: String,
        val line: String,
        val text: String,
        val muted: String,
        val accent: String,
        val onAccent: String,
        val accentSoft: String
    )

    private var themeColors = ThemeColors(
        isDark = false,
        cardBg = "#FFFFFF",
        innerCardBg = "#F8FAFC",
        line = "#E2E8F0",
        text = "#0F172A",
        muted = "#64748B",
        accent = "#2E6930",
        onAccent = "#FFFFFF",
        accentSoft = "#EBF5EC"
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
    private lateinit var tvTypeBadge: TextView
    private lateinit var btnEditToggle: TextView
    private lateinit var tvCurrencySymbol: TextView
    private lateinit var etParsedAmount: EditText
    private lateinit var tvParsedCategory: TextView
    private lateinit var targetRow: LinearLayout
    private lateinit var tvTypeLabel: TextView
    private lateinit var tvExpenseTarget: TextView
    private lateinit var paidByRow: LinearLayout
    private lateinit var tvPaidByLabel: TextView
    private lateinit var tvPaidByTarget: TextView
    private var currentPaidBy: String = "self"
    private lateinit var etParsedNote: EditText
    private lateinit var etParsedDate: EditText
    private lateinit var btnCancel: Button
    private lateinit var btnConfirm: Button
    private lateinit var tvSuccessBanner: TextView
    private var isEditMode = false

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
            applyTheme()
            setupClickListeners()

            val requestedMode = intent?.getStringExtra("mode") ?: "voice"
            switchMode(requestedMode)
        } catch (e: Exception) {
            Log.e(TAG, "Fatal error initializing QuickAddOverlayActivity", e)
            finish()
        }
    }

    private fun dpToPx(dp: Float): Float {
        return dp * resources.displayMetrics.density
    }

    private fun createPillDrawable(
        bgColor: Int,
        strokeColor: Int? = null,
        strokeWidthDp: Float = 0f,
        cornerRadiusDp: Float = 16f
    ): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(cornerRadiusDp)
            setColor(bgColor)
            if (strokeColor != null && strokeWidthDp > 0f) {
                setStroke(dpToPx(strokeWidthDp).toInt(), strokeColor)
            }
        }
    }

    private fun applyTheme() {
        try {
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val themeJsonStr = prefs.getString("theme_config", null)

            var isDark = false
            var cardBg = "#FFFFFF"
            var innerCardBg = "#F8FAFC"
            var line = "#E2E8F0"
            var text = "#0F172A"
            var muted = "#64748B"
            var accent = "#2E6930"
            var onAccent = "#FFFFFF"
            var accentSoft = "#EBF5EC"

            if (!themeJsonStr.isNullOrEmpty()) {
                val themeObj = JSONObject(themeJsonStr)
                isDark = themeObj.optBoolean("isDark", false)
                cardBg = themeObj.optString("cardBg", if (isDark) "#15241D" else "#FFFFFF")
                innerCardBg = themeObj.optString("innerCardBg", if (isDark) "#1D2E25" else "#F8FAFC")
                line = themeObj.optString("line", if (isDark) "#24382D" else "#E2E8F0")
                text = themeObj.optString("text", if (isDark) "#F0F6F2" else "#0F172A")
                muted = themeObj.optString("muted", if (isDark) "#8AA194" else "#64748B")
                accent = themeObj.optString("accent", if (isDark) "#86C49A" else "#2E6930")
                onAccent = themeObj.optString("onAccent", if (isDark) "#0E1813" else "#FFFFFF")
                accentSoft = themeObj.optString("accentSoft", if (isDark) "#1D3B2E" else "#EBF5EC")
            } else {
                val nightModeFlags = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
                if (nightModeFlags == Configuration.UI_MODE_NIGHT_YES) {
                    isDark = true
                    cardBg = "#15241D"
                    innerCardBg = "#1D2E25"
                    line = "#24382D"
                    text = "#F0F6F2"
                    muted = "#8AA194"
                    accent = "#86C49A"
                    onAccent = "#0E1813"
                    accentSoft = "#1D3B2E"
                }
            }

            themeColors = ThemeColors(
                isDark = isDark,
                cardBg = cardBg,
                innerCardBg = innerCardBg,
                line = line,
                text = text,
                muted = muted,
                accent = accent,
                onAccent = onAccent,
                accentSoft = accentSoft
            )

            // Outer Card
            val cardDrawable = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(20f)
                setColor(Color.parseColor(themeColors.cardBg))
                setStroke(dpToPx(1f).toInt(), Color.parseColor(themeColors.line))
            }
            cardContainer.background = cardDrawable

            // Header elements
            findViewById<TextView>(R.id.tvHeaderTitle)?.setTextColor(Color.parseColor(themeColors.text))
            findViewById<TextView>(R.id.tvHeaderSubtitle)?.setTextColor(Color.parseColor(themeColors.muted))

            val headerIconBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(8f)
                setColor(Color.parseColor(themeColors.accentSoft))
            }
            findViewById<ImageView>(R.id.ivHeaderLogo)?.apply {
                background = headerIconBg
                setColorFilter(Color.parseColor(themeColors.accent))
            }

            val closeBtnBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor(if (themeColors.isDark) themeColors.innerCardBg else "#F1F5F9"))
            }
            btnClose.background = closeBtnBg
            btnClose.setColorFilter(Color.parseColor(themeColors.muted))

            // Update Tab Bar
            updateTabBarTabs(currentMode)

            // Voice Section
            tvTranscript.setTextColor(Color.parseColor(themeColors.text))
            tvVoiceStatus.setTextColor(Color.parseColor(themeColors.muted))
            val micBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor(themeColors.accentSoft))
            }
            btnMic.background = micBg
            btnMic.setColorFilter(Color.parseColor(themeColors.accent))

            // Text Section
            val inputBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(12f)
                setColor(Color.parseColor(themeColors.innerCardBg))
                setStroke(dpToPx(1f).toInt(), Color.parseColor(themeColors.line))
            }
            etExpenseInput.background = inputBg
            etExpenseInput.setTextColor(Color.parseColor(themeColors.text))
            etExpenseInput.setHintTextColor(Color.parseColor(themeColors.muted))

            val sendBtnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(12f)
                setColor(Color.parseColor(themeColors.accent))
            }
            btnSendText.background = sendBtnBg
            btnSendText.setTextColor(Color.parseColor(themeColors.onAccent))

            // Progress Section
            tvProgressMessage.setTextColor(Color.parseColor(themeColors.muted))

            // Confirmation Section / Receipt Card
            val receiptCard = findViewById<LinearLayout>(R.id.receiptCardContainer)
            val receiptBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(14f)
                setColor(Color.parseColor(themeColors.innerCardBg))
                setStroke(dpToPx(1.5f).toInt(), Color.parseColor(themeColors.line))
            }
            receiptCard?.background = receiptBg

            findViewById<TextView>(R.id.tvTotalLabel)?.setTextColor(Color.parseColor(themeColors.muted))

            // Micro capsule badge for expense type (e.g. PERSONAL, SPLIT, GRP)
            tvTypeBadge.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.accentSoft),
                strokeColor = Color.parseColor(themeColors.line),
                strokeWidthDp = 0.5f,
                cornerRadiusDp = 10f
            )
            tvTypeBadge.setTextColor(Color.parseColor(themeColors.accent))

            updateEditToggleVisual()

            tvCurrencySymbol.setTextColor(Color.parseColor(themeColors.text))
            etParsedAmount.setTextColor(Color.parseColor(themeColors.text))
            findViewById<View>(R.id.receiptDivider)?.setBackgroundColor(Color.parseColor(themeColors.line))
            
            // Category selector chip
            findViewById<TextView>(R.id.tvCategoryLabel)?.setTextColor(Color.parseColor(themeColors.muted))
            tvParsedCategory.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.innerCardBg),
                strokeColor = Color.parseColor(themeColors.line),
                strokeWidthDp = 1f,
                cornerRadiusDp = 16f
            )
            tvParsedCategory.setTextColor(Color.parseColor(themeColors.text))

            // Type selector chip
            findViewById<TextView>(R.id.tvTypeLabel)?.setTextColor(Color.parseColor(themeColors.muted))
            tvExpenseTarget.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.innerCardBg),
                strokeColor = Color.parseColor(themeColors.line),
                strokeWidthDp = 1f,
                cornerRadiusDp = 16f
            )
            tvExpenseTarget.setTextColor(Color.parseColor(themeColors.text))

            // Paid By selector chip
            tvPaidByLabel.setTextColor(Color.parseColor(themeColors.muted))
            tvPaidByTarget.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.innerCardBg),
                strokeColor = Color.parseColor(themeColors.line),
                strokeWidthDp = 1f,
                cornerRadiusDp = 16f
            )
            tvPaidByTarget.setTextColor(Color.parseColor(themeColors.text))

            findViewById<TextView>(R.id.tvNoteLabel)?.setTextColor(Color.parseColor(themeColors.muted))
            etParsedNote.setTextColor(Color.parseColor(themeColors.text))
            findViewById<TextView>(R.id.tvDateLabel)?.setTextColor(Color.parseColor(themeColors.muted))
            etParsedDate.setTextColor(Color.parseColor(themeColors.muted))

            val cancelBtnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(11f)
                setColor(Color.parseColor(if (themeColors.isDark) themeColors.innerCardBg else "#F1F5F9"))
                setStroke(dpToPx(1f).toInt(), Color.parseColor(themeColors.line))
            }
            btnCancel.background = cancelBtnBg
            btnCancel.setTextColor(Color.parseColor(if (themeColors.isDark) "#CBD5E1" else "#475569"))

            val confirmBtnBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dpToPx(11f)
                setColor(Color.parseColor(themeColors.accent))
            }
            btnConfirm.background = confirmBtnBg
            btnConfirm.setTextColor(Color.parseColor(themeColors.onAccent))

            tvSuccessBanner.setTextColor(Color.parseColor(themeColors.accent))

        } catch (e: Exception) {
            Log.e(TAG, "Error applying theme", e)
        }
    }

    private fun updateTabBarTabs(mode: String) {
        val activeBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(12f)
            setColor(Color.parseColor(themeColors.accentSoft))
            setStroke(dpToPx(1f).toInt(), Color.parseColor(themeColors.accent))
        }
        val inactiveBg = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dpToPx(12f)
            setColor(Color.parseColor(themeColors.innerCardBg))
            setStroke(dpToPx(1f).toInt(), Color.parseColor(themeColors.line))
        }

        if (mode == "voice") {
            btnTabVoice.background = activeBg
            btnTabVoice.setTextColor(Color.parseColor(themeColors.accent))
            btnTabType.background = inactiveBg
            btnTabType.setTextColor(Color.parseColor(themeColors.muted))
        } else {
            btnTabType.background = activeBg
            btnTabType.setTextColor(Color.parseColor(themeColors.accent))
            btnTabVoice.background = inactiveBg
            btnTabVoice.setTextColor(Color.parseColor(themeColors.muted))
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
        tvTypeBadge = findViewById(R.id.tvTypeBadge)
        btnEditToggle = findViewById(R.id.btnEditToggle)
        tvCurrencySymbol = findViewById(R.id.tvCurrencySymbol)
        etParsedAmount = findViewById(R.id.etParsedAmount)
        tvParsedCategory = findViewById(R.id.tvParsedCategory)
        targetRow = findViewById(R.id.targetRow)
        tvTypeLabel = findViewById(R.id.tvTypeLabel)
        tvExpenseTarget = findViewById(R.id.tvExpenseTarget)
        paidByRow = findViewById(R.id.paidByRow)
        tvPaidByLabel = findViewById(R.id.tvPaidByLabel)
        tvPaidByTarget = findViewById(R.id.tvPaidByTarget)
        etParsedNote = findViewById(R.id.etParsedNote)
        etParsedDate = findViewById(R.id.etParsedDate)
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

        btnEditToggle.setOnClickListener {
            toggleEditMode()
        }

        etParsedDate.setOnClickListener {
            if (isEditMode) {
                showDatePickerDialog()
            }
        }

        btnCancel.setOnClickListener {
            hideKeyboard()
            setEditMode(false)
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
                updateTabBarTabs("text")

                etExpenseInput.requestFocus()
                etExpenseInput.postDelayed({
                    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
                    imm?.showSoftInput(etExpenseInput, InputMethodManager.SHOW_IMPLICIT)
                }, 100)
            } else {
                hideKeyboard()
                textSection.visibility = View.GONE
                voiceSection.visibility = View.VISIBLE
                updateTabBarTabs("voice")

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
                        put("conversation_history", JSONArray())
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
                        val rawCat = data.optString("category", "").trim()
                        val cat = if (rawCat.isNotEmpty() && !rawCat.equals("general", ignoreCase = true) && !rawCat.equals("null", ignoreCase = true)) {
                            rawCat.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }
                        } else {
                            val local = parseLocally(userText)
                            if (local.category.isNotEmpty() && !local.category.equals("general", ignoreCase = true)) local.category else "Other"
                        }
                        val note = data.optString("note", userText).ifEmpty { userText }
                        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                        val date = data.optString("expense_date", today).ifEmpty { today }

                        val rawExpenseType = data.optString("expense_type", "personal").trim().lowercase(Locale.ROOT)
                        val expenseType = if (rawExpenseType in listOf("personal", "group", "friend")) rawExpenseType else "personal"

                        fun optCleanString(key: String): String? {
                            if (!data.has(key) || data.isNull(key)) return null
                            val v = data.optString(key, "").trim()
                            return if (v.isEmpty() || v.equals("null", ignoreCase = true)) null else v
                        }

                        val groupId = optCleanString("group_id")
                        val groupName = optCleanString("group_name")
                        val friendId = optCleanString("friend_id")
                        val friendName = optCleanString("friend_name")
                        val paidBy = optCleanString("paid_by") ?: "self"
                        val splitType = optCleanString("split_type") ?: "equal"

                        parsedResult = ParsedExpenseData(
                            amount = amt,
                            category = cat,
                            note = note,
                            expenseDate = date,
                            expenseType = expenseType,
                            groupId = groupId,
                            groupName = groupName,
                            friendId = friendId,
                            friendName = friendName,
                            paidBy = paidBy,
                            splitType = splitType
                        )
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
            lower.contains("other") -> "✨ Other"
            else -> "✨ $cat"
        }
    }

    private fun getUserCategories(): List<String> {
        val defaultList = listOf("Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Other")
        try {
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString("user_categories", null) ?: return defaultList
            val arr = org.json.JSONArray(jsonStr)
            val list = mutableListOf<String>()
            for (i in 0 until arr.length()) {
                val item = arr.optJSONObject(i)
                val name = item?.optString("name") ?: arr.optString(i)
                if (!name.isNullOrBlank() && !list.contains(name)) {
                    list.add(name)
                }
            }
            return if (list.isNotEmpty()) list else defaultList
        } catch (e: Exception) {
            return defaultList
        }
    }

    private fun showCategorySelectionDialog() {
        val categories = getUserCategories()
        val items = categories.toTypedArray()
        android.app.AlertDialog.Builder(this)
            .setTitle("Change Category")
            .setItems(items) { _, which ->
                val chosen = items[which]
                pendingExpense = pendingExpense?.copy(category = chosen)
                tvParsedCategory.text = "${formatCategoryWithEmoji(chosen)}  ▾"
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showTypeSelectionDialog() {
        val options = mutableListOf<Triple<String, String, ParsedExpenseData>>()
        val current = pendingExpense ?: return

        // 1. Personal
        options.add(
            Triple(
                "👤 Personal",
                "personal",
                current.copy(
                    expenseType = "personal",
                    groupId = null,
                    groupName = null,
                    friendId = null,
                    friendName = null
                )
            )
        )

        // 2. Groups
        try {
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val groupsJson = prefs.getString("user_groups", null)
            if (!groupsJson.isNullOrEmpty()) {
                val groupsArr = JSONArray(groupsJson)
                for (i in 0 until groupsArr.length()) {
                    val g = groupsArr.getJSONObject(i)
                    val gName = g.optString("name", "").trim()
                    val gId = g.optString("id", "").ifEmpty { null }
                    if (gName.isNotEmpty() && gId != null) {
                        options.add(
                            Triple(
                                "👥 Grp • $gName",
                                "group",
                                current.copy(
                                    expenseType = "group",
                                    groupId = gId,
                                    groupName = gName,
                                    friendId = null,
                                    friendName = null
                                )
                            )
                        )
                    }
                }
            }

            // 3. Friends / Splits
            val friendsJson = prefs.getString("user_friends", null)
            if (!friendsJson.isNullOrEmpty()) {
                val friendsArr = JSONArray(friendsJson)
                for (i in 0 until friendsArr.length()) {
                    val f = friendsArr.getJSONObject(i)
                    val fName = f.optString("display_name", "").trim()
                    val fId = f.optString("friend_id", "").ifEmpty { null }
                    if (fName.isNotEmpty() && fId != null) {
                        options.add(
                            Triple(
                                "🤝 Split • $fName",
                                "friend",
                                current.copy(
                                    expenseType = "friend",
                                    groupId = null,
                                    groupName = null,
                                    friendId = fId,
                                    friendName = fName,
                                    paidBy = "self",
                                    splitType = "equal"
                                )
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error building type selection dialog", e)
        }

        val displayItems = options.map { it.first }.toTypedArray()
        android.app.AlertDialog.Builder(this)
            .setTitle("Expense Type")
            .setItems(displayItems) { _, which ->
                val selected = options[which].third
                currentPaidBy = "self"
                pendingExpense = selected.copy(paidBy = "self")
                showConfirmation(pendingExpense!!)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showPaidBySelectionDialog(expense: ParsedExpenseData) {
        val options = mutableListOf<Pair<String, String>>()
        options.add(Pair("👤 You (I paid)", "self"))

        if (expense.expenseType.equals("friend", ignoreCase = true)) {
            val fName = expense.friendName?.ifEmpty { null } ?: "Friend"
            options.add(Pair("🤝 $fName paid", "friend"))
        } else if (expense.expenseType.equals("group", ignoreCase = true)) {
            try {
                val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
                val membersKey = "group_members_${expense.groupId}"
                val membersJson = prefs.getString(membersKey, null)
                if (!membersJson.isNullOrEmpty()) {
                    val arr = JSONArray(membersJson)
                    for (i in 0 until arr.length()) {
                        val m = arr.getJSONObject(i)
                        val mName = m.optString("name", "").trim()
                        val mId = m.optString("user_id", "").trim()
                        if (mName.isNotEmpty() && mId.isNotEmpty()) {
                            options.add(Pair("👥 $mName paid", mId))
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error fetching cached group members for paid_by", e)
            }
        }

        if (options.size <= 1) {
            Toast.makeText(this, "Paid by You (default)", Toast.LENGTH_SHORT).show()
            return
        }

        val displayItems = options.map { it.first }.toTypedArray()
        android.app.AlertDialog.Builder(this)
            .setTitle("Paid By")
            .setItems(displayItems) { _, which ->
                currentPaidBy = options[which].second
                pendingExpense = pendingExpense?.copy(paidBy = currentPaidBy)
                updatePaidByDisplay(pendingExpense ?: expense)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun updatePaidByDisplay(parsed: ParsedExpenseData) {
        val friendName = parsed.friendName?.ifEmpty { null } ?: parsed.friendId ?: "Friend"

        val displayText = when {
            currentPaidBy == "self" || currentPaidBy.isEmpty() -> "👤 You  ▾"
            currentPaidBy == "friend" -> "🤝 $friendName  ▾"
            else -> {
                var memberName: String? = null
                if (parsed.groupId != null) {
                    try {
                        val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
                        val membersJson = prefs.getString("group_members_${parsed.groupId}", null)
                        if (!membersJson.isNullOrEmpty()) {
                            val arr = JSONArray(membersJson)
                            for (i in 0 until arr.length()) {
                                val m = arr.getJSONObject(i)
                                if (m.optString("user_id", "") == currentPaidBy) {
                                    memberName = m.optString("name", "").trim()
                                    break
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }
                "👥 ${memberName ?: currentPaidBy}  ▾"
            }
        }
        tvPaidByTarget.text = displayText

        val isSelf = currentPaidBy == "self" || currentPaidBy.isEmpty()
        val pillBg = if (isSelf) {
            Color.parseColor(themeColors.innerCardBg)
        } else {
            Color.parseColor(themeColors.accentSoft)
        }
        val strokeColor = if (isSelf) {
            Color.parseColor(themeColors.line)
        } else {
            Color.parseColor(themeColors.accent)
        }
        tvPaidByTarget.background = createPillDrawable(
            bgColor = pillBg,
            strokeColor = strokeColor,
            strokeWidthDp = 1f,
            cornerRadiusDp = 16f
        )
        tvPaidByTarget.setTextColor(if (isSelf) Color.parseColor(themeColors.text) else Color.parseColor(themeColors.accent))
    }

    private fun parseLocally(text: String): ParsedExpenseData {
        val lower = text.lowercase(Locale.ROOT)

        var amount = 0.0
        val amountMatcher = Pattern.compile("(?:₹|rs\\.?|inr)?\\s*(\\d+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE).matcher(text)
        if (amountMatcher.find()) {
            amount = amountMatcher.group(1)?.toDoubleOrNull() ?: 0.0
        }

        val category = when {
            lower.contains("sabji") || lower.contains("sabzi") || lower.contains("vegetable") || lower.contains("milk") || lower.contains("fruit") || lower.contains("supermarket") || lower.contains("grocer") || lower.contains("kirana") -> "Food & Dining"
            lower.contains("food") || lower.contains("lunch") || lower.contains("dinner") || lower.contains("breakfast") || lower.contains("chai") || lower.contains("coffee") || lower.contains("burger") || lower.contains("pizza") || lower.contains("restaurant") || lower.contains("cafe") || lower.contains("chaas") || lower.contains("lassi") || lower.contains("tea") || lower.contains("drink") || lower.contains("snack") || lower.contains("biryani") || lower.contains("dosa") || lower.contains("roti") || lower.contains("thali") || lower.contains("juice") || lower.contains("swiggy") || lower.contains("zomato") || lower.contains("blinkit") || lower.contains("zepto") || lower.contains("instamart") -> "Food & Dining"
            lower.contains("petrol") || lower.contains("diesel") || lower.contains("fuel") || lower.contains("cab") || lower.contains("uber") || lower.contains("ola") || lower.contains("auto") || lower.contains("metro") || lower.contains("taxi") || lower.contains("bus") || lower.contains("travel") || lower.contains("transit") -> "Transport"
            lower.contains("movie") || lower.contains("cinema") || lower.contains("netflix") || lower.contains("spotify") || lower.contains("game") || lower.contains("entertain") || lower.contains("party") -> "Entertainment"
            lower.contains("cloth") || lower.contains("shirt") || lower.contains("shoes") || lower.contains("amazon") || lower.contains("flipkart") || lower.contains("myntra") || lower.contains("shop") -> "Shopping"
            lower.contains("med") || lower.contains("pharmacy") || lower.contains("doctor") || lower.contains("hospital") || lower.contains("clinic") -> "Health"
            lower.contains("rent") || lower.contains("recharge") || lower.contains("wifi") || lower.contains("bill") || lower.contains("electricity") || lower.contains("water") -> "Bills & Utilities"
            else -> "Other"
        }

        val cleanedNote = text
            .replace(Regex("(?i)^(?:add|spent|paid|log|record|put)\\s+\\d+(?:\\.\\d+)?\\s+(?:to|for|on|in)\\s+"), "")
            .replace(Regex("(?i)^(?:add|spent|paid|log|record|put)\\s+"), "")
            .trim()
            .ifEmpty { text }
            .replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString() }

        var detectedExpenseType = "personal"
        var detectedGroupId: String? = null
        var detectedGroupName: String? = null
        var detectedFriendId: String? = null
        var detectedFriendName: String? = null

        try {
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val groupsJson = prefs.getString("user_groups", null)
            if (!groupsJson.isNullOrEmpty()) {
                val groupsArr = JSONArray(groupsJson)
                for (i in 0 until groupsArr.length()) {
                    val g = groupsArr.getJSONObject(i)
                    val gName = g.optString("name", "").trim()
                    if (gName.isNotEmpty() && lower.contains(gName.lowercase(Locale.ROOT))) {
                        detectedExpenseType = "group"
                        detectedGroupId = g.optString("id", "").ifEmpty { null }
                        detectedGroupName = gName
                        break
                    }
                }
            }

            if (detectedExpenseType == "personal") {
                val friendsJson = prefs.getString("user_friends", null)
                if (!friendsJson.isNullOrEmpty()) {
                    val friendsArr = JSONArray(friendsJson)
                    for (i in 0 until friendsArr.length()) {
                        val f = friendsArr.getJSONObject(i)
                        val fName = f.optString("display_name", "").trim()
                        if (fName.isNotEmpty() && lower.contains(fName.lowercase(Locale.ROOT))) {
                            detectedExpenseType = "friend"
                            detectedFriendId = f.optString("friend_id", "").ifEmpty { null }
                            detectedFriendName = fName
                            break
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking local groups/friends in parseLocally", e)
        }

        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        return ParsedExpenseData(
            amount = amount,
            category = category,
            note = cleanedNote,
            expenseDate = today,
            expenseType = detectedExpenseType,
            groupId = detectedGroupId,
            groupName = detectedGroupName,
            friendId = detectedFriendId,
            friendName = detectedFriendName,
            paidBy = "self",
            splitType = "equal"
        )
    }

    private fun updateEditToggleVisual() {
        if (isEditMode) {
            btnEditToggle.text = "✓ Done"
            btnEditToggle.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.accent),
                strokeColor = Color.parseColor(themeColors.accent),
                strokeWidthDp = 1f,
                cornerRadiusDp = 16f
            )
            btnEditToggle.setTextColor(Color.parseColor(themeColors.onAccent))
        } else {
            btnEditToggle.text = "✎ Edit"
            btnEditToggle.background = createPillDrawable(
                bgColor = Color.parseColor(themeColors.accentSoft),
                strokeColor = Color.parseColor(themeColors.line),
                strokeWidthDp = 1f,
                cornerRadiusDp = 16f
            )
            btnEditToggle.setTextColor(Color.parseColor(themeColors.accent))
        }
    }

    private fun toggleEditMode() {
        setEditMode(!isEditMode)
    }

    private fun setEditMode(enabled: Boolean) {
        isEditMode = enabled
        updateEditToggleVisual()

        etParsedAmount.isEnabled = isEditMode
        etParsedAmount.isFocusable = isEditMode
        etParsedAmount.isFocusableInTouchMode = isEditMode

        etParsedNote.isEnabled = isEditMode
        etParsedNote.isFocusable = isEditMode
        etParsedNote.isFocusableInTouchMode = isEditMode

        etParsedDate.isEnabled = isEditMode

        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        if (isEditMode) {
            etParsedAmount.requestFocus()
            etParsedAmount.setSelection(etParsedAmount.text.length)
            imm?.showSoftInput(etParsedAmount, InputMethodManager.SHOW_IMPLICIT)
        } else {
            currentFocus?.let { view ->
                imm?.hideSoftInputFromWindow(view.windowToken, 0)
            }
            etParsedAmount.clearFocus()
            etParsedNote.clearFocus()
            etParsedDate.clearFocus()
        }
    }

    private fun showDatePickerDialog() {
        val cal = Calendar.getInstance()
        try {
            val currentText = etParsedDate.text.toString().trim()
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            sdf.parse(currentText)?.let {
                cal.time = it
            }
        } catch (_: Exception) {}

        val datePicker = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                val selected = Calendar.getInstance().apply {
                    set(Calendar.YEAR, year)
                    set(Calendar.MONTH, month)
                    set(Calendar.DAY_OF_MONTH, dayOfMonth)
                }
                val formatted = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(selected.time)
                etParsedDate.setText(formatted)
            },
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH),
            cal.get(Calendar.DAY_OF_MONTH)
        )
        datePicker.show()
    }

    private fun showConfirmation(parsed: ParsedExpenseData) {
        pendingExpense = parsed
        currentPaidBy = parsed.paidBy.ifEmpty { "self" }
        progressSection.visibility = View.GONE
        confirmationSection.visibility = View.VISIBLE

        setEditMode(false)

        etParsedAmount.setText(String.format(Locale.US, "%.2f", parsed.amount))
        tvParsedCategory.text = "${formatCategoryWithEmoji(parsed.category)}  ▾"
        tvParsedCategory.setOnClickListener {
            showCategorySelectionDialog()
        }
        etParsedNote.setText(parsed.note)

        val rawDate = if (parsed.expenseDate.isNotEmpty()) {
            parsed.expenseDate
        } else {
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        }
        etParsedDate.setText(rawDate)

        targetRow.visibility = View.VISIBLE
        val typeBadgeText: String
        when (parsed.expenseType.lowercase(Locale.ROOT)) {
            "group" -> {
                typeBadgeText = "GRP"
                tvTypeLabel.text = "Type"
                val groupName = parsed.groupName?.ifEmpty { null } ?: parsed.groupId ?: "Group"
                tvExpenseTarget.text = "👥 Grp • $groupName  ▾"
            }
            "friend" -> {
                typeBadgeText = "SPLIT"
                tvTypeLabel.text = "Type"
                val friendName = parsed.friendName?.ifEmpty { null } ?: parsed.friendId ?: "Friend"
                val splitInfo = if (parsed.splitType.equals("full", ignoreCase = true)) " (Full)" else ""
                tvExpenseTarget.text = "🤝 Split • $friendName$splitInfo  ▾"
            }
            else -> {
                typeBadgeText = "PERSONAL"
                tvTypeLabel.text = "Type"
                tvExpenseTarget.text = "👤 Personal  ▾"
            }
        }
        tvTypeBadge.text = typeBadgeText

        tvExpenseTarget.setOnClickListener {
            showTypeSelectionDialog()
        }
        tvTypeBadge.setOnClickListener {
            showTypeSelectionDialog()
        }

        paidByRow.visibility = View.VISIBLE
        updatePaidByDisplay(parsed)
        tvPaidByTarget.setOnClickListener {
            showPaidBySelectionDialog(pendingExpense ?: parsed)
        }
    }

    private fun saveExpense(expense: ParsedExpenseData) {
        val rawAmtStr = etParsedAmount.text.toString().replace("[₹,]".toRegex(), "").trim()
        val finalAmount = rawAmtStr.toDoubleOrNull() ?: expense.amount
        val finalNote = etParsedNote.text.toString().trim().ifEmpty { expense.note }
        val rawDate = etParsedDate.text.toString().trim()
        val finalDate = when {
            rawDate.isEmpty() || rawDate.equals("Today", ignoreCase = true) -> SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            else -> rawDate
        }
        val finalCat = pendingExpense?.category ?: expense.category

        val finalExpense = expense.copy(
            amount = finalAmount,
            note = finalNote,
            expenseDate = finalDate,
            category = finalCat,
            paidBy = currentPaidBy
        )

        hideKeyboard()
        confirmationSection.visibility = View.GONE
        progressSection.visibility = View.VISIBLE
        tvProgressMessage.text = "Saving expense..."

        executor.execute {
            var savedOnline = false
            val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
            val token = prefs.getString("auth_token", null)
            val rawApiUrl = prefs.getString("api_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"
            val baseUrl = rawApiUrl.trimEnd('/')

            try {
                if (!token.isNullOrEmpty()) {
                    savedOnline = when (finalExpense.expenseType) {
                        "group" -> {
                            if (!finalExpense.groupId.isNullOrEmpty()) {
                                saveGroupExpense(baseUrl, token, finalExpense)
                            } else {
                                savePersonalExpense(baseUrl, token, finalExpense)
                            }
                        }
                        "friend" -> {
                            if (!finalExpense.friendId.isNullOrEmpty()) {
                                val currentUserId = prefs.getString("user_id", "") ?: ""
                                saveFriendExpense(baseUrl, token, currentUserId, finalExpense)
                            } else {
                                savePersonalExpense(baseUrl, token, finalExpense)
                            }
                        }
                        else -> {
                            savePersonalExpense(baseUrl, token, finalExpense)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Online save failed, enqueuing offline", e)
            }

            if (!savedOnline) {
                saveToOfflineQueue(finalExpense)
            }

            mainHandler.post {
                val message = when {
                    savedOnline && finalExpense.expenseType == "group" -> "✅ Added to Group!"
                    savedOnline && finalExpense.expenseType == "friend" -> "✅ Split Recorded!"
                    savedOnline -> "✅ Expense Saved!"
                    else -> "Saved offline ✅"
                }
                showSuccessAndDismiss(message)
            }
        }
    }

    private fun savePersonalExpense(baseUrl: String, token: String, e: ParsedExpenseData): Boolean {
        val url = URL("$baseUrl/api/v1/expenses/personal")
        val payload = JSONObject().apply {
            put("amount", e.amount)
            put("category", e.category.lowercase(Locale.ROOT))
            put("note", e.note)
            put("expense_date", e.expenseDate)
        }
        return doPost(url, token, payload)
    }

    private fun saveGroupExpense(baseUrl: String, token: String, e: ParsedExpenseData): Boolean {
        val splits = JSONArray()
        try {
            val membersUrl = URL("$baseUrl/api/v1/groups/${e.groupId}/members")
            val membersConn = (membersUrl.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 5000
                readTimeout = 5000
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (membersConn.responseCode in 200..299) {
                val resp = membersConn.inputStream.bufferedReader().use { it.readText() }
                val membersJson = JSONArray(resp)
                val count = if (membersJson.length() > 0) membersJson.length() else 1
                val share = Math.round((e.amount / count) * 100.0) / 100.0
                for (i in 0 until membersJson.length()) {
                    val m = membersJson.getJSONObject(i)
                    val uid = m.optString("user_id", "")
                    if (uid.isNotEmpty()) {
                        splits.put(JSONObject().apply {
                            put("user_id", uid)
                            put("amount", share)
                        })
                    }
                }
            }
        } catch (err: Exception) {
            Log.w(TAG, "Failed to fetch group members for splits", err)
        }

        val prefs = getSharedPreferences(QuickAddService.PREFS_NAME, Context.MODE_PRIVATE)
        val currentUserId = prefs.getString("user_id", "") ?: ""
        val payerId = if (e.paidBy.isNotEmpty() && e.paidBy != "self") {
            e.paidBy
        } else {
            currentUserId.ifEmpty { null }
        }

        val payload = JSONObject().apply {
            put("amount", e.amount)
            put("category", e.category.lowercase(Locale.ROOT))
            put("note", e.note)
            put("expense_date", e.expenseDate)
            put("splits", splits)
            if (payerId != null) {
                put("paid_by", payerId)
            }
        }
        return doPost(URL("$baseUrl/api/v1/groups/${e.groupId}/expenses"), token, payload)
    }

    private fun saveFriendExpense(baseUrl: String, token: String, currentUserId: String, e: ParsedExpenseData): Boolean {
        val payerId = if (e.paidBy.equals("friend", ignoreCase = true)) {
            e.friendId ?: currentUserId.ifEmpty { "self" }
        } else if (e.paidBy.isNotEmpty() && e.paidBy != "self") {
            e.paidBy
        } else {
            currentUserId.ifEmpty { "self" }
        }

        val payload = JSONObject().apply {
            put("amount", e.amount)
            put("category", e.category.lowercase(Locale.ROOT))
            put("note", e.note)
            put("expense_date", e.expenseDate)
            put("paid_by", payerId)
            put("split_type", if (e.splitType.equals("full", ignoreCase = true)) "full" else "equal")
        }
        return doPost(URL("$baseUrl/api/v1/friends/${e.friendId}/expenses"), token, payload)
    }

    private fun doPost(url: URL, token: String, payload: JSONObject): Boolean {
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 7000
            readTimeout = 7000
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            doOutput = true
        }
        conn.outputStream.use { os ->
            os.write(payload.toString().toByteArray(Charsets.UTF_8))
        }
        return conn.responseCode in 200..299
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
                put("expense_type", expense.expenseType)
                put("group_id", expense.groupId ?: JSONObject.NULL)
                put("group_name", expense.groupName ?: JSONObject.NULL)
                put("friend_id", expense.friendId ?: JSONObject.NULL)
                put("friend_name", expense.friendName ?: JSONObject.NULL)
                put("paid_by", expense.paidBy)
                put("split_type", expense.splitType)
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
